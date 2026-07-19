(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./importTypes.js"), require("./headerMapper.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.WorkbookReader = factory(root.KeetaPortal.ImportTypes, root.KeetaPortal.HeaderMapper);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HeaderMapper) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;
  var unique = ImportTypes.unique;

  function readWorkbook(workbook, options) {
    options = options || {};
    var sheetNames = Array.isArray(workbook && workbook.SheetNames) ? workbook.SheetNames.slice() : [];
    var workbookMeta = workbook && workbook.Workbook && Array.isArray(workbook.Workbook.Sheets) ? workbook.Workbook.Sheets : [];
    var summaries = sheetNames.map(function (sheetName, index) {
      var sheet = workbook.Sheets[sheetName];
      return summarizeSheet(sheetName, sheet, workbookMeta[index], options);
    });
    var bestSheet = summaries.slice().sort(function (left, right) {
      return right.detectScore - left.detectScore;
    })[0] || createEmptySheetSummary("");
    return {
      fileName: options.fileName || "",
      extension: options.extension || "",
      sheets: summaries,
      sheetNames: sheetNames,
      allHeaders: unique(summaries.reduce(function (memo, item) {
        return memo.concat(item.headers || []);
      }, [])),
      bestSheetName: bestSheet.name,
      bestHeaders: bestSheet.headers,
      bestRows: bestSheet.rows,
      bestSampleRows: bestSheet.sampleRows,
      bestMapping: bestSheet.mapping,
      totalRowCount: summaries.reduce(function (sum, item) { return sum + item.rowCount; }, 0),
      formulasCount: summaries.reduce(function (sum, item) { return sum + item.formulasCount; }, 0),
      formulaFunctions: unique(summaries.reduce(function (memo, item) {
        return memo.concat(item.formulaFunctions || []);
      }, []))
    };
  }

  function summarizeSheet(name, sheet, workbookSheetMeta, options) {
    if (!sheet) {
      return createEmptySheetSummary(name);
    }
    var matrix = sheetToMatrix(sheet);
    var headerInfo = HeaderMapper.findHeaderRow(matrix, { maxRows: options.maxHeaderRows || 12 });
    var dataset = HeaderMapper.rowsFromMatrix(matrix, headerInfo.headerRowIndex);
    var inventory = inspectSheetCells(sheet);
    return {
      name: name,
      rowCount: dataset.rows.length,
      columnCount: dataset.headers.length,
      headers: dataset.headers,
      headerRowIndex: headerInfo.headerRowIndex,
      sampleRows: dataset.rows.slice(0, options.sampleRowLimit || 20),
      rows: dataset.rows,
      formulasCount: inventory.formulasCount,
      formulaFunctions: inventory.formulaFunctions,
      hidden: !!(workbookSheetMeta && Number(workbookSheetMeta.Hidden) > 0),
      mergedCellsCount: Array.isArray(sheet["!merges"]) ? sheet["!merges"].length : 0,
      conditionalFormattingCount: countConditionalFormatting(sheet),
      dataValidationCount: countDataValidation(sheet),
      mapping: HeaderMapper.mapHeaders(dataset.headers, options.requiredFields),
      detectScore: (headerInfo.mapping.mappedCount * 10) + Math.min(dataset.rows.length, 500) / 10
    };
  }

  function createEmptySheetSummary(name) {
    return {
      name: name,
      rowCount: 0,
      columnCount: 0,
      headers: [],
      headerRowIndex: 0,
      sampleRows: [],
      rows: [],
      formulasCount: 0,
      formulaFunctions: [],
      hidden: false,
      mergedCellsCount: 0,
      conditionalFormattingCount: 0,
      dataValidationCount: 0,
      mapping: HeaderMapper.mapHeaders([]),
      detectScore: 0
    };
  }

  function sheetToMatrix(sheet) {
    var ref = sheet["!ref"];
    if (!ref) {
      return [];
    }
    var range = decodeRange(ref);
    var matrix = [];
    for (var rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      var row = [];
      for (var columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
        row.push(readDisplayValue(sheet[encodeCell(rowIndex, columnIndex)]));
      }
      matrix.push(row);
    }
    return matrix;
  }

  function inspectSheetCells(sheet) {
    var formulasCount = 0;
    var formulaFunctions = [];
    Object.keys(sheet || {}).forEach(function (key) {
      if (!/^[A-Z]+[0-9]+$/i.test(key)) {
        return;
      }
      var cell = sheet[key];
      if (cell && cell.f) {
        formulasCount += 1;
        extractFormulaFunctions(cell.f).forEach(function (fnName) {
          formulaFunctions.push(fnName);
        });
      }
    });
    return {
      formulasCount: formulasCount,
      formulaFunctions: unique(formulaFunctions)
    };
  }

  function extractFormulaFunctions(formula) {
    var result = [];
    String(formula || "").replace(/([A-Z][A-Z0-9._]+)\s*\(/g, function (_match, fnName) {
      result.push(fnName.toUpperCase());
      return _match;
    });
    return result;
  }

  function countConditionalFormatting(sheet) {
    var bag = sheet["!conditionalFormatting"] || sheet["!cf"] || sheet["!conditionalFormats"] || [];
    return Array.isArray(bag) ? bag.length : 0;
  }

  function countDataValidation(sheet) {
    var bag = sheet["!dataValidation"] || sheet["!dataValidations"] || sheet["!validations"] || [];
    return Array.isArray(bag) ? bag.length : 0;
  }

  function readDisplayValue(cell) {
    if (!cell) {
      return "";
    }
    if (cell.w != null && cell.w !== "") {
      return normalizeText(cell.w);
    }
    if (cell.v != null) {
      return normalizeText(cell.v);
    }
    return "";
  }

  function decodeRange(ref) {
    var parts = String(ref || "A1:A1").split(":");
    return {
      s: decodeCell(parts[0]),
      e: decodeCell(parts[1] || parts[0])
    };
  }

  function decodeCell(ref) {
    var match = String(ref || "A1").match(/^([A-Z]+)(\d+)$/i);
    if (!match) {
      return { c: 0, r: 0 };
    }
    return {
      c: decodeColumn(match[1]),
      r: Math.max(0, Number(match[2]) - 1)
    };
  }

  function encodeCell(rowIndex, columnIndex) {
    return encodeColumn(columnIndex) + String(rowIndex + 1);
  }

  function decodeColumn(label) {
    var result = 0;
    String(label || "").toUpperCase().split("").forEach(function (character) {
      result = (result * 26) + (character.charCodeAt(0) - 64);
    });
    return Math.max(0, result - 1);
  }

  function encodeColumn(index) {
    var value = Number(index) + 1;
    var result = "";
    while (value > 0) {
      var remainder = (value - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      value = Math.floor((value - remainder) / 26);
    }
    return result || "A";
  }

  return {
    readWorkbook: readWorkbook,
    summarizeSheet: summarizeSheet
  };
});
