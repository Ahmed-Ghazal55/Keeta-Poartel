(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./importTypes.js"), require("./headerMapper.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.CsvReader = factory(root.KeetaPortal.ImportTypes, root.KeetaPortal.HeaderMapper);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HeaderMapper) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function parseDelimitedMatrix(text) {
    var source = String(text == null ? "" : text);
    var matrix = [];
    var row = [];
    var cell = "";
    var inQuotes = false;

    function pushCell() {
      row.push(cell);
      cell = "";
    }

    function pushRow() {
      if (!row.length && !cell) {
        return;
      }
      pushCell();
      matrix.push(row.map(function (value) { return normalizeText(value); }));
      row = [];
    }

    for (var index = 0; index < source.length; index += 1) {
      var character = source[index];
      var nextCharacter = source[index + 1];

      if (inQuotes) {
        if (character === "\"" && nextCharacter === "\"") {
          cell += "\"";
          index += 1;
          continue;
        }
        if (character === "\"") {
          inQuotes = false;
          continue;
        }
        cell += character;
        continue;
      }

      if (character === "\"") {
        inQuotes = true;
        continue;
      }
      if (character === "," || character === ";" || character === "\t") {
        pushCell();
        continue;
      }
      if (character === "\r") {
        if (nextCharacter === "\n") {
          index += 1;
        }
        pushRow();
        continue;
      }
      if (character === "\n") {
        pushRow();
        continue;
      }
      cell += character;
    }

    if (cell || row.length) {
      pushRow();
    }

    return matrix.filter(function (cells) {
      return (cells || []).some(function (value) {
        return normalizeText(value);
      });
    });
  }

  function readDelimitedText(fileName, text, options) {
    options = options || {};
    var matrix = parseDelimitedMatrix(text);
    var headerInfo = HeaderMapper.findHeaderRow(matrix, { maxRows: options.maxHeaderRows || 12 });
    var dataset = HeaderMapper.rowsFromMatrix(matrix, headerInfo.headerRowIndex);
    var sampleRows = dataset.rows.slice(0, options.sampleRowLimit || 20);
    return {
      fileName: fileName,
      sourceKind: "table",
      rowCount: dataset.rows.length,
      columnCount: dataset.headers.length,
      headers: dataset.headers,
      sampleRows: sampleRows,
      rows: dataset.rows,
      matrix: matrix.slice(0, options.matrixPreviewLimit || 40),
      headerRowIndex: headerInfo.headerRowIndex,
      mapping: HeaderMapper.mapHeaders(dataset.headers, options.requiredFields)
    };
  }

  function readJsonText(fileName, text, options) {
    options = options || {};
    var parsed = JSON.parse(String(text || "null"));
    var rows = [];
    if (Array.isArray(parsed)) {
      rows = parsed.slice();
    } else if (parsed && Array.isArray(parsed.records)) {
      rows = parsed.records.slice();
    } else if (parsed && typeof parsed === "object") {
      rows = [parsed];
    }
    var headers = rows.length ? Object.keys(rows[0]) : Object.keys(parsed || {});
    return {
      fileName: fileName,
      sourceKind: "json",
      rowCount: rows.length,
      columnCount: headers.length,
      headers: headers,
      sampleRows: rows.slice(0, options.sampleRowLimit || 20),
      rows: rows,
      matrix: [],
      headerRowIndex: 0,
      mapping: HeaderMapper.mapHeaders(headers, options.requiredFields)
    };
  }

  return {
    parseDelimitedMatrix: parseDelimitedMatrix,
    readDelimitedText: readDelimitedText,
    readJsonText: readJsonText
  };
});
