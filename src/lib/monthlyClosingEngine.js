(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./formulaEngine.js").FormulaEngine);
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory(root.KeetaV6.FormulaEngine));
})(typeof globalThis !== "undefined" ? globalThis : this, function (FormulaEngine) {
  "use strict";

  var CITY_ALIASES = {
    jeddah: "جدة",
    jeddha: "جدة",
    jedd: "جدة",
    جدة: "جدة",
    riyadh: "الرياض",
    الرياض: "الرياض",
  };

  function cleanText(value) {
    return FormulaEngine.normalizeText(value);
  }

  function normalizeHeader(value) {
    return FormulaEngine.normalizeHeader(value);
  }

  function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    var text = String(value == null ? "" : value)
      .replace(/\u00a0/g, "")
      .replace(/\s*ر\.س\.\s*/g, "")
      .replace(/,/g, "")
      .replace(/[٠-٩]/g, function (digit) {
        return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
      })
      .trim();

    if (!text) {
      return 0;
    }

    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function toBooleanish(value) {
    var text = normalizeHeader(value);
    return ["true", "yes", "valid", "pass", "صالح", "نعم", "✅"].some(function (token) {
      return text.indexOf(token) >= 0;
    });
  }

  function toDateKey(value) {
    var text = cleanText(value).replace(/[٠-٩]/g, function (digit) {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
    });
    if (/^\d{8}$/.test(text)) {
      return text;
    }
    var parsed = FormulaEngine.parseDateLike(text);
    if (!parsed) {
      return "";
    }
    return [
      String(parsed.getFullYear()),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0"),
    ].join("");
  }

  function getMonthDays(monthValue) {
    var text = cleanText(monthValue);
    if (/^\d{4}-\d{2}$/.test(text)) {
      var parts = text.split("-");
      return new Date(Number(parts[0]), Number(parts[1]), 0).getDate();
    }
    return 31;
  }

  function extractMonthFromDateKey(dateKey) {
    var text = cleanText(dateKey);
    if (/^\d{8}$/.test(text)) {
      return text.slice(0, 4) + "-" + text.slice(4, 6);
    }
    if (/^\d{4}-\d{2}$/.test(text)) {
      return text;
    }
    return "";
  }

  function inferCityFromText(value) {
    var text = normalizeHeader(value);
    var keys = Object.keys(CITY_ALIASES);
    for (var index = 0; index < keys.length; index += 1) {
      if (text.indexOf(keys[index]) >= 0) {
        return CITY_ALIASES[keys[index]];
      }
    }
    return "";
  }

  function inferRegisterFromText(value) {
    var text = normalizeHeader(value);
    if (text.indexOf("express") >= 0 || text.indexOf("اكسبرس") >= 0) {
      return "Express";
    }
    if (text.indexOf("albwaba") >= 0 || text.indexOf("البوابة") >= 0 || text.indexOf("bawwaba") >= 0) {
      return "Albwaba";
    }
    if (text.indexOf("fr 3pl") >= 0 || text.indexOf("3pl") >= 0) {
      return "FR 3PL";
    }
    return "";
  }

  function firstOf(row, aliases) {
    var keys = Object.keys(row || {});
    for (var aliasIndex = 0; aliasIndex < aliases.length; aliasIndex += 1) {
      var alias = normalizeHeader(aliases[aliasIndex]);
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (normalizeHeader(keys[keyIndex]) === alias) {
          return row[keys[keyIndex]];
        }
      }
    }
    return "";
  }

  function mapRows(rows, mapper) {
    return (rows || []).map(mapper).filter(Boolean);
  }

  function getSheetRows(workbook, sheetName, xlsxLib) {
    var XLSX = xlsxLib || (typeof globalThis !== "undefined" ? globalThis.XLSX : null);
    if (!workbook || !XLSX || !workbook.Sheets || !workbook.Sheets[sheetName]) {
      return [];
    }
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
      raw: true,
    });
  }

  function findSheetName(workbook, wantedNames) {
    if (!workbook || !Array.isArray(workbook.SheetNames)) {
      return "";
    }
    var normalizedNames = wantedNames.map(normalizeHeader);
    for (var index = 0; index < workbook.SheetNames.length; index += 1) {
      var actual = workbook.SheetNames[index];
      var normalizedActual = normalizeHeader(actual);
      if (normalizedNames.indexOf(normalizedActual) >= 0) {
        return actual;
      }
    }
    for (var wantedIndex = 0; wantedIndex < normalizedNames.length; wantedIndex += 1) {
      for (var sheetIndex = 0; sheetIndex < workbook.SheetNames.length; sheetIndex += 1) {
        var current = workbook.SheetNames[sheetIndex];
        if (normalizeHeader(current).indexOf(normalizedNames[wantedIndex]) >= 0) {
          return current;
        }
      }
    }
    return "";
  }

  function buildMatchKey(register, riderId, iqama) {
    return [
      normalizeHeader(register || ""),
      cleanText(riderId || ""),
      cleanText(iqama || ""),
    ].join("|");
  }

  function detectMonthlyFileType(fileName, workbookSheets, headers) {
    var lowerFileName = normalizeHeader(fileName);
    var normalizedSheets = (workbookSheets || []).map(normalizeHeader);
    var normalizedHeaders = (headers || []).map(normalizeHeader);

    var city = inferCityFromText(fileName + " " + normalizedSheets.join(" "));
    var month = "";
    var monthMatch = String(fileName).match(/(20\d{2})[-#_ ]?(0[1-9]|1[0-2])/);
    if (monthMatch) {
      month = monthMatch[1] + "-" + monthMatch[2];
    }

    var type = "unknown";
    if (lowerFileName.indexOf("fr full data") >= 0 || normalizedSheets.indexOf(normalizeHeader("Courier Details (MTD)")) >= 0) {
      type = "face_recognition";
    } else if (lowerFileName.indexOf("فاتورة كيتا") >= 0 || normalizedSheets.indexOf(normalizeHeader("FR 3PL")) >= 0) {
      type = "internal_settlement";
    } else if (normalizedSheets.indexOf(normalizeHeader("تفاصيل الشركاء")) >= 0 && normalizedSheets.indexOf(normalizeHeader("تفاصيل سائق التوصيل")) >= 0) {
      type = "company_invoice";
    } else if (lowerFileName.indexOf("company") >= 0 && normalizedSheets.length >= 2) {
      type = "company_invoice";
    } else if (normalizedHeaders.indexOf(normalizeHeader("3PL Name")) >= 0 && normalizedHeaders.indexOf(normalizeHeader("Rider ID")) >= 0) {
      type = "company_vda";
    } else if (normalizedHeaders.indexOf(normalizeHeader("معرف الشريك")) >= 0 && normalizedHeaders.indexOf(normalizeHeader("معرّف سائق التوصيل")) >= 0) {
      type = "company_courier_invoice_sheet";
    } else if (normalizedHeaders.indexOf(normalizeHeader("معرف الشريك")) >= 0 && normalizedHeaders.indexOf(normalizeHeader("إجمالي المبلغ المستحق")) >= 0) {
      type = "company_partner_invoice_sheet";
    }

    var register = inferRegisterFromText(fileName + " " + normalizedSheets.join(" "));

    return {
      fileName: fileName,
      type: type,
      city: city,
      month: month,
      register: register,
      workbookSheets: workbookSheets || [],
      headers: headers || [],
    };
  }

  function normalizeCompanyPartnerInvoice(rows) {
    return mapRows(rows, function (row) {
      var partnerId = cleanText(firstOf(row, ["معرف الشريك"]));
      if (!partnerId) {
        return null;
      }
      var partnerName = cleanText(firstOf(row, ["اسم الشريك"]));
      var register = inferRegisterFromText(partnerName);
      return {
        source: "company_partner_invoice",
        partnerId: partnerId,
        partnerName: partnerName,
        billingCycle: cleanText(firstOf(row, ["دورة الفوترة"])),
        city: inferCityFromText(partnerName),
        register: register,
        pricingPerOrder: toNumber(firstOf(row, ["التسعير حسب الطلب"])),
        distanceSurcharge: toNumber(firstOf(row, ["المسافة من ارتفاع السعر."])),
        capacityIncentive: toNumber(firstOf(row, ["حوافز سعة الطلب المتاحة الصالحة (زيادة)"])),
        deliveryExperienceIncentive: toNumber(firstOf(row, ["حوافز تجربة التوصيل"])),
        dxgy: toNumber(firstOf(row, ["DXGY"])),
        subsidy: toNumber(firstOf(row, ["الإعانة"])),
        otherBonuses: toNumber(firstOf(row, ["الأنشطة والمكافآت الأخرى"])),
        deduction: toNumber(firstOf(row, ["الخصم"])),
        foodCompensation: toNumber(firstOf(row, ["تعويض عن تلف الطعام"])),
        registrationFee: toNumber(firstOf(row, ["رسوم خدمة التسجيل"])),
        lastAdjustment: toNumber(firstOf(row, ["تعديل آخر"])),
        taxAmount: toNumber(firstOf(row, ["مبلغ الضريبة"])),
        tipsExcludingTax: toNumber(firstOf(row, ["الإكرامية (باستثناء الضريبة)"])),
        tgaDeduction: toNumber(firstOf(row, ["خصم TGA"])),
        invoiceAmount: toNumber(firstOf(row, ["مبلغ الفاتورة"])),
        totalDue: toNumber(firstOf(row, ["إجمالي المبلغ المستحق"])),
      };
    });
  }

  function normalizeCompanyCourierInvoice(rows) {
    return mapRows(rows, function (row) {
      var riderId = cleanText(firstOf(row, ["معرّف سائق التوصيل", "معرف سائق التوصيل"]));
      if (!riderId) {
        return null;
      }

      var partnerName = cleanText(firstOf(row, ["اسم الشريك"]));
      var isValid = toBooleanish(firstOf(row, ["صالح"]));
      var capacityIncentive = isValid ? toNumber(firstOf(row, ["حوافز سعة الطلب المتاحة الصالحة (زيادة)"])) : 0;
      var deliveryExperienceIncentive = isValid ? toNumber(firstOf(row, ["حوافز تجربة التوصيل"])) : 0;

      return {
        source: "company_courier_invoice",
        partnerId: cleanText(firstOf(row, ["معرف الشريك"])),
        partnerName: partnerName,
        register: inferRegisterFromText(partnerName),
        city: inferCityFromText(partnerName),
        billingCycle: cleanText(firstOf(row, ["دورة الفوترة"])),
        riderId: riderId,
        fullName: cleanText(firstOf(row, ["اسم سائق التوصيل"])),
        isValid: isValid,
        reason: cleanText(firstOf(row, ["السبب"])),
        validDays: toNumber(firstOf(row, ["أيام الاتصال-صالحة"])),
        onlineHours: toNumber(firstOf(row, ["ساعات الاتصال اليومي-صالحة"])),
        peakHours: toNumber(firstOf(row, ["ساعات الاتصال اليومي خلال وقت الذروة-صالحة"])),
        deliveredOrders: toNumber(firstOf(row, ["الطلبات المُسلمة"])),
        deliveryDistance: toNumber(firstOf(row, ["مسافة التوصيل"])),
        pricingPerOrder: toNumber(firstOf(row, ["التسعير حسب الطلب"])),
        distanceSurcharge: toNumber(firstOf(row, ["المسافة من ارتفاع السعر."])),
        capacityIncentive: capacityIncentive,
        deliveryExperienceIncentive: deliveryExperienceIncentive,
        vehicle: cleanText(firstOf(row, ["المركبة"])),
        experienceLevel: cleanText(firstOf(row, ["المستوى التقديري الحالي"])),
        estimatedBonusAmount: toNumber(firstOf(row, ["المبلغ التقديري الحالي للمكافأة"])),
        differenceAmount: toNumber(firstOf(row, ["الفرق"])),
        deduction: toNumber(firstOf(row, ["الخصم"])),
        foodCompensation: toNumber(firstOf(row, ["تعويض عن تلف الطعام"])),
        grossCompanyAmount:
          toNumber(firstOf(row, ["التسعير حسب الطلب"])) +
          toNumber(firstOf(row, ["المسافة من ارتفاع السعر."])) +
          capacityIncentive +
          deliveryExperienceIncentive +
          toNumber(firstOf(row, ["تعويض عن تلف الطعام"])) +
          toNumber(firstOf(row, ["DXGY"])) +
          toNumber(firstOf(row, ["الإعانة"])) +
          toNumber(firstOf(row, ["الأنشطة والمكافآت الأخرى"])) +
          toNumber(firstOf(row, ["الخصم"])),
      };
    });
  }

  function normalizeSettlementRow(row, registerLabel) {
    var riderId = cleanText(firstOf(row, ["المعرف"]));
    if (!riderId) {
      return null;
    }

    var isValid = toBooleanish(firstOf(row, ["صالح"]));
    var capacityIncentive = isValid ? toNumber(firstOf(row, ["حوافز سعة الطلب المتاحة الصالحة (زيادة)"])) : 0;
    var experienceIncentive = isValid ? toNumber(firstOf(row, ["حوافز تجربة التوصيل"])) : 0;

    return {
      source: "internal_settlement",
      register: registerLabel,
      riderId: riderId,
      fullName: cleanText(firstOf(row, ["اسم صاحب الايدي", "الاسم بالكامل"])),
      iqama: cleanText(firstOf(row, ["رقم هوية صاحب الايدي", "رقم بطاقة الهوية"])),
      vehicle: cleanText(firstOf(row, ["المركبة"])),
      status: cleanText(firstOf(row, ["الحالة"])),
      isValid: isValid,
      reason: cleanText(firstOf(row, ["السبب"])),
      validDays: toNumber(firstOf(row, ["أيام الاتصال-صالحة"])),
      onlineHours: toNumber(firstOf(row, ["ساعات الاتصال اليومي-صالحة"])),
      peakHours: toNumber(firstOf(row, ["ساعات الاتصال اليومي خلال وقت الذروة-صالحة"])),
      deliveredOrders: toNumber(firstOf(row, ["الطلبات المُسلمة"])),
      deliveryDistance: toNumber(firstOf(row, ["مسافة التوصيل"])),
      pricingPerOrder: toNumber(firstOf(row, ["التسعير حسب الطلب"])),
      distanceSurcharge: toNumber(firstOf(row, ["المسافة من ارتفاع السعر."])),
      pricingAndDistance: toNumber(firstOf(row, ["التسعير + المسافة"])),
      capacityIncentive: capacityIncentive,
      deliveryExperienceIncentive: experienceIncentive,
      totalIncentives: toNumber(firstOf(row, ["اجمالي الحوافز"])) || (capacityIncentive + experienceIncentive),
      grossAmount: toNumber(firstOf(row, ["الاجمالي"])),
    };
  }

  function normalizeExpressSettlement(rows) {
    return mapRows(rows, function (row) {
      return normalizeSettlementRow(row, "Express");
    });
  }

  function normalizeAlbwabaSettlement(rows) {
    return mapRows(rows, function (row) {
      return normalizeSettlementRow(row, "Albwaba");
    });
  }

  function normalizeFr3plSettlement(rows) {
    return mapRows(rows, function (row) {
      var riderId = cleanText(firstOf(row, ["المعرف"]));
      if (!riderId) {
        return null;
      }
      return {
        source: "fr3pl",
        register: inferRegisterFromText(firstOf(row, ["السجل"])),
        riderId: riderId,
        fullName: cleanText(firstOf(row, ["الاسم بالكامل"])),
        iqama: cleanText(firstOf(row, ["رقم بطاقة الهوية", "رقم الهوية1"])),
        phone: cleanText(firstOf(row, ["رقم الهاتف", "رقم التواصل"])),
        vehicle: cleanText(firstOf(row, ["المركبة"])),
        deliveredOrders: toNumber(firstOf(row, ["الطلبات المُسلمة"])),
        serviceFee: toNumber(firstOf(row, ["رسوم خدمة التوصيل"])),
        supportAmount: toNumber(firstOf(row, ["دعم"])),
        serviceFeeDeduction: toNumber(firstOf(row, ["خصم رسوم الخدمة"])),
        onTimeDeduction: toNumber(firstOf(row, ["خصم مكافأة التوصيل على الموعد"])),
        foodCompensation: toNumber(firstOf(row, ["تعويض طعام"])),
        appealRefund: toNumber(firstOf(row, ["استرداد الأموال نتيجة الاستئناف"])),
        registrationFee: toNumber(firstOf(row, ["رسوم خدمة التسجيل"])),
        otherAdjustments: toNumber(firstOf(row, ["تعديلات أخرى"])),
        grossAmount: toNumber(firstOf(row, ["المبلغ المستحق"])),
        replacementIqama: cleanText(firstOf(row, ["رقم الهوية1"])),
        replacementName: cleanText(firstOf(row, ["البديل 1"])),
        replacementPhone: cleanText(firstOf(row, ["رقم التواصل"])),
        replacementType: cleanText(firstOf(row, ["نوع البديل"])),
        vehicleType: cleanText(firstOf(row, ["نوع المركبة"])),
        gasCard: cleanText(firstOf(row, ["رقم كرت البنزين1"])),
        nationality: cleanText(firstOf(row, ["الجنسية 1"])),
        iban: cleanText(firstOf(row, ["الايبان 1"])),
        assignDate: cleanText(firstOf(row, ["تاريخ الاستلام1"])),
        releaseDate: cleanText(firstOf(row, ["تاريخ التسليم1"])),
        daysWorked: toNumber(firstOf(row, ["الايام"])),
        settlementOrders: toNumber(firstOf(row, ["الطلبات"])),
        preCommissionAmount: toNumber(firstOf(row, ["الاجمالي قبل العمولة"])),
        commission: toNumber(firstOf(row, ["العمولة"])),
        dueSalary: toNumber(firstOf(row, ["الراتب المستحق"])),
        loans: toNumber(firstOf(row, ["سلف"])),
        violations: toNumber(firstOf(row, ["المخالفات"])),
        notes: cleanText(firstOf(row, ["ملاحظات 1"])),
      };
    });
  }

  function normalizeVdaRows(rows) {
    return mapRows(rows, function (row) {
      var riderId = cleanText(firstOf(row, ["Rider ID", "معرّف السائق"]));
      if (!riderId) {
        return null;
      }
      return {
        source: "vda",
        partnerName: cleanText(firstOf(row, ["3PL Name"])),
        register: inferRegisterFromText(firstOf(row, ["3PL Name"])),
        firstOnlineDate: toDateKey(firstOf(row, ["First online date"])),
        onlineDay: toDateKey(firstOf(row, ["Online Day"])),
        riderId: riderId,
        vehicleType: cleanText(firstOf(row, ["Vehicle Type"])),
        vda: toNumber(firstOf(row, ["VDA"])),
        onlineHours: toNumber(firstOf(row, ["Shift Online hours"])),
        validShifts: toNumber(firstOf(row, ["Sum of Valid Shifts"])),
        shouldOnlineDays: toNumber(firstOf(row, ["Should online days"])),
        deliveredTasks: toNumber(firstOf(row, ["Sum of total delivered tasks"])),
      };
    });
  }

  function normalizeShortVda(rows) {
    return mapRows(rows, function (row) {
      var iqama = cleanText(firstOf(row, ["رقم الاقامة 1"]));
      var riderId = cleanText(firstOf(row, ["Rider ID"]));
      if (!iqama && !riderId) {
        return null;
      }
      return {
        source: "short_vda",
        riderId: riderId,
        register: cleanText(firstOf(row, ["السجل"])),
        vehicleType: cleanText(firstOf(row, ["نوع المركبة"])),
        rank: toNumber(firstOf(row, ["الترتيب"])),
        iqama: iqama,
        replacementName: cleanText(firstOf(row, ["اسم البديل 1"])),
        deliveredOrders: toNumber(firstOf(row, ["الطلبات المسلمة"])),
        orderValidity: cleanText(firstOf(row, ["صلاحية الطلبات"])),
        keetaValidity: cleanText(firstOf(row, ["الصلاحية بالنسبة لكيتا"])),
        city: cleanText(firstOf(row, ["المدينة"])),
      };
    });
  }

  function normalizeVdaReport(rows) {
    return mapRows(rows, function (row) {
      var riderId = cleanText(firstOf(row, ["معرّف السائق"]));
      if (!riderId) {
        return null;
      }
      return {
        source: "vda_report",
        status: cleanText(firstOf(row, ["الحالة"])),
        userType: cleanText(firstOf(row, ["نوع الايدي"])),
        register: cleanText(firstOf(row, ["السجل"])),
        riderId: riderId,
        fullName: cleanText(firstOf(row, ["الاسم بالكامل"])),
        iqama: cleanText(firstOf(row, ["رقم الهوية", "رقم الاقامة 1"])),
        phone: cleanText(firstOf(row, ["رقم الهاتف"])),
        accountStatus: cleanText(firstOf(row, ["الحالة2"])),
        replacementIqama: cleanText(firstOf(row, ["رقم الاقامة 1"])),
        replacementName: cleanText(firstOf(row, ["اسم البديل 1"])),
        replacementPhone: cleanText(firstOf(row, ["رقم جوال البديل 1"])),
        replacementType: cleanText(firstOf(row, ["نوع البديل 1"])),
        vehicle: cleanText(firstOf(row, ["المركبة"])),
        assignDate: cleanText(firstOf(row, ["الأستلام"])),
        deliveredOrders: toNumber(firstOf(row, ["الطلبات المسلمة"])),
        targetDifference: toNumber(firstOf(row, ["فرق التارجت"])),
        targetState: cleanText(firstOf(row, ["تارجت الطلبات"])),
        targetValue: toNumber(firstOf(row, ["التارجت المستهدف"])),
        currentGoal: toNumber(firstOf(row, ["الهدف الحالي"])),
        firstOnlineDate: toDateKey(firstOf(row, ["بداية عمل الايدي"])),
        validDays: toNumber(firstOf(row, ["الأيام الصالحة"])),
        allowedAbsence: toNumber(firstOf(row, ["مسموح ضياع"])),
        absentDays: toNumber(firstOf(row, ["ايام الغياب"])),
        invalidDays: toNumber(firstOf(row, ["عدد الايام الغير صالحة"])),
        daysRequiredToBeValid: toNumber(firstOf(row, ["عدد الأيام علشان يكون صالح"])),
        expectedWorkingDays: toNumber(firstOf(row, ["عدد ايام العمل المتوقعة"])),
        allowedVacationDays: toNumber(firstOf(row, ["ايام مسموح الاجازة بها"])),
        dailyTargetForValidity: toNumber(firstOf(row, ["الهدف المطلوب في اليوم للصلاحية من كيتا"])),
        totalMonthTarget: toNumber(firstOf(row, ["التارجت الكلي للطلبات حتي نهاية الشهر من كيتا"])),
        totalWorkingDays: toNumber(firstOf(row, ["عدد ايام العمل للايدي"])),
        currentRequiredTarget: toNumber(firstOf(row, ["الهدف الحالي المطلوب لتحقيق صلاحية الطلبات"])),
      };
    });
  }

  function normalizeDeliveryExperience(rows) {
    return mapRows(rows, function (row) {
      var riderId = cleanText(firstOf(row, ["معرِّف سائق التوصيل", "Courier ID"]));
      if (!riderId) {
        return null;
      }
      return {
        source: "delivery_experience",
        register: cleanText(firstOf(row, ["السجل"])),
        vehicle: cleanText(firstOf(row, ["المركبة", "Vehicle Type"])),
        riderId: riderId,
        fullName: cleanText(firstOf(row, ["الاسم", "اسم المندوب"])),
        currentLevel: cleanText(firstOf(row, ["المستوى التقديري الحالي"])),
        currentClassification: cleanText(firstOf(row, ["التصنيف التقديري الحالي"])),
        ratingPercentage: toNumber(firstOf(row, ["النسبة المئوية لتصنيف سائق التوصيل"])),
        currentRankScore: toNumber(firstOf(row, ["الدرجة الحالية للتعيين الإجباري"])),
        estimatedBonusAmount: toNumber(firstOf(row, ["المبلغ التقديري الحالي للمكافأة"])),
        onTimeRate: toNumber(firstOf(row, ["معدل التوصيل في الموعد"])),
        completionRate: toNumber(firstOf(row, ["نسبة اكتمال الطلبات"])),
        orders: toNumber(firstOf(row, ["حجم الطلبات"])),
        totalKilometers: toNumber(firstOf(row, ["اجمالي الكيلوات"])),
        city: inferCityFromText(firstOf(row, ["السجل"]) + " " + firstOf(row, ["Problem Arabic"])),
      };
    });
  }

  function normalizeCompanyDailyVdaRows(rows) {
    return normalizeVdaRows(rows);
  }

  function normalizeFaceRecognitionWorkbook(workbook, xlsxLib) {
    var partnerSheetName = findSheetName(workbook, ["Partner Details (MTD)"]);
    var courierSheetName = findSheetName(workbook, ["Courier Details (MTD)"]);
    var dailySheetName = findSheetName(workbook, ["Courier Details (Daily)"]);
    var partnerRows = getSheetRows(workbook, partnerSheetName, xlsxLib);
    var courierRows = getSheetRows(workbook, courierSheetName, xlsxLib);
    var dailyRows = getSheetRows(workbook, dailySheetName, xlsxLib);

    return {
      partnerSummary: mapRows(partnerRows, function (row) {
        var partnerId = cleanText(firstOf(row, ["partner_id", "partner id", "1"]));
        if (!partnerId) {
          return null;
        }
        return {
          city: cleanText(firstOf(row, ["city", "0"])),
          partnerId: partnerId,
          brand: cleanText(firstOf(row, ["Brand", "2"])),
          pmm: cleanText(firstOf(row, ["PMM", "3"])),
          failed: toNumber(firstOf(row, ["4"])),
          passed: toNumber(firstOf(row, ["5"])),
          triggered: toNumber(firstOf(row, ["6"])),
          passRate: toNumber(firstOf(row, ["7"])),
        };
      }),
      courierSummary: mapRows(courierRows, function (row) {
        var riderId = cleanText(firstOf(row, ["courier_id", "Rider ID"]));
        if (!riderId) {
          return null;
        }
        return {
          city: cleanText(firstOf(row, ["city"])),
          partnerId: cleanText(firstOf(row, ["partner_id"])),
          pmm: cleanText(firstOf(row, ["PMM"])),
          brand: cleanText(firstOf(row, ["Brand"])),
          riderId: riderId,
          triggeredDays: toNumber(firstOf(row, ["Total days triggered this month (MTD)"])),
          passedDays: toNumber(firstOf(row, ["Total days passed this month (MTD)"])),
          passRate: toNumber(firstOf(row, ["Pass rate this month (MTD)"])),
          result: cleanText(firstOf(row, ["if over 90% pass rate this month"])),
        };
      }),
      dailyRows: mapRows(dailyRows, function (row) {
        var riderId = cleanText(firstOf(row, ["courier_id"]));
        if (!riderId) {
          return null;
        }
        return {
          dateKey: toDateKey(firstOf(row, ["dt"])),
          city: cleanText(firstOf(row, ["city_name"])),
          brand: cleanText(firstOf(row, ["Brand"])),
          riderId: riderId,
          capacityType: cleanText(firstOf(row, ["capacity_type"])),
          partnerId: cleanText(firstOf(row, ["partner_id"])),
          partnerName: cleanText(firstOf(row, ["partner_name"])),
          result: cleanText(firstOf(row, ["is_self_delivery_new"])),
          failedTimes: toNumber(firstOf(row, ["daily_failed_times"])),
          expiredTimes: toNumber(firstOf(row, ["daily_expired_times"])),
          deliveredOrders: toNumber(firstOf(row, ["delivered_orders"])),
        };
      }),
    };
  }

  function normalizeInternalSettlementWorkbook(workbook, xlsxLib) {
    var result = {
      express: [],
      albwaba: [],
      fr3pl: [],
      vda: [],
      shortVda: [],
      vdaReport: [],
      deliveryExperience: [],
      transforms: [],
    };

    var expressSheet = findSheetName(workbook, ["Express"]);
    var albwabaSheet = findSheetName(workbook, ["Albwaba"]);
    var fr3plSheet = findSheetName(workbook, ["FR 3PL"]);
    var vdaSheet = findSheetName(workbook, ["VDA"]);
    var shortVdaSheet = findSheetName(workbook, ["Short VDA"]);
    var vdaReportSheet = findSheetName(workbook, ["VDA_Report"]);
    var deliverySheet = findSheetName(workbook, ["حالة نتيجة تجربة التوصيل"]);

    result.express = normalizeExpressSettlement(getSheetRows(workbook, expressSheet, xlsxLib));
    result.albwaba = normalizeAlbwabaSettlement(getSheetRows(workbook, albwabaSheet, xlsxLib));
    result.fr3pl = normalizeFr3plSettlement(getSheetRows(workbook, fr3plSheet, xlsxLib));
    result.vda = normalizeVdaRows(getSheetRows(workbook, vdaSheet, xlsxLib));
    result.shortVda = normalizeShortVda(getSheetRows(workbook, shortVdaSheet, xlsxLib));
    result.vdaReport = normalizeVdaReport(getSheetRows(workbook, vdaReportSheet, xlsxLib));
    result.deliveryExperience = normalizeDeliveryExperience(getSheetRows(workbook, deliverySheet, xlsxLib));

    result.transforms = [
      { sheet: expressSheet, rows: result.express.length, type: "express_settlement" },
      { sheet: albwabaSheet, rows: result.albwaba.length, type: "albwaba_settlement" },
      { sheet: fr3plSheet, rows: result.fr3pl.length, type: "fr3pl_settlement" },
      { sheet: vdaSheet, rows: result.vda.length, type: "vda" },
      { sheet: shortVdaSheet, rows: result.shortVda.length, type: "short_vda" },
      { sheet: vdaReportSheet, rows: result.vdaReport.length, type: "vda_report" },
      { sheet: deliverySheet, rows: result.deliveryExperience.length, type: "delivery_experience" },
    ];

    return result;
  }

  function buildComparisonRows(companyRows, internalRows) {
    var internalMap = new Map();
    (internalRows || []).forEach(function (row) {
      internalMap.set(buildMatchKey(row.register, row.riderId, row.iqama), row);
      if (row.iqama) {
        internalMap.set(buildMatchKey(row.register, "", row.iqama), row);
      }
      internalMap.set(buildMatchKey("", row.riderId, row.iqama), row);
    });

    return (companyRows || []).map(function (companyRow) {
      var internalRow =
        internalMap.get(buildMatchKey(companyRow.register, companyRow.riderId, companyRow.iqama)) ||
        internalMap.get(buildMatchKey(companyRow.register, "", companyRow.iqama)) ||
        internalMap.get(buildMatchKey("", companyRow.riderId, companyRow.iqama)) ||
        null;

      var ordersDiff = internalRow ? companyRow.deliveredOrders - internalRow.deliveredOrders : companyRow.deliveredOrders;
      var distanceDiff = internalRow ? companyRow.deliveryDistance - internalRow.deliveryDistance : companyRow.deliveryDistance;
      var incentivesDiff = internalRow
        ? (companyRow.capacityIncentive + companyRow.deliveryExperienceIncentive) - (internalRow.totalIncentives || (internalRow.capacityIncentive + internalRow.deliveryExperienceIncentive))
        : companyRow.capacityIncentive + companyRow.deliveryExperienceIncentive;
      var grossDiff = internalRow
        ? (companyRow.pricingPerOrder + companyRow.distanceSurcharge + companyRow.capacityIncentive + companyRow.deliveryExperienceIncentive) -
          (internalRow.grossAmount || internalRow.pricingAndDistance + internalRow.totalIncentives)
        : companyRow.pricingPerOrder + companyRow.distanceSurcharge;

      var reasons = [];
      if (!internalRow) {
        reasons.push("لا يوجد صف مطابق في ملف التسوية الداخلي");
      } else {
        if (Math.abs(ordersDiff) > 0.001) {
          reasons.push("اختلاف الطلبات");
        }
        if (Math.abs(distanceDiff) > 0.001) {
          reasons.push("اختلاف المسافة");
        }
        if (Math.abs(incentivesDiff) > 0.001) {
          reasons.push("اختلاف الحوافز");
        }
        if (Math.abs(grossDiff) > 1) {
          reasons.push("اختلاف الإجمالي");
        }
      }

      return {
        riderId: companyRow.riderId,
        fullName: companyRow.fullName,
        register: companyRow.register,
        city: companyRow.city,
        companyRow: companyRow,
        internalRow: internalRow,
        ordersDiff: Number(ordersDiff.toFixed ? ordersDiff.toFixed(2) : ordersDiff),
        distanceDiff: Number(distanceDiff.toFixed ? distanceDiff.toFixed(2) : distanceDiff),
        incentivesDiff: Number(incentivesDiff.toFixed ? incentivesDiff.toFixed(2) : incentivesDiff),
        grossDiff: Number(grossDiff.toFixed ? grossDiff.toFixed(2) : grossDiff),
        matchStatus: reasons.length ? (internalRow ? "different" : "missing_internal") : "matched",
        reasons: reasons,
      };
    });
  }

  function matchCompanyVsInternal(companyRows, internalRows) {
    var items = buildComparisonRows(companyRows, internalRows);
    return {
      items: items,
      summary: {
        total: items.length,
        matched: items.filter(function (item) { return item.matchStatus === "matched"; }).length,
        different: items.filter(function (item) { return item.matchStatus === "different"; }).length,
        missingInternal: items.filter(function (item) { return item.matchStatus === "missing_internal"; }).length,
      },
    };
  }

  function prorateMonthlyAmount(amount, daysWorked, monthDays) {
    if (!amount || !daysWorked || !monthDays) {
      return 0;
    }
    return Number(((amount * daysWorked) / monthDays).toFixed(2));
  }

  function buildFinalMonthlySettlement(context) {
    var month = cleanText(context.month);
    var monthDays = context.monthDays || getMonthDays(month);
    var city = context.city || "";
    var companyRows = context.companyCouriers || [];
    var comparisonRows = context.comparison && context.comparison.items ? context.comparison.items : [];
    var comparisonMap = new Map(comparisonRows.map(function (item) {
      return [buildMatchKey(item.register, item.riderId, item.companyRow && item.companyRow.iqama), item];
    }));

    var fr3plMap = new Map((context.internal && context.internal.fr3pl || []).map(function (item) {
      return [buildMatchKey(item.register, item.riderId, item.iqama), item];
    }));
    var vdaReportMap = new Map((context.internal && context.internal.vdaReport || []).map(function (item) {
      return [buildMatchKey(item.register, item.riderId, item.iqama), item];
    }));
    var shortVdaMap = new Map((context.internal && context.internal.shortVda || []).map(function (item) {
      return [buildMatchKey(item.register, item.riderId, item.iqama), item];
    }));
    var deliveryMap = new Map((context.internal && context.internal.deliveryExperience || []).map(function (item) {
      return [buildMatchKey(item.register, item.riderId, item.iqama), item];
    }));

    var rows = companyRows
      .filter(function (companyRow) {
        return !city || !companyRow.city || companyRow.city === city;
      })
      .map(function (companyRow) {
        var comparison = comparisonMap.get(buildMatchKey(companyRow.register, companyRow.riderId, companyRow.iqama)) || null;
        var internalRow = comparison ? comparison.internalRow : null;
        var fr3pl = fr3plMap.get(buildMatchKey(companyRow.register, companyRow.riderId, companyRow.iqama)) || null;
        var vdaReport = vdaReportMap.get(buildMatchKey(companyRow.register, companyRow.riderId, companyRow.iqama)) || null;
        var shortVda = shortVdaMap.get(buildMatchKey(companyRow.register, companyRow.riderId, companyRow.iqama)) || null;
        var delivery = deliveryMap.get(buildMatchKey(companyRow.register, companyRow.riderId, companyRow.iqama)) || null;

        var isValid = companyRow.isValid;
        if (vdaReport && vdaReport.status) {
          isValid = isValid && normalizeHeader(vdaReport.targetState || "تحقق").indexOf("تحقق") >= 0;
        }

        var deliveredOrders = companyRow.deliveredOrders;
        var deliveryDistance = companyRow.deliveryDistance;
        var pricingPerOrder = companyRow.pricingPerOrder;
        var distanceSurcharge = companyRow.distanceSurcharge;
        var pricingAndDistance = pricingPerOrder + distanceSurcharge;
        var capacityIncentive = isValid ? companyRow.capacityIncentive : 0;
        var experienceIncentive = isValid ? companyRow.deliveryExperienceIncentive : 0;
        var totalIncentives = capacityIncentive + experienceIncentive;
        var deduction = Math.abs(companyRow.deduction || 0);
        var foodCompensation = companyRow.foodCompensation || 0;
        var loans = fr3pl ? fr3pl.loans || 0 : 0;
        var violations = fr3pl ? fr3pl.violations || 0 : 0;
        var daysWorked = fr3pl && fr3pl.daysWorked ? fr3pl.daysWorked : (companyRow.validDays || (vdaReport ? vdaReport.totalWorkingDays : 0));
        var vehicleTypeText = cleanText(companyRow.vehicle);
        var normalizedVehicleType = normalizeHeader(vehicleTypeText).indexOf("دراجة") >= 0 || normalizeHeader(vehicleTypeText).indexOf("bike") >= 0 || normalizeHeader(vehicleTypeText).indexOf("دباب") >= 0
          ? "bike"
          : "car";
        var commission = prorateMonthlyAmount(2500, daysWorked, monthDays);
        var rent = prorateMonthlyAmount(normalizedVehicleType === "bike" ? 800 : 1800, daysWorked, monthDays);
        var housing = prorateMonthlyAmount(200, daysWorked, monthDays);
        var totalDeductions = Number((deduction + loans + violations + rent + housing).toFixed(2));
        var grossDue = Number((pricingAndDistance + totalIncentives + foodCompensation + commission).toFixed(2));
        var net = Number((grossDue - totalDeductions).toFixed(2));

        return {
          "المدينة": city || companyRow.city || (shortVda ? shortVda.city : ""),
          "الشهر": month,
          "السجل": companyRow.register,
          "معرف الشريك": companyRow.partnerId,
          "اسم الشريك": companyRow.partnerName,
          "المعرف": companyRow.riderId,
          "الاسم بالكامل": companyRow.fullName,
          "رقم الهوية / الإقامة": companyRow.iqama || (fr3pl ? fr3pl.iqama : ""),
          "رقم الهاتف": fr3pl ? fr3pl.phone : (vdaReport ? vdaReport.phone : ""),
          "المركبة": companyRow.vehicle,
          "نوع المركبة": fr3pl ? fr3pl.vehicleType : vehicleTypeText,
          "نوع البديل": fr3pl ? fr3pl.replacementType : (vdaReport ? vdaReport.replacementType : ""),
          "الحالة": vdaReport ? vdaReport.status : (internalRow ? internalRow.status : ""),
          "صالح": isValid ? "صالح" : "غير صالح",
          "السبب": companyRow.reason || (internalRow ? internalRow.reason : ""),
          "أيام العمل": daysWorked,
          "أيام الاتصال-صالحة": companyRow.validDays,
          "ساعات الاتصال اليومية": companyRow.onlineHours,
          "الطلبات المُسلمة": deliveredOrders,
          "مسافة التوصيل": deliveryDistance,
          "التسعير حسب الطلب": pricingPerOrder,
          "المسافة من ارتفاع السعر": distanceSurcharge,
          "التسعير + المسافة": pricingAndDistance,
          "حوافز سعة الطلب المتاحة الصالحة": capacityIncentive,
          "حوافز تجربة التوصيل": experienceIncentive,
          "اجمالي الحوافز": totalIncentives,
          "الخصم": deduction,
          "تعويض الطعام": foodCompensation,
          "السلف": loans,
          "المخالفات": violations,
          "العمولة": commission,
          "إيجار المركبة": rent,
          "السكن": housing,
          "إجمالي الخصومات": totalDeductions,
          "إجمالي الاستحقاق": grossDue,
          "الصافي": net,
          "المصدر": "company_invoice_with_internal_enrichment",
          "حالة المطابقة": comparison ? comparison.matchStatus : "missing_internal",
          "فرق الطلبات": comparison ? comparison.ordersDiff : deliveredOrders,
          "فرق المسافة": comparison ? comparison.distanceDiff : deliveryDistance,
          "فرق الحوافز": comparison ? comparison.incentivesDiff : totalIncentives,
          "فرق الصافي": comparison ? comparison.grossDiff : grossDue,
          "ملاحظات المطابقة": comparison ? comparison.reasons.join(" | ") : "لا يوجد صف داخلي مطابق",
          "مستوى تجربة التوصيل": delivery ? delivery.currentLevel : companyRow.experienceLevel,
          "المكافأة التقديرية": delivery ? delivery.estimatedBonusAmount : companyRow.estimatedBonusAmount,
        };
      });

    return {
      rows: rows,
      summary: {
        total: rows.length,
        totalOrders: rows.reduce(function (sum, row) { return sum + toNumber(row["الطلبات المُسلمة"]); }, 0),
        totalDistance: rows.reduce(function (sum, row) { return sum + toNumber(row["مسافة التوصيل"]); }, 0),
        totalNet: rows.reduce(function (sum, row) { return sum + toNumber(row["الصافي"]); }, 0),
        valid: rows.filter(function (row) { return row["صالح"] === "صالح"; }).length,
        invalid: rows.filter(function (row) { return row["صالح"] !== "صالح"; }).length,
      },
    };
  }

  function validateMonthlyClosing(context) {
    var warnings = [];
    var selectedCity = cleanText(context.city);
    var finalAvailableDate = FormulaEngine.parseDateLike(context.finalAvailableDate);
    var today = context.today || new Date();
    if (finalAvailableDate && today < finalAvailableDate) {
      warnings.push({
        severity: "warning",
        code: "reports_may_not_be_final",
        message: "التقارير النهائية قد لا تكون مكتملة بعد.",
        suggestion: "انتظر حتى " + cleanText(context.finalAvailableDate) + " أو استخدم النتائج كمعاينة فقط.",
      });
    }

    if (!context.companyCouriers || !context.companyCouriers.length) {
      warnings.push({
        severity: "error",
        code: "missing_company_couriers",
        message: "لا توجد تفاصيل سائقين من فواتير الشركة.",
        suggestion: "ارفع ملفي الشركة الأصليين Express و Albwaba.",
      });
    }

    if (!context.internal || (!context.internal.express.length && !context.internal.albwaba.length)) {
      warnings.push({
        severity: "error",
        code: "missing_internal_settlement",
        message: "لا يوجد ملف تسوية داخلي صالح للتحليل.",
        suggestion: "ارفع ملف التسوية الداخلي النهائي.",
      });
    }

    var cities = FormulaEngine.unique(
      []
        .concat(context.companyCouriers || [])
        .concat(context.internal ? context.internal.shortVda : [])
        .map(function (item) { return cleanText(item.city || item["المدينة"] || ""); })
        .filter(Boolean)
    );
    if (selectedCity && cities.some(function (city) { return city && city !== selectedCity; })) {
      warnings.push({
        severity: "error",
        code: "city_mix_detected",
        message: "تم اكتشاف بيانات من أكثر من مدينة داخل نفس دورة الإقفال.",
        suggestion: "افصل بيانات " + selectedCity + " عن أي مدينة أخرى قبل الاعتماد النهائي.",
      });
    }

    if (context.status === "Locked" && !(context.settlement && context.settlement.rows && context.settlement.rows.length)) {
      warnings.push({
        severity: "error",
        code: "lock_without_settlement",
        message: "لا يمكن اعتبار الشهر مقفلاً بدون بناء Settlement.",
        suggestion: "ابنِ التسوية النهائية أولاً ثم نفذ Lock.",
      });
    }

    return warnings;
  }

  function toCsv(rows, preferredOrder) {
    var list = rows || [];
    if (!list.length) {
      return "";
    }
    var headers = preferredOrder && preferredOrder.length ? preferredOrder : Object.keys(list[0]);
    var escapeCell = function (value) {
      var text = String(value == null ? "" : value);
      if (text.indexOf('"') >= 0) {
        text = text.replace(/"/g, '""');
      }
      if (/[,"\n]/.test(text)) {
        return '"' + text + '"';
      }
      return text;
    };
    return [
      headers.join(","),
    ].concat(
      list.map(function (row) {
        return headers.map(function (header) {
          return escapeCell(row[header]);
        }).join(",");
      })
    ).join("\n");
  }

  function exportMonthlyReports(context) {
    var settlement = context.settlement || { rows: [] };
    var comparison = context.comparison || { items: [] };
    var companyCouriers = context.companyCouriers || [];
    var files = [
      {
        fileName: "monthly_company_couriers.csv",
        mimeType: "text/csv;charset=utf-8",
        content: toCsv(companyCouriers),
      },
      {
        fileName: "monthly_matching_report.csv",
        mimeType: "text/csv;charset=utf-8",
        content: toCsv(comparison.items.map(function (item) {
          return {
            riderId: item.riderId,
            fullName: item.fullName,
            register: item.register,
            matchStatus: item.matchStatus,
            ordersDiff: item.ordersDiff,
            distanceDiff: item.distanceDiff,
            incentivesDiff: item.incentivesDiff,
            grossDiff: item.grossDiff,
            reasons: item.reasons.join(" | "),
          };
        })),
      },
      {
        fileName: "final_monthly_settlement.csv",
        mimeType: "text/csv;charset=utf-8",
        content: toCsv(settlement.rows),
      },
      {
        fileName: "monthly_closing_summary.json",
        mimeType: "application/json;charset=utf-8",
        content: JSON.stringify({
          city: context.city,
          month: context.month,
          status: context.status,
          validationWarnings: context.validationWarnings || [],
          settlementSummary: settlement.summary || {},
          matchingSummary: comparison.summary || {},
        }, null, 2),
      },
    ];
    return files;
  }

  function buildMonthlyArchive(context) {
    var month = cleanText(context.month || "unknown-month");
    var cityLabel = cleanText(context.city || "Unknown");
    var exports = exportMonthlyReports(context);
    return {
      root: "monthly_archive/" + month + "/" + cityLabel + "/",
      folders: [
        "source_reports",
        "normalized_data",
        "matching_reports",
        "settlement",
        "exports",
        "logs",
      ],
      files: exports,
      logEntries: [
        "Status: " + cleanText(context.status || "Open"),
        "Company courier rows: " + ((context.companyCouriers && context.companyCouriers.length) || 0),
        "Internal rows: " + (((context.internal && context.internal.express.length) || 0) + ((context.internal && context.internal.albwaba.length) || 0)),
        "Settlement rows: " + (((context.settlement && context.settlement.rows.length) || 0)),
      ],
    };
  }

  return {
    MonthlyClosingEngine: {
      detectMonthlyFileType: detectMonthlyFileType,
      normalizeCompanyPartnerInvoice: normalizeCompanyPartnerInvoice,
      normalizeCompanyCourierInvoice: normalizeCompanyCourierInvoice,
      normalizeInternalSettlementWorkbook: normalizeInternalSettlementWorkbook,
      normalizeFr3plSettlement: normalizeFr3plSettlement,
      normalizeExpressSettlement: normalizeExpressSettlement,
      normalizeAlbwabaSettlement: normalizeAlbwabaSettlement,
      normalizeVdaReport: normalizeVdaReport,
      normalizeShortVda: normalizeShortVda,
      normalizeDeliveryExperience: normalizeDeliveryExperience,
      normalizeCompanyDailyVdaRows: normalizeCompanyDailyVdaRows,
      normalizeFaceRecognitionWorkbook: normalizeFaceRecognitionWorkbook,
      matchCompanyVsInternal: matchCompanyVsInternal,
      buildFinalMonthlySettlement: buildFinalMonthlySettlement,
      buildMonthlyArchive: buildMonthlyArchive,
      validateMonthlyClosing: validateMonthlyClosing,
      exportMonthlyReports: exportMonthlyReports,
    },
  };
});
