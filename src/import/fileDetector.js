(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./importTypes.js"),
      require("./headerMapper.js"),
      require("../lib/monthlyClosingEngine.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.FileDetector = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.HeaderMapper,
    root.KeetaV6 || {}
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HeaderMapper, monthlyClosingExports) {
  "use strict";

  var normalizeHeader = ImportTypes.normalizeHeader;
  var normalizeText = ImportTypes.normalizeText;
  var normalizeCity = ImportTypes.normalizeCity;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;
  var detectCitiesInText = ImportTypes.detectCitiesInText;
  var detectRegistersInText = ImportTypes.detectRegistersInText;
  var extractMonthInfo = ImportTypes.extractMonthInfo;
  var flattenText = ImportTypes.flattenText;
  var getConfidenceState = ImportTypes.getConfidenceState;
  var getImportType = ImportTypes.getImportType;
  var listImportTypes = ImportTypes.listImportTypes;
  var registerLabel = ImportTypes.registerLabel;
  var unique = ImportTypes.unique;
  var MonthlyClosingEngine = monthlyClosingExports && monthlyClosingExports.MonthlyClosingEngine;

  var WEIGHTS = {
    extension: 0.08,
    fileNameScore: 0.16,
    sheetNamesScore: 0.20,
    headersScore: 0.28,
    sampleRowsScore: 0.10,
    formulaScore: 0.06,
    knownArabicTermsScore: 0.06,
    knownEnglishTermsScore: 0.06
  };

  function detectFile(analysisInput, options) {
    options = options || {};
    var analysis = normalizeAnalysisInput(analysisInput);
    if (analysis.extension === ".zip") {
      return buildZipResult(analysis);
    }

    var candidates = listImportTypes().filter(function (item) {
      return item.id !== "unknown" && item.id !== "zip_reference";
    }).map(function (item) {
      return scoreType(item, analysis);
    }).sort(function (left, right) {
      return right.confidence - left.confidence;
    });

    var best = candidates[0] || scoreType(getImportType("unknown"), analysis);
    var second = candidates[1] || null;
    var legacyDetection = detectLegacyMonthlyType(analysis);
    if (legacyDetection) {
      best = mergeLegacyBoost(best, legacyDetection);
    }

    var confidence = best.confidence;
    var typeId = confidence >= ImportTypes.CONFIDENCE_THRESHOLDS.needsReview ? best.typeId : "unknown";
    var cities = detectCities(analysis);
    var registers = detectRegisters(analysis);
    var monthInfo = extractMonthInfo([
      analysis.fileName,
      flattenText(analysis.sheetNames)
    ]);
    if (!monthInfo.detectedMonth) {
      monthInfo = extractMonthInfo([
        flattenText(analysis.headers),
        flattenText(analysis.sampleCellValues)
      ]);
    }
    var warnings = [];

    if (second && Math.abs(best.confidence - second.confidence) <= 0.08) {
      warnings.push("ambiguous_type_detection");
    }
    if (!cities.length) {
      warnings.push("city_not_detected");
    }
    if (!registers.length) {
      warnings.push("register_not_detected");
    }
    if (!monthInfo.detectedMonth && shouldRequireMonth(typeId)) {
      warnings.push("month_not_detected");
    }

    return {
      type: typeId,
      typeId: typeId,
      confidence: round(confidence, 4),
      confidenceState: getConfidenceState(confidence),
      reasons: unique(best.reasons),
      warnings: warnings,
      detectedCity: cities.length > 1 ? "multi" : (cities[0] || ""),
      detectedRegister: registers.length > 1 ? "MULTI" : (registers[0] || ""),
      detectedRegisterLabel: registers.length > 1 ? "Multiple Registers" : registerLabel(registers[0] || ""),
      detectedMonth: monthInfo.detectedMonth,
      dateRange: monthInfo.dateRange,
      detectedSheets: analysis.sheetNames,
      detectedHeaders: analysis.headers,
      scoreBreakdown: best.scoreBreakdown,
      secondBest: second ? { type: second.typeId, confidence: round(second.confidence, 4) } : null
    };
  }

  function normalizeAnalysisInput(analysisInput) {
    var workbookSummary = analysisInput && analysisInput.workbookSummary ? analysisInput.workbookSummary : null;
    var tableSummary = analysisInput && analysisInput.tableSummary ? analysisInput.tableSummary : null;
    var headers = workbookSummary ? workbookSummary.allHeaders : (tableSummary ? tableSummary.headers : (analysisInput.headers || []));
    var sampleRows = workbookSummary ? workbookSummary.bestSampleRows : (tableSummary ? tableSummary.sampleRows : (analysisInput.sampleRows || []));
    var sheetNames = workbookSummary ? workbookSummary.sheetNames : (analysisInput.sheetNames || []);
    var formulaFunctions = workbookSummary ? workbookSummary.formulaFunctions : (analysisInput.formulaFunctions || []);
    return {
      extension: normalizeExtension(analysisInput && analysisInput.extension),
      fileName: normalizeText(analysisInput && analysisInput.fileName),
      headers: headers || [],
      rowCount: Number(analysisInput && analysisInput.rowCount) || (workbookSummary ? workbookSummary.totalRowCount : (tableSummary ? tableSummary.rowCount : 0)),
      sampleRows: sampleRows || [],
      sheetNames: sheetNames || [],
      formulaFunctions: formulaFunctions || [],
      sampleCellValues: flattenRows(sampleRows),
      workbookSummary: workbookSummary,
      tableSummary: tableSummary
    };
  }

  function scoreType(typeDefinition, analysis) {
    var extensionMatch = typeDefinition.extensions.indexOf(analysis.extension) >= 0 ? 1 : 0;
    var fileNameMatches = findMatches(typeDefinition.fileNameTerms, [analysis.fileName]);
    var sheetMatches = findMatches(typeDefinition.sheetTerms, analysis.sheetNames);
    var headerMatches = findMatches(typeDefinition.headerTerms, analysis.headers);
    var rowMatches = findMatches(typeDefinition.rowTerms, analysis.sampleCellValues);
    var formulaMatches = findMatches(typeDefinition.formulaTerms, analysis.formulaFunctions);
    var arabicMatches = findMatches(typeDefinition.arabicTerms, analysis.headers.concat(analysis.sampleCellValues));
    var englishMatches = findMatches(typeDefinition.englishTerms, analysis.headers.concat(analysis.sampleCellValues));
    var headerMapping = HeaderMapper.mapHeaders(analysis.headers || [], typeDefinition.requiredFields || []);

    var scoreBreakdown = {
      extension: extensionMatch ? WEIGHTS.extension : 0,
      fileNameScore: computeCategoryScore(fileNameMatches, typeDefinition.fileNameTerms, WEIGHTS.fileNameScore),
      sheetNamesScore: computeCategoryScore(sheetMatches, typeDefinition.sheetTerms, WEIGHTS.sheetNamesScore),
      headersScore: computeHeaderScore(typeDefinition, analysis.headers, headerMatches),
      sampleRowsScore: computeCategoryScore(rowMatches, typeDefinition.rowTerms, WEIGHTS.sampleRowsScore),
      formulaScore: computeCategoryScore(formulaMatches, typeDefinition.formulaTerms, WEIGHTS.formulaScore),
      knownArabicTermsScore: computeCategoryScore(arabicMatches, typeDefinition.arabicTerms, WEIGHTS.knownArabicTermsScore),
      knownEnglishTermsScore: computeCategoryScore(englishMatches, typeDefinition.englishTerms, WEIGHTS.knownEnglishTermsScore)
    };
    var reasons = []
      .concat(toReasons("file name", fileNameMatches))
      .concat(toReasons("sheet", sheetMatches))
      .concat(toReasons("header", headerMatches))
      .concat(toReasons("row", rowMatches))
      .concat(toReasons("formula", formulaMatches));
    var signalBoost = 0;
    if (fileNameMatches.length >= 2) {
      signalBoost += 0.08;
    } else if (fileNameMatches.length === 1) {
      signalBoost += 0.04;
    }
    if (sheetMatches.length >= 2) {
      signalBoost += 0.12;
    } else if (sheetMatches.length === 1) {
      signalBoost += 0.05;
    }
    if (headerMatches.length >= 4) {
      signalBoost += 0.18;
    } else if (headerMatches.length >= 2) {
      signalBoost += 0.10;
    }
    if (typeDefinition.requiredFields && typeDefinition.requiredFields.length && headerMapping.missingRequired.length === 0) {
      signalBoost += 0.10;
    }

    return {
      typeId: typeDefinition.id,
      confidence: clamp(sumValues(scoreBreakdown) + signalBoost, 0, 0.99),
      reasons: reasons,
      scoreBreakdown: scoreBreakdown
    };
  }

  function computeHeaderScore(typeDefinition, headers, headerMatches) {
    var mapped = HeaderMapper.mapHeaders(headers || [], typeDefinition.requiredFields || []);
    var matchScore = computeCategoryScore(headerMatches, typeDefinition.headerTerms, WEIGHTS.headersScore * 0.8);
    var requiredBoost = 0;
    if (typeDefinition.requiredFields && typeDefinition.requiredFields.length) {
      var satisfied = typeDefinition.requiredFields.filter(function (fieldName) {
        return mapped.byField[fieldName];
      }).length;
      requiredBoost = (satisfied / typeDefinition.requiredFields.length) * (WEIGHTS.headersScore * 0.2);
    } else if (headerMatches.length) {
      requiredBoost = WEIGHTS.headersScore * 0.2;
    }
    return clamp(matchScore + requiredBoost, 0, WEIGHTS.headersScore);
  }

  function findMatches(terms, haystackValues) {
    var textList = (haystackValues || []).map(normalizeHeader).filter(Boolean);
    return unique((terms || []).filter(function (term) {
      var candidate = normalizeHeader(term);
      return candidate && textList.some(function (value) {
        return value.indexOf(candidate) >= 0;
      });
    }));
  }

  function computeCategoryScore(matches, terms, weight) {
    if (!weight || !(terms || []).length || !(matches || []).length) {
      return 0;
    }
    return clamp((matches.length / terms.length) * weight, 0, weight);
  }

  function flattenRows(rows) {
    var values = [];
    (rows || []).forEach(function (row) {
      Object.keys(row || {}).forEach(function (key) {
        values.push(row[key]);
      });
    });
    return values.map(normalizeText).filter(Boolean);
  }

  function detectCities(analysis) {
    var found = []
      .concat(detectCitiesInText(analysis.fileName))
      .concat(analysis.sheetNames.reduce(function (memo, value) {
        return memo.concat(detectCitiesInText(value));
      }, []))
      .concat(analysis.headers.reduce(function (memo, value) {
        return memo.concat(detectCitiesInText(value));
      }, []))
      .concat(analysis.sampleCellValues.reduce(function (memo, value) {
        return memo.concat(detectCitiesInText(value));
      }, []));
    return unique(found).map(normalizeCity).filter(Boolean);
  }

  function detectRegisters(analysis) {
    var primary = []
      .concat(detectRegistersInText(analysis.fileName))
      .concat(analysis.sheetNames.reduce(function (memo, value) {
        return memo.concat(detectRegistersInText(value));
      }, []));
    var normalizedPrimary = unique(primary).map(normalizeRegisterCode).filter(Boolean);
    if (normalizedPrimary.length) {
      return normalizedPrimary;
    }
    var found = []
      .concat(analysis.headers.reduce(function (memo, value) {
        return memo.concat(detectRegistersInText(value));
      }, []))
      .concat(analysis.sampleCellValues.reduce(function (memo, value) {
        return memo.concat(detectRegistersInText(value));
      }, []));
    return unique(found).map(normalizeRegisterCode).filter(Boolean);
  }

  function detectLegacyMonthlyType(analysis) {
    if (!MonthlyClosingEngine || typeof MonthlyClosingEngine.detectMonthlyFileType !== "function") {
      return null;
    }
    var legacy = MonthlyClosingEngine.detectMonthlyFileType(analysis.fileName, analysis.sheetNames, analysis.headers);
    var map = {
      company_invoice: "company_invoice_workbook",
      internal_settlement: "internal_settlement_workbook",
      face_recognition: "face_verification_workbook",
      company_vda: "vda_workbook"
    };
    if (!legacy || !legacy.type || !map[legacy.type]) {
      return null;
    }
    return {
      typeId: map[legacy.type],
      reasons: ["legacy monthly detector matched " + legacy.type]
    };
  }

  function mergeLegacyBoost(best, legacyDetection) {
    if (!legacyDetection) {
      return best;
    }
    if (legacyDetection.typeId === best.typeId) {
      best.reasons.push.apply(best.reasons, legacyDetection.reasons);
      best.confidence = clamp(best.confidence + 0.08, 0, 0.99);
      best.scoreBreakdown.headersScore = clamp(best.scoreBreakdown.headersScore + 0.04, 0, WEIGHTS.headersScore);
      return best;
    }
    return {
      typeId: legacyDetection.typeId,
      confidence: clamp(best.confidence + 0.10, 0, 0.99),
      reasons: legacyDetection.reasons.concat(best.reasons.slice(0, 4)),
      scoreBreakdown: best.scoreBreakdown
    };
  }

  function shouldRequireMonth(typeId) {
    return [
      "performance_daily_csv",
      "performance_daily_workbook",
      "performance_overall_csv",
      "performance_overall_workbook",
      "vda_csv",
      "vda_workbook",
      "vda_keeta_csv",
      "vda_keeta_workbook",
      "face_verification_csv",
      "face_verification_workbook",
      "delivery_experience_csv",
      "delivery_experience_workbook",
      "company_invoice_workbook",
      "internal_settlement_workbook"
    ].indexOf(typeId) >= 0;
  }

  function buildZipResult(analysis) {
    return {
      type: "zip_reference",
      typeId: "zip_reference",
      confidence: 0.99,
      confidenceState: "auto_detected",
      reasons: ["zip extension detected"],
      warnings: ["zip_reference_only"],
      detectedCity: "",
      detectedRegister: "",
      detectedRegisterLabel: "",
      detectedMonth: "",
      dateRange: { start: "", end: "" },
      detectedSheets: [],
      detectedHeaders: [],
      scoreBreakdown: {
        extension: 0.99
      },
      secondBest: null
    };
  }

  function toReasons(prefix, matches) {
    return (matches || []).map(function (value) {
      return prefix + " matched: " + value;
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits) {
    var factor = Math.pow(10, digits == null ? 2 : digits);
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function sumValues(map) {
    return Object.keys(map || {}).reduce(function (sum, key) {
      return sum + (Number(map[key]) || 0);
    }, 0);
  }

  function normalizeExtension(extension) {
    var text = normalizeText(extension).toLowerCase();
    if (!text) {
      return "";
    }
    return text.charAt(0) === "." ? text : ("." + text);
  }

  return {
    detectFile: detectFile,
    normalizeAnalysisInput: normalizeAnalysisInput,
    scoreType: scoreType
  };
});
