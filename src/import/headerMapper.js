(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.HeaderMapper = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeHeader = ImportTypes.normalizeHeader;
  var normalizeKey = ImportTypes.normalizeKey;
  var normalizeText = ImportTypes.normalizeText;
  var unique = ImportTypes.unique;

  var FIELD_ALIASES = {
    userId: [
      "user id", "user_id", "userid", "rider id", "courier id", "driver id",
      "معرف", "معرّف السائق", "معرف السائق", "ايدي", "رقم اليوزر", "رقم السائق", "المعرف", "معرّف سائق التوصيل"
    ],
    iqama: [
      "iqama", "id number", "national id", "هوية", "رقم الهوية", "الإقامة", "رقم الإقامة",
      "رقم بطاقة الهوية", "رقم اقامة المندوب", "iqama number"
    ],
    ownerIqama: [
      "owner iqama", "owner id number", "Ø±Ù‚Ù… Ø¥Ù‚Ø§Ù…Ø© ØµØ§Ø­Ø¨ Ø§Ù„ÙŠÙˆØ²Ø±", "Ø±Ù‚Ù… Ø§Ù‚Ø§Ù…Ø© ØµØ§Ø­Ø¨ Ø§Ù„ÙŠÙˆØ²Ø±"
    ],
    actualRiderIqama: [
      "actual rider iqama", "actual rider id", "used rider iqama",
      "Ø±Ù‚Ù… Ø¥Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§",
      "Ø±Ù‚Ù… Ø§Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§"
    ],
    fullName: [
      "name", "rider name", "courier name", "driver name", "full name",
      "الاسم", "اسم المندوب", "اسم السائق", "الاسم بالكامل", "اسم صاحب الايدي", "الإسم بالكامل"
    ],
    ownerName: [
      "owner name", "dashboard owner name", "Ø§Ø³Ù… ØµØ§Ø­Ø¨ Ø§Ù„ÙŠÙˆØ²Ø±"
    ],
    actualRiderName: [
      "actual rider name", "used rider name", "Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§"
    ],
    personalName: [
      "first name", "given name", "personal name", "الاسم الشخصي"
    ],
    familyName: [
      "last name", "family name", "surname", "اسم العائلة"
    ],
    phone: [
      "phone", "phone number", "mobile", "mobile number", "رقم الهاتف", "الجوال", "رقم الجوال",
      "رقم جوال التواصل", "رقم التواصل"
    ],
    actualRiderPhone: [
      "actual rider phone", "used rider phone", "Ø±Ù‚Ù… Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„ÙØ¹Ù„ÙŠ"
    ],
    appPhone: [
      "app phone", "application phone", "Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù„Ù„Ù…Ù†Ø¯ÙˆØ¨"
    ],
    email: [
      "email", "email address", "e-mail", "البريد الإلكتروني"
    ],
    gasCard: [
      "gas card", "fuel card", "ÙƒØ§Ø±Øª Ø¨Ù†Ø²ÙŠÙ†"
    ],
    tools: [
      "tools", "handover tools", "Ø¹Ù‡Ø¯Ø© Ø§Ù„Ø§Ø¯ÙˆØ§Øª"
    ],
    vehicleType: [
      "vehicle", "vehicle type", "vehicle serial", "plate", "car", "bike",
      "المركبة", "نوع المركبة", "رقم اللوحة", "الرقم التسلسلي", "نوع التسجيل"
    ],
    vehicleSerial: [
      "vehicle serial", "vehicle sequence number", "serial", "vin", "chassis",
      "الرقم التسلسلي", "رقم اللوحة", "vehicle id"
    ],
    dashboardVehicle: [
      "dashboard vehicle", "registered vehicle", "Ø§Ù„Ù…Ø±ÙƒØ¨Ø© Ø§Ù„Ù…Ø³Ø¬Ù„Ø© Ø¹Ù„Ù‰ Ø§Ù„ÙŠÙˆØ²Ø±"
    ],
    actualVehicle: [
      "actual vehicle", "used vehicle", "Ø§Ù„Ù…Ø±ÙƒØ¨Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙØ¹Ù„ÙŠØ§"
    ],
    plateNumber: [
      "plate number", "new plate number", "vehicle plate number", "plate",
      "رقم اللوحة", "اللوحة الجديدة", "vehicle license plate number"
    ],
    registrationType: [
      "registration type", "new registration type", "vehicle registration type",
      "نوع التسجيل", "نوع التسجيل الجديد", "نوع التسجيل الجديد "
    ],
    brand: [
      "brand", "vehicle brand", "الماركة"
    ],
    model: [
      "model", "trim", "الطراز"
    ],
    opc: [
      "opc"
    ],
    registerOwner: [
      "register owner", "owner register", "السجل المالك"
    ],
    brandName: [
      "brand name", "registry name", "اسم المنشأة (إنجليزي)"
    ],
    availableRegistersText: [
      "available registers", "available registers text", "السجلات المتاحه للاستخدام", "السجلات المتاحة للاستخدام"
    ],
    currentBoundingAccounts: [
      "current bounding accounts"
    ],
    usedByPartnerName: [
      "used by how name partner"
    ],
    currentBranch: [
      "current branch", "الفرع", "branche"
    ],
    currentCity: [
      "current city", "city of use", "مدينة المركبة الفعلية"
    ],
    targetedBranch: [
      "targeted branch", "targeted register", "السجل المستهدف"
    ],
    usedInCityCount: [
      "in how many city is it used?"
    ],
    cityAndBranch: [
      "city & pranch", "city & branch"
    ],
    accountsRegisteredOnVehicle: [
      "accounts registered on the vehicle"
    ],
    iqama1: ["iqama 1"],
    iqama2: ["iqama 2"],
    iqama3: ["iqama 3"],
    iqama4: ["iqama 4"],
    movementStatus: [
      "vehicle movement status", "movement status"
    ],
    branch: [
      "branch", "الفرع"
    ],
    newPlateNumber: [
      "new plate number", "اللوحة الجديدة"
    ],
    movementActionType: [
      "movement action type", "transaction type", "نوع تم"
    ],
    newRegistrationType: [
      "new registration type", "نوع التسجيل الجديد"
    ],
    manufactureYear: [
      "manufacture year", "year", "سنة الصنع"
    ],
    chassisNumber: [
      "chassis number", "frame number", "رقم الهيكل"
    ],
    primaryColor: [
      "primary color", "اللون الأساسي"
    ],
    delegatedPersonName: [
      "delegated person name", "delegate name", "اسم المفوض"
    ],
    delegatedPhone: [
      "delegated phone", "authorization phone", "رقم الجوال بالتفويض"
    ],
    authorizationStartDate: [
      "authorization start date", "delegation start date", "تاريخ بداية التفويض"
    ],
    authorizationEndDate: [
      "authorization end date", "delegation end date", "تاريخ نهاية التفويض"
    ],
    movementStatusSecondary: [
      "secondary movement status", "الحالة 2"
    ],
    movementFlagD: [
      "d"
    ],
    delegatedIqama: [
      "delegated iqama", "رقم إقامة المفوض"
    ],
    currentUserIqama: [
      "current user iqama", "رقم اقامة المستخدم"
    ],
    currentUserName: [
      "current user name", "الإسم", "اسم المستخدم"
    ],
    currentUserPhone: [
      "current user phone", "رقم جوال المستخدم"
    ],
    riderType: [
      "rider type", "نوع المندوب"
    ],
    receiptDate: [
      "receipt date", "تاريخ الإستلام", "تاريخ الاستلام"
    ],
    status: [
      "status", "employment status", "job status", "activation status", "الحالة", "حالة اليوزر",
      "حالة الوظيفة", "حالة التفعيل", "operating status"
    ],
    reviewStatus: [
      "review status", "status review", "حالة المراجعة"
    ],
    documentChangeStatus: [
      "document change status", "حالة تغيير الوثيقة"
    ],
    city: [
      "city", "branch", "operation city", "operations city", "current city", "المدينة",
      "مدينة الاستخدام", "current city", "مدينة المركبة الفعلية", "city of use"
    ],
    register: [
      "register", "dashboard", "company", "branch register", "السجل",
      "الشركة", "الداشبورد", "الرقم المسجل", "اسم السجل", "3pl name"
    ],
    month: [
      "month", "billing month", "month key", "الشهر"
    ],
    sourceTimestamp: [
      "timestamp", "submission timestamp"
    ],
    date: [
      "date", "day", "online day", "first online date", "التاريخ", "تاريخ التعين"
    ],
    assignmentStartDate: [
      "assignment start date", "start assignment date", "ØªØ§Ø±ÙŠØ® Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„ØªØ³ÙƒÙŠÙ†"
    ],
    riderReceiveDate: [
      "rider receive date", "handover date", "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… Ù„Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…"
    ],
    firstOnlineDate: [
      "first online date", "first working date", "ØªØ§Ø±ÙŠØ® Ø£ÙˆÙ„ ÙŠÙˆÙ… Ø¹Ù…Ù„ Ù„Ù„Ø£ÙŠØ¯ÙŠ"
    ],
    platform: [
      "platform", "service", "delivery platform", "المنصة", "التطبيق"
    ],
    workMode: [
      "work mode", "working mode", "settlement mode", "payment mode", "work type", "نوع العمل", "نوع التشغيل", "نظام التسوية"
    ],
    operationMode: [
      "operation mode", "assignment mode", "Ù†ÙˆØ¹ Ø§Ù„ØªØ´ØºÙŠÙ„: Ø±Ø§ØªØ¨ / Ø¨Ø§Ù„Ø·Ù„Ø¨ / Ø®Ø§Ø±Ø¬ÙŠ / Ø¨Ø¯ÙŠÙ„", "Ù†ÙˆØ¹ Ø§Ù„ØªØ´ØºÙŠÙ„"
    ],
    assignmentStatus: [
      "assignment status", "operation status", "Ø­Ø§Ù„Ø© Ø§Ù„ØªØ³ÙƒÙŠÙ†: Ù†Ø´Ø· / Ù…ÙˆÙ‚ÙˆÙ / ØªØ¨Ø¯ÙŠÙ„ / Ø¥Ù‚Ø§Ù„Ø©", "Ø­Ø§Ù„Ø© Ø§Ù„ØªØ³ÙƒÙŠÙ†"
    ],
    qualificationType: [
      "qualification type", "courier qualification type", "نوع تأهيل سائق التوصيل"
    ],
    settlementMode: [
      "settlement mode", "وضع التسوية"
    ],
    licenseType: [
      "license type", "driver's card type", "نوع الرخصة", "نوع البطاقة"
    ],
    driverCard: [
      "driver card", "بطاقة السائق"
    ],
    deliveredTasks: [
      "delivered tasks", "sum of total delivered tasks", "delivered orders",
      "الطلبات المسلمة", "المهام التي تم تسليمها", "عدد طلبات"
    ],
    completedOrders: [
      "completed orders", "completed tasks", "successful orders", "الطلبات المكتملة", "الطلبات المنجزة"
    ],
    cancelledOrders: [
      "cancelled orders", "canceled orders", "cancel count", "cancellations", "الالغاءات", "الإلغاءات", "الإلغاء"
    ],
    rejectedOrders: [
      "rejected orders", "reject count", "rejections", "driver reject", "auto reject", "الرفض", "طلبات مرفوضة"
    ],
    workingHours: [
      "working hours", "shift working hours", "online duration", "ساعات العمل", "عدد ساعات العمل"
    ],
    onlineHours: [
      "shift online hours", "online hours", "ساعات الاتصال", "ساعات الاتصال في وقت الذروة"
    ],
    attendanceStatus: [
      "attendance", "attendance status", "الحضور", "حالة الحضور"
    ],
    ataScore: [
      "ata", "ata score", "delivery on-time rate", "on time rate", "معدل التوصيل في الموعد", "هدف ata"
    ],
    lateCount: [
      "late count", "late deliveries", "تاخير", "تأخير", "عدد التأخيرات"
    ],
    cancellationRate: [
      "cancellation rate", "cancel rate", "نسبة الإلغاء", "نسبه الالغاء"
    ],
    vda: ["vda", "فرق التارجت", "should online days"],
    iban: ["iban", "الايبان", "رقم الايبان البنكي", "رقم الايبان البنكي "],
    partnerId: ["partner id", "3pl id", "معرف الشريك"],
    partnerName: ["partner name", "3pl name", "اسم الشريك"],
    notes: ["note", "notes", "please note", "remarks", "ملحوظات", "ملاحظات", "يرجى ملاحظة"]
  };

  FIELD_ALIASES.nationality = ["nationality", "Ø§Ù„Ø¬Ù†Ø³ÙŠØ©"];
  FIELD_ALIASES.supervisor = ["supervisor", "Ø§Ù„Ù…Ø´Ø±Ù"];

  FIELD_ALIASES.userId = (FIELD_ALIASES.userId || []).concat([
    "courier id / user id",
    "user id / courier id"
  ]);
  FIELD_ALIASES.ownerIqama = (FIELD_ALIASES.ownerIqama || []).concat([
    "owneriqama",
    "رقم إقامة صاحب اليوزر",
    "رقم اقامة صاحب اليوزر"
  ]);
  FIELD_ALIASES.actualRiderIqama = (FIELD_ALIASES.actualRiderIqama || []).concat([
    "actualrideriqama",
    "رقم إقامة المندوب المستخدم فعليًا",
    "رقم اقامة المندوب المستخدم فعليا"
  ]);
  FIELD_ALIASES.ownerName = (FIELD_ALIASES.ownerName || []).concat([
    "\u0627\u0633\u0645 \u0635\u0627\u062d\u0628 \u0627\u0644\u064a\u0648\u0632\u0631"
  ]);
  FIELD_ALIASES.actualRiderName = (FIELD_ALIASES.actualRiderName || []).concat([
    "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u0639\u0644\u064a\u064b\u0627",
    "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u0639\u0644\u064a\u0627"
  ]);
  FIELD_ALIASES.actualRiderPhone = (FIELD_ALIASES.actualRiderPhone || []).concat([
    "\u0631\u0642\u0645 \u062c\u0648\u0627\u0644 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0641\u0639\u0644\u064a"
  ]);
  FIELD_ALIASES.riderType = (FIELD_ALIASES.riderType || []).concat([
    "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062f\u0648\u0628",
    "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062f\u0648\u0628: \u0643\u0641\u0627\u0644\u0629 / \u062e\u0627\u0631\u062c\u064a",
    "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 / \u0646\u0648\u0639 \u0627\u0644\u0628\u062f\u064a\u0644"
  ]);
  FIELD_ALIASES.assignmentStartDate = (FIELD_ALIASES.assignmentStartDate || []).concat([
    "\u062a\u0627\u0631\u064a\u062e \u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646"
  ]);
  FIELD_ALIASES.riderReceiveDate = (FIELD_ALIASES.riderReceiveDate || []).concat([
    "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0644\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645"
  ]);
  FIELD_ALIASES.firstOnlineDate = (FIELD_ALIASES.firstOnlineDate || []).concat([
    "\u062a\u0627\u0631\u064a\u062e \u0623\u0648\u0644 \u064a\u0648\u0645 \u0639\u0645\u0644 \u0644\u0644\u0623\u064a\u062f\u064a"
  ]);
  FIELD_ALIASES.operationMode = (FIELD_ALIASES.operationMode || []).concat([
    "\u0646\u0648\u0639 \u0627\u0644\u062a\u0634\u063a\u064a\u0644",
    "\u0646\u0648\u0639 \u0627\u0644\u062a\u0634\u063a\u064a\u0644: \u0631\u0627\u062a\u0628 / \u0628\u0627\u0644\u0637\u0644\u0628 / \u062e\u0627\u0631\u062c\u064a / \u0628\u062f\u064a\u0644"
  ]);
  FIELD_ALIASES.assignmentStatus = (FIELD_ALIASES.assignmentStatus || []).concat([
    "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646",
    "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646: \u0646\u0634\u0637 / \u0645\u0648\u0642\u0648\u0641 / \u062a\u0628\u062f\u064a\u0644 / \u0625\u0642\u0627\u0644\u0629"
  ]);
  FIELD_ALIASES.vehicleType = unique([
    "vehicle",
    "vehicle type",
    "car",
    "bike",
    "\u0627\u0644\u0645\u0631\u0643\u0628\u0629",
    "\u0646\u0648\u0639 \u0627\u0644\u0645\u0631\u0643\u0628\u0629",
    "\u0646\u0648\u0639 \u0627\u0644\u062a\u0633\u062c\u064a\u0644",
    "المركبة",
    "نوع المركبة",
    "نوع التسجيل"
  ]);

  var FIELD_INDEX = buildAliasIndex(FIELD_ALIASES);

  function buildAliasIndex(aliasMap) {
    var index = {};
    Object.keys(aliasMap).forEach(function (fieldName) {
      aliasMap[fieldName].forEach(function (alias) {
        index[normalizeKey(alias)] = fieldName;
      });
    });
    return index;
  }

  function resolveFieldName(header) {
    var key = normalizeKey(header);
    return FIELD_INDEX[key] || "";
  }

  function mapHeaders(headers, requiredFields) {
    var byField = {};
    var byHeader = {};
    var normalizedHeaders = (headers || []).map(function (header) {
      return normalizeText(header);
    });
    normalizedHeaders.forEach(function (header) {
      var fieldName = resolveFieldName(header);
      if (!fieldName) {
        return;
      }
      if (!byField[fieldName]) {
        byField[fieldName] = header;
      }
      byHeader[header] = fieldName;
    });
    var missingRequired = (requiredFields || []).filter(function (fieldName) {
      return !byField[fieldName];
    });
    var mappedFields = Object.keys(byField);
    return {
      headers: normalizedHeaders,
      byField: byField,
      byHeader: byHeader,
      mappedFields: mappedFields,
      mappedCount: mappedFields.length,
      coverage: normalizedHeaders.length ? mappedFields.length / normalizedHeaders.length : 0,
      missingRequired: missingRequired,
      unknownHeaders: normalizedHeaders.filter(function (header) {
        return !byHeader[header];
      })
    };
  }

  function scoreHeaderRow(cells) {
    var row = (cells || []).map(normalizeText).filter(Boolean);
    if (!row.length) {
      return { score: 0, mappedCount: 0, coverage: 0 };
    }
    var mapping = mapHeaders(row);
    var shortCells = row.filter(function (value) { return value.length <= 40; }).length;
    var score = (mapping.mappedCount * 12) + shortCells;
    return {
      score: score,
      mappedCount: mapping.mappedCount,
      coverage: mapping.coverage,
      mapping: mapping
    };
  }

  function findHeaderRow(matrix, options) {
    options = options || {};
    var maxRows = Number(options.maxRows) || 12;
    var best = {
      headerRowIndex: -1,
      headers: [],
      mapping: mapHeaders([]),
      score: 0
    };
    (matrix || []).slice(0, maxRows).forEach(function (row, index) {
      var result = scoreHeaderRow(row);
      if (result.score > best.score || (result.score === best.score && result.mappedCount > best.mapping.mappedCount)) {
        best = {
          headerRowIndex: index,
          headers: (row || []).map(normalizeText),
          mapping: result.mapping,
          score: result.score
        };
      }
    });
    if (best.headerRowIndex < 0) {
      best.headerRowIndex = 0;
      best.headers = matrix && matrix[0] ? matrix[0].map(normalizeText) : [];
      best.mapping = mapHeaders(best.headers);
    }
    return best;
  }

  function rowsFromMatrix(matrix, headerRowIndex) {
    var rows = [];
    var headers = (matrix && matrix[headerRowIndex] ? matrix[headerRowIndex] : []).map(function (value, columnIndex) {
      var normalized = normalizeText(value);
      return normalized || ("Column " + (columnIndex + 1));
    });
    (matrix || []).slice((headerRowIndex || 0) + 1).forEach(function (cells) {
      var record = {};
      headers.forEach(function (header, columnIndex) {
        record[header] = cells && cells[columnIndex] != null ? cells[columnIndex] : "";
      });
      if (Object.keys(record).some(function (key) { return normalizeText(record[key]); })) {
        rows.push(record);
      }
    });
    return {
      headers: headers,
      rows: rows
    };
  }

  function getValue(row, mapping, fieldName) {
    if (!row || !mapping || !mapping.byField || !fieldName) {
      return "";
    }
    var header = mapping.byField[fieldName];
    return header ? row[header] : "";
  }

  function listFields() {
    return unique(Object.keys(FIELD_ALIASES));
  }

  return {
    FIELD_ALIASES: FIELD_ALIASES,
    findHeaderRow: findHeaderRow,
    getValue: getValue,
    listFields: listFields,
    mapHeaders: mapHeaders,
    resolveFieldName: resolveFieldName,
    rowsFromMatrix: rowsFromMatrix
  };
});
