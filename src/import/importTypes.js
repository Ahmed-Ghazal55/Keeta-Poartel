(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportTypes = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CONFIDENCE_THRESHOLDS = {
    autoDetected: 0.85,
    needsReview: 0.60
  };

  var CITY_DEFINITIONS = [
    { code: "JED", label: "جدة", aliases: ["جدة", "jeddah", "jeddha", "jed", "جده"] },
    { code: "RUH", label: "الرياض", aliases: ["الرياض", "riyadh", "ruh", "رياض"] }
  ];

  var REGISTER_DEFINITIONS = [
    { code: "EXPRESS", label: "EXPRESS GATE Company", aliases: ["express", "express gate", "express gate company", "اكسبريس", "اكسبرس"] },
    { code: "ALBAWABA", label: "Albwaba", aliases: ["albwaba", "albawaba", "al bawwaba", "البوابة", "البوابه", "albawwabah"] },
    { code: "TOGARY", label: "Togary", aliases: ["togary", "al togary", "التجاري", "تجاري"] },
    { code: "PER_ORDER", label: "Per Order", aliases: ["per order", "بالطلب", "perorder"] },
    { code: "FR_3PL", label: "FR 3PL", aliases: ["fr 3pl", "3pl", "fr3pl"] },
    { code: "PER_ORDER_FR3PL", label: "Per Order / FR 3PL", aliases: ["per order / fr 3pl", "per order fr 3pl"] },
    { code: "MULTI", label: "Multiple Registers", aliases: ["multi"] },
    { code: "UNKNOWN", label: "Unknown", aliases: ["unknown"] }
  ];

  var IMPORT_TYPES = [
    createType("hr_master_workbook", "HR Master Workbook", "hrProfiles", "hr", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["hr", "بيانات المناديب", "كفالة", "employees", "البوابة المقبلة", "albwaba", "muqbilah"],
      sheetTerms: [
        "hr",
        "hr express",
        "بيانات المناديب",
        "hr شركة البوابة المقبله",
        "hr اكبريس جايت",
        "hr مؤسسة البوابة",
        "ارشيف البوابه واكسبرس",
        "كروت صحية",
        "رخص النقل",
        "مناديب لم تعمل",
        "بيانات هانجر",
        "امازون",
        "ninja",
        "بيانات جاهز",
        "شفز"
      ],
      headerTerms: [
        "الرقم الوظيفى",
        "رقم الهوية",
        "رقم الاقامة",
        "الاسم",
        "تاريخ التعيين",
        "حالة الكفالة",
        "اسم السجل",
        "نوع الرخصة",
        "بطاقة السائق",
        "ايدي كيتا",
        "employee id",
        "national id",
        "join date",
        "register name",
        "kafala status"
      ]
    }),
    createType("rider_master_workbook", "Rider Master Workbook", "riders", "hr", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["بيانات المناديب", "rider", "drivers", "delegates"],
      sheetTerms: ["بيانات المناديب", "update user"],
      headerTerms: ["رقم اقامة المندوب", "اسم المندوب", "رقم جوال التواصل", "المعرف", "الاسم"]
    }),
    createType("external_riders_workbook", "External Riders Workbook", "externalRiders", "hr", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["external riders", "external rider", "riders external", "Ø®Ø§Ø±Ø¬ÙŠ", "Ø§Ù„Ù…Ù†Ø§Ø¯ÙŠØ¨ Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠØ©"],
      sheetTerms: ["external riders", "external rider", "Ø®Ø§Ø±Ø¬ÙŠ", "riders"],
      headerTerms: ["Timestamp", "Ø±Ù‚Ù… Ø§Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨", "Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨", "Ø±Ù‚Ù… Ø¬ÙˆØ§Ù„ Ø§Ù„ØªÙˆØ§ØµÙ„", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ / Ù†ÙˆØ¹ Ø§Ù„Ø¨Ø¯ÙŠÙ„", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ø±ÙƒØ¨Ø©", "ÙƒØ§Ø±Øª Ø¨Ù†Ø²ÙŠÙ†", "Ø¹Ù‡Ø¯Ø© Ø§Ù„Ø§Ø¯ÙˆØ§Øª", "Ø§Ù„Ø¬Ù†Ø³ÙŠØ©", "Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù„Ù„Ù…Ù†Ø¯ÙˆØ¨", "Ø±Ù‚Ù… Ø§Ù„Ø§ÙŠØ¨Ø§Ù† Ø§Ù„Ø¨Ù†ÙƒÙŠ", "Ø§Ù„Ù…Ø¹Ø±Ù", "Email Address"],
      requiredFields: ["iqama"]
    }),
    createType("external_riders_csv", "External Riders CSV", "externalRiders", "hr", [".csv", ".txt"], {
      fileNameTerms: ["external riders", "external rider", "Ø®Ø§Ø±Ø¬ÙŠ", "riders external"],
      headerTerms: ["Timestamp", "Ø±Ù‚Ù… Ø§Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨", "Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨", "Ø±Ù‚Ù… Ø¬ÙˆØ§Ù„ Ø§Ù„ØªÙˆØ§ØµÙ„", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ / Ù†ÙˆØ¹ Ø§Ù„Ø¨Ø¯ÙŠÙ„", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ø±ÙƒØ¨Ø©", "ÙƒØ§Ø±Øª Ø¨Ù†Ø²ÙŠÙ†", "Ø¹Ù‡Ø¯Ø© Ø§Ù„Ø§Ø¯ÙˆØ§Øª", "Ø§Ù„Ø¬Ù†Ø³ÙŠØ©", "Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù„Ù„Ù…Ù†Ø¯ÙˆØ¨", "Ø±Ù‚Ù… Ø§Ù„Ø§ÙŠØ¨Ø§Ù† Ø§Ù„Ø¨Ù†ÙƒÙŠ", "Ø§Ù„Ù…Ø¹Ø±Ù", "Email Address"],
      requiredFields: ["iqama"]
    }),
    createType("dashboard_users_workbook", "Dashboard Users Workbook", "dashboardUsers", "operations", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["dash", "dashboard", "user", "تشغيل", "بيانات كيتا", "dashboard users", "update user"],
      sheetTerms: ["dashboard", "dash", "بيانات كيتا", "update user", "dashboard users"],
      headerTerms: [
        "courier id",
        "courier qualification type",
        "first name",
        "last name",
        "id number",
        "phone number",
        "email",
        "vehicle",
        "employment status",
        "review status",
        "document change status",
        "please note",
        "settlement mode",
        "operations city",
        "register",
        "معرّف السائق",
        "رقم بطاقة الهوية",
        "رقم الهاتف",
        "المركبة",
        "حالة الوظيفة",
        "السجل",
        "user id",
        "full name",
        "city",
        "company",
        "status",
        "vehicle type"
      ],
      requiredFields: ["userId"]
    }),
    createType("dashboard_users_csv", "Dashboard Users CSV", "dashboardUsers", "operations", [".csv", ".txt", ".json"], {
      fileNameTerms: ["dash", "dashboard", "dash_express", "user", "dashboard users"],
      headerTerms: [
        "courier id",
        "courier qualification type",
        "first name",
        "last name",
        "id number",
        "phone number",
        "email",
        "vehicle",
        "employment status",
        "review status",
        "document change status",
        "please note",
        "settlement mode",
        "operations city",
        "register",
        "معرّف السائق",
        "رقم بطاقة الهوية",
        "رقم الهاتف",
        "المركبة",
        "حالة الوظيفة",
        "السجل",
        "user id",
        "full name",
        "city",
        "company",
        "status",
        "vehicle type"
      ],
      requiredFields: ["userId"]
    }),
    createType("current_assignments_workbook", "Current Assignments Workbook", "assignments", "operations", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["current assignments", "assignments", "assignment", "Ø§Ù„ØªØ³ÙƒÙŠÙ†", "ØªØ³ÙƒÙŠÙ†", "current operations"],
      sheetTerms: ["current assignments", "assignments", "assignment", "Ø§Ù„ØªØ³ÙƒÙŠÙ†"],
      headerTerms: ["Ø§Ù„Ø³Ø¬Ù„", "Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©", "Ø§Ù„ØªØ·Ø¨ÙŠÙ‚", "Courier ID / User ID", "Ø±Ù‚Ù… Ø¥Ù‚Ø§Ù…Ø© ØµØ§Ø­Ø¨ Ø§Ù„ÙŠÙˆØ²Ø±", "Ø§Ø³Ù… ØµØ§Ø­Ø¨ Ø§Ù„ÙŠÙˆØ²Ø±", "Ø±Ù‚Ù… Ø¥Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§", "Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨: ÙƒÙØ§Ù„Ø© / Ø®Ø§Ø±Ø¬ÙŠ", "Ø±Ù‚Ù… Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„ÙØ¹Ù„ÙŠ", "Ù†ÙˆØ¹ Ø§Ù„ØªØ´ØºÙŠÙ„: Ø±Ø§ØªØ¨ / Ø¨Ø§Ù„Ø·Ù„Ø¨ / Ø®Ø§Ø±Ø¬ÙŠ / Ø¨Ø¯ÙŠÙ„", "ØªØ§Ø±ÙŠØ® Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„ØªØ³ÙƒÙŠÙ†", "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… Ù„Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…", "ØªØ§Ø±ÙŠØ® Ø£ÙˆÙ„ ÙŠÙˆÙ… Ø¹Ù…Ù„ Ù„Ù„Ø£ÙŠØ¯ÙŠ", "Ø­Ø§Ù„Ø© Ø§Ù„ØªØ³ÙƒÙŠÙ†: Ù†Ø´Ø· / Ù…ÙˆÙ‚ÙˆÙ / ØªØ¨Ø¯ÙŠÙ„ / Ø¥Ù‚Ø§Ù„Ø©", "Ø§Ù„Ù…Ø±ÙƒØ¨Ø© Ø§Ù„Ù…Ø³Ø¬Ù„Ø© Ø¹Ù„Ù‰ Ø§Ù„ÙŠÙˆØ²Ø±", "Ø§Ù„Ù…Ø±ÙƒØ¨Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙØ¹Ù„ÙŠØ§", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ø±ÙƒØ¨Ø©", "Ø±Ù‚Ù… Ø§Ù„Ù„ÙˆØ­Ø©", "Ø§Ù„Ø±Ù‚Ù… Ø§Ù„ØªØ³Ù„Ø³Ù„ÙŠ", "Ø§Ù„Ù…Ø´Ø±Ù", "Ù…Ù„Ø§Ø­Ø¸Ø§Øª"],
      requiredFields: ["register", "city", "platform", "userId", "actualRiderIqama", "assignmentStartDate"]
    }),
    createType("current_assignments_csv", "Current Assignments CSV", "assignments", "operations", [".csv", ".txt"], {
      fileNameTerms: ["current assignments", "assignments", "assignment", "Ø§Ù„ØªØ³ÙƒÙŠÙ†", "ØªØ³ÙƒÙŠÙ†"],
      headerTerms: ["Ø§Ù„Ø³Ø¬Ù„", "Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©", "Ø§Ù„ØªØ·Ø¨ÙŠÙ‚", "Courier ID / User ID", "Ø±Ù‚Ù… Ø¥Ù‚Ø§Ù…Ø© ØµØ§Ø­Ø¨ Ø§Ù„ÙŠÙˆØ²Ø±", "Ø§Ø³Ù… ØµØ§Ø­Ø¨ Ø§Ù„ÙŠÙˆØ²Ø±", "Ø±Ù‚Ù… Ø¥Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§", "Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨: ÙƒÙØ§Ù„Ø© / Ø®Ø§Ø±Ø¬ÙŠ", "Ø±Ù‚Ù… Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„ÙØ¹Ù„ÙŠ", "Ù†ÙˆØ¹ Ø§Ù„ØªØ´ØºÙŠÙ„: Ø±Ø§ØªØ¨ / Ø¨Ø§Ù„Ø·Ù„Ø¨ / Ø®Ø§Ø±Ø¬ÙŠ / Ø¨Ø¯ÙŠÙ„", "ØªØ§Ø±ÙŠØ® Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„ØªØ³ÙƒÙŠÙ†", "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… Ù„Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…", "ØªØ§Ø±ÙŠØ® Ø£ÙˆÙ„ ÙŠÙˆÙ… Ø¹Ù…Ù„ Ù„Ù„Ø£ÙŠØ¯ÙŠ", "Ø­Ø§Ù„Ø© Ø§Ù„ØªØ³ÙƒÙŠÙ†: Ù†Ø´Ø· / Ù…ÙˆÙ‚ÙˆÙ / ØªØ¨Ø¯ÙŠÙ„ / Ø¥Ù‚Ø§Ù„Ø©", "Ø§Ù„Ù…Ø±ÙƒØ¨Ø© Ø§Ù„Ù…Ø³Ø¬Ù„Ø© Ø¹Ù„Ù‰ Ø§Ù„ÙŠÙˆØ²Ø±", "Ø§Ù„Ù…Ø±ÙƒØ¨Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙØ¹Ù„ÙŠØ§", "Ù†ÙˆØ¹ Ø§Ù„Ù…Ø±ÙƒØ¨Ø©", "Ø±Ù‚Ù… Ø§Ù„Ù„ÙˆØ­Ø©", "Ø§Ù„Ø±Ù‚Ù… Ø§Ù„ØªØ³Ù„Ø³Ù„ÙŠ", "Ø§Ù„Ù…Ø´Ø±Ù", "Ù…Ù„Ø§Ø­Ø¸Ø§Øª"],
      requiredFields: ["register", "city", "platform", "userId", "actualRiderIqama", "assignmentStartDate"]
    }),
    createType("opr_workbook", "OPR Workbook", "riders", "operations", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["opr", "per order"],
      sheetTerms: ["opr", "per order"],
      headerTerms: ["المعرف", "الاسم بالكامل", "رقم بطاقة الهوية", "رقم الهاتف", "المركبة", "الحالة"],
      requiredFields: ["userId"]
    }),
    createType("opr_csv", "OPR CSV", "riders", "operations", [".csv", ".txt"], {
      fileNameTerms: ["opr", "per order"],
      headerTerms: ["المعرف", "الاسم بالكامل", "رقم بطاقة الهوية", "رقم الهاتف", "المركبة", "الحالة"],
      requiredFields: ["userId"]
    }),
    createType("vehicle_workbook", "Vehicle Workbook", "vehicles", "fleet", [".xlsx", ".xls", ".xlsm", ".csv"], {
      fileNameTerms: ["vehicle", "vehicles", "updata_vehicles", "operating vehicles", "vehicle movement", "movement", "مركبة", "المركبة", "الحركة"],
      sheetTerms: ["operating vehicles", "update vehicles", "update branches", "drivers_card", "vehicles", "vehicle movement", "movement", "الحركة"],
      headerTerms: ["رقم اللوحة", "الرقم التسلسلي", "vehicle type", "مدينة المركبة الفعلية", "السجل", "courier_id", "الفرع", "اللوحة الجديدة", "رقم إقامة المفوض"],
      requiredFields: ["vehicleSerial"]
    }),
    createType("performance_daily_csv", "Performance Daily CSV", "performanceDaily", "performance", [".csv", ".txt"], {
      fileNameTerms: ["التقرير اليومي", "daily", "report"],
      headerTerms: ["التاريخ", "معرّف السائق", "المهام التي تم تسليمها", "ساعات الاتصال في وقت الذروة"],
      requiredFields: ["date", "userId"]
    }),
    createType("performance_daily_workbook", "Performance Daily Workbook", "performanceDaily", "performance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["التقرير اليومي", "daily", "report"],
      sheetTerms: ["daily"],
      headerTerms: ["التاريخ", "معرّف السائق", "المهام التي تم تسليمها", "ساعات الاتصال في وقت الذروة"],
      requiredFields: ["date", "userId"]
    }),
    createType("performance_overall_csv", "Performance Overall CSV", "performanceMonthly", "performance", [".csv", ".txt"], {
      fileNameTerms: ["الاداء الكلى", "overall performance", "overall"],
      headerTerms: ["الأداء", "التارجت", "الطلبات", "المعرف"],
      requiredFields: ["userId"]
    }),
    createType("performance_overall_workbook", "Performance Overall Workbook", "performanceMonthly", "performance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["الاداء الكلى", "overall performance", "overall"],
      sheetTerms: ["overall"],
      headerTerms: ["الأداء", "التارجت", "الطلبات", "المعرف"],
      requiredFields: ["userId"]
    }),
    createType("vda_csv", "VDA CSV", "vdaResults", "performance", [".csv", ".txt"], {
      fileNameTerms: ["vda"],
      headerTerms: ["معرّف السائق", "الطلبات المسلمة", "فرق التارجت", "الحالة", "السجل"],
      englishTerms: ["vda", "rider id", "vehicle type"],
      requiredFields: ["userId"]
    }),
    createType("vda_workbook", "VDA Workbook", "vdaResults", "performance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["vda"],
      sheetTerms: ["vda"],
      headerTerms: ["معرّف السائق", "الطلبات المسلمة", "فرق التارجت", "الحالة", "السجل", "rider id", "sum of total delivered tasks"],
      englishTerms: ["vda", "rider id", "3pl name"],
      requiredFields: ["userId"]
    }),
    createType("vda_keeta_csv", "VDA Keeta CSV", "vdaResults", "performance", [".csv", ".txt"], {
      fileNameTerms: ["vda_keeta", "keeta vda"],
      headerTerms: ["3PL Name", "Rider ID", "Vehicle Type", "Sum of total delivered tasks"],
      requiredFields: ["userId"]
    }),
    createType("vda_keeta_workbook", "VDA Keeta Workbook", "vdaResults", "performance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["vda_keeta", "keeta vda"],
      headerTerms: ["3PL Name", "Rider ID", "Vehicle Type", "Sum of total delivered tasks"],
      requiredFields: ["userId"]
    }),
    createType("face_verification_csv", "Face Verification CSV", "faceVerification", "performance", [".csv", ".txt"], {
      fileNameTerms: ["face", "الوجة", "الوجه", "fr full data"],
      headerTerms: ["rider id", "date", "verification", "courier"],
      requiredFields: ["userId"]
    }),
    createType("face_verification_workbook", "Face Verification Workbook", "faceVerification", "performance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["face", "الوجة", "الوجه", "fr full data"],
      sheetTerms: ["partner details", "courier details", "daily"],
      headerTerms: ["face recognition", "rider id", "courier", "verification"],
      requiredFields: ["userId"]
    }),
    createType("delivery_experience_csv", "Delivery Experience CSV", "deliveryExperience", "performance", [".csv", ".txt"], {
      fileNameTerms: ["delivery experience", "تجربة التوصيل"],
      headerTerms: ["معرِّف سائق التوصيل", "المستوى التقديري الحالي", "المبلغ التقديري الحالي للمكافأة"],
      requiredFields: ["userId"]
    }),
    createType("delivery_experience_workbook", "Delivery Experience Workbook", "deliveryExperience", "performance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["delivery experience", "تجربة التوصيل"],
      headerTerms: ["معرِّف سائق التوصيل", "المستوى التقديري الحالي", "المبلغ التقديري الحالي للمكافأة"],
      requiredFields: ["userId"]
    }),
    createType("company_invoice_workbook", "Company Invoice Workbook", "invoiceCourierDetail", "finance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["company", "invoice", "فاتورة", "نظام الشرائح"],
      sheetTerms: ["تفاصيل الشركاء", "تفاصيل سائق التوصيل", "partner details", "courier details"],
      headerTerms: ["معرف الشريك", "اسم الشريك", "دورة الفوترة", "معرّف سائق التوصيل", "اسم سائق التوصيل", "إجمالي المبلغ المستحق"],
      requiredFields: []
    }),
    createType("internal_settlement_workbook", "Internal Settlement Workbook", "internalSettlement", "finance", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["فاتورة كيتا", "settlement", "internal"],
      sheetTerms: ["express", "albwaba", "fr 3pl", "vda", "short vda", "vda_report", "حالة نتيجة تجربة التوصيل"],
      headerTerms: ["المعرف", "اسم صاحب الايدي", "المركبة", "السجل", "الايبان", "المتبقي للتحويل"],
      requiredFields: []
    }),
    createType("monthly_closing_bundle", "Monthly Closing Bundle", "monthlyClosingBatches", "finance", [".json"], {
      fileNameTerms: ["monthly closing", "closing bundle", "bundle"],
      headerTerms: ["month", "city", "register"]
    }),
    createType("shift_schedule_workbook", "Shift Schedule Workbook", "shiftSchedules", "shifts", [".xlsx", ".xls"], {
      fileNameTerms: ["shift", "schedule", "شفت", "شفتات", "scheduler"],
      sheetTerms: ["shift", "schedule"],
      headerTerms: ["shift", "date", "rider id", "time"]
    }),
    createType("shift_schedule_xlsm", "Shift Schedule XLSM", "shiftSchedules", "shifts", [".xlsm"], {
      fileNameTerms: ["shift", "schedule", "شفت", "scheduler"],
      sheetTerms: ["shift", "schedule"],
      headerTerms: ["shift", "date", "rider id", "time"]
    }),
    createType("settings_workbook", "Settings Workbook", "monthlyRules", "settings", [".xlsx", ".xls", ".xlsm"], {
      fileNameTerms: ["settings", "rules", "شروط", "attendance", "incentive"],
      sheetTerms: ["settings", "rules"],
      headerTerms: ["month", "city", "register", "rule", "incentive"]
    }),
    createType("unknown", "Unknown", "", "unknown", [".xlsx", ".xls", ".xlsm", ".csv", ".txt", ".json"], {}),
    createType("zip_reference", "ZIP Reference", "", "unknown", [".zip"], {
      fileNameTerms: ["zip"]
    })
  ];

  var IMPORT_TYPES_BY_ID = IMPORT_TYPES.reduce(function (memo, item) {
    memo[item.id] = item;
    return memo;
  }, {});

  applyImportTypeOverrides("external_riders_workbook", {
    fileNameTerms: [
      "\u062e\u0627\u0631\u062c\u064a",
      "\u0627\u0644\u0645\u0646\u0627\u062f\u064a\u0628 \u0627\u0644\u062e\u0627\u0631\u062c\u064a\u0629"
    ],
    sheetTerms: [
      "\u062e\u0627\u0631\u062c\u064a"
    ],
    headerTerms: [
      "\u0631\u0642\u0645 \u0627\u0642\u0627\u0645\u0629 \u0627\u0644\u0645\u0646\u062f\u0648\u0628",
      "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062f\u0648\u0628",
      "\u0631\u0642\u0645 \u062c\u0648\u0627\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 / \u0646\u0648\u0639 \u0627\u0644\u0628\u062f\u064a\u0644",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0631\u0643\u0628\u0629",
      "\u0643\u0627\u0631\u062a \u0628\u0646\u0632\u064a\u0646",
      "\u0639\u0647\u062f\u0629 \u0627\u0644\u0627\u062f\u0648\u0627\u062a",
      "\u0627\u0644\u062c\u0646\u0633\u064a\u0629",
      "\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644 \u0627\u0644\u0645\u0633\u062c\u0644 \u0628\u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0644\u0644\u0645\u0646\u062f\u0648\u0628",
      "\u0631\u0642\u0645 \u0627\u0644\u0627\u064a\u0628\u0627\u0646 \u0627\u0644\u0628\u0646\u0643\u064a",
      "\u0627\u0644\u0645\u0639\u0631\u0641"
    ]
  });
  applyImportTypeOverrides("external_riders_csv", {
    fileNameTerms: [
      "\u062e\u0627\u0631\u062c\u064a"
    ],
    headerTerms: [
      "\u0631\u0642\u0645 \u0627\u0642\u0627\u0645\u0629 \u0627\u0644\u0645\u0646\u062f\u0648\u0628",
      "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062f\u0648\u0628",
      "\u0631\u0642\u0645 \u062c\u0648\u0627\u0644 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 / \u0646\u0648\u0639 \u0627\u0644\u0628\u062f\u064a\u0644",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0631\u0643\u0628\u0629",
      "\u0643\u0627\u0631\u062a \u0628\u0646\u0632\u064a\u0646",
      "\u0639\u0647\u062f\u0629 \u0627\u0644\u0627\u062f\u0648\u0627\u062a",
      "\u0627\u0644\u062c\u0646\u0633\u064a\u0629",
      "\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644 \u0627\u0644\u0645\u0633\u062c\u0644 \u0628\u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0644\u0644\u0645\u0646\u062f\u0648\u0628",
      "\u0631\u0642\u0645 \u0627\u0644\u0627\u064a\u0628\u0627\u0646 \u0627\u0644\u0628\u0646\u0643\u064a",
      "\u0627\u0644\u0645\u0639\u0631\u0641"
    ]
  });
  applyImportTypeOverrides("current_assignments_workbook", {
    fileNameTerms: [
      "\u0627\u0644\u062a\u0633\u0643\u064a\u0646",
      "\u062a\u0633\u0643\u064a\u0646"
    ],
    sheetTerms: [
      "\u0627\u0644\u062a\u0633\u0643\u064a\u0646"
    ],
    headerTerms: [
      "\u0627\u0644\u0633\u062c\u0644",
      "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
      "\u0627\u0644\u062a\u0637\u0628\u064a\u0642",
      "\u0631\u0642\u0645 \u0625\u0642\u0627\u0645\u0629 \u0635\u0627\u062d\u0628 \u0627\u0644\u064a\u0648\u0632\u0631",
      "\u0627\u0633\u0645 \u0635\u0627\u062d\u0628 \u0627\u0644\u064a\u0648\u0632\u0631",
      "\u0631\u0642\u0645 \u0625\u0642\u0627\u0645\u0629 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u0639\u0644\u064a\u0627",
      "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u0639\u0644\u064a\u0627",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062f\u0648\u0628: \u0643\u0641\u0627\u0644\u0629 / \u062e\u0627\u0631\u062c\u064a",
      "\u0631\u0642\u0645 \u062c\u0648\u0627\u0644 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0641\u0639\u0644\u064a",
      "\u0646\u0648\u0639 \u0627\u0644\u062a\u0634\u063a\u064a\u0644: \u0631\u0627\u062a\u0628 / \u0628\u0627\u0644\u0637\u0644\u0628 / \u062e\u0627\u0631\u062c\u064a / \u0628\u062f\u064a\u0644",
      "\u062a\u0627\u0631\u064a\u062e \u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646",
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0644\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
      "\u062a\u0627\u0631\u064a\u062e \u0623\u0648\u0644 \u064a\u0648\u0645 \u0639\u0645\u0644 \u0644\u0644\u0623\u064a\u062f\u064a",
      "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646: \u0646\u0634\u0637 / \u0645\u0648\u0642\u0648\u0641 / \u062a\u0628\u062f\u064a\u0644 / \u0625\u0642\u0627\u0644\u0629",
      "\u0627\u0644\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u0645\u0633\u062c\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u064a\u0648\u0632\u0631",
      "\u0627\u0644\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0641\u0639\u0644\u064a\u0627",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0631\u0643\u0628\u0629",
      "\u0631\u0642\u0645 \u0627\u0644\u0644\u0648\u062d\u0629",
      "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062a\u0633\u0644\u0633\u0644\u064a",
      "\u0627\u0644\u0645\u0634\u0631\u0641",
      "\u0645\u0644\u0627\u062d\u0638\u0627\u062a"
    ]
  });
  applyImportTypeOverrides("current_assignments_csv", {
    fileNameTerms: [
      "\u0627\u0644\u062a\u0633\u0643\u064a\u0646",
      "\u062a\u0633\u0643\u064a\u0646"
    ],
    headerTerms: [
      "\u0627\u0644\u0633\u062c\u0644",
      "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
      "\u0627\u0644\u062a\u0637\u0628\u064a\u0642",
      "\u0631\u0642\u0645 \u0625\u0642\u0627\u0645\u0629 \u0635\u0627\u062d\u0628 \u0627\u0644\u064a\u0648\u0632\u0631",
      "\u0627\u0633\u0645 \u0635\u0627\u062d\u0628 \u0627\u0644\u064a\u0648\u0632\u0631",
      "\u0631\u0642\u0645 \u0625\u0642\u0627\u0645\u0629 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u0639\u0644\u064a\u0627",
      "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u0639\u0644\u064a\u0627",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062f\u0648\u0628: \u0643\u0641\u0627\u0644\u0629 / \u062e\u0627\u0631\u062c\u064a",
      "\u0631\u0642\u0645 \u062c\u0648\u0627\u0644 \u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0641\u0639\u0644\u064a",
      "\u0646\u0648\u0639 \u0627\u0644\u062a\u0634\u063a\u064a\u0644: \u0631\u0627\u062a\u0628 / \u0628\u0627\u0644\u0637\u0644\u0628 / \u062e\u0627\u0631\u062c\u064a / \u0628\u062f\u064a\u0644",
      "\u062a\u0627\u0631\u064a\u062e \u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646",
      "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0644\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
      "\u062a\u0627\u0631\u064a\u062e \u0623\u0648\u0644 \u064a\u0648\u0645 \u0639\u0645\u0644 \u0644\u0644\u0623\u064a\u062f\u064a",
      "\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0633\u0643\u064a\u0646: \u0646\u0634\u0637 / \u0645\u0648\u0642\u0648\u0641 / \u062a\u0628\u062f\u064a\u0644 / \u0625\u0642\u0627\u0644\u0629",
      "\u0627\u0644\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u0645\u0633\u062c\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u064a\u0648\u0632\u0631",
      "\u0627\u0644\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0641\u0639\u0644\u064a\u0627",
      "\u0646\u0648\u0639 \u0627\u0644\u0645\u0631\u0643\u0628\u0629",
      "\u0631\u0642\u0645 \u0627\u0644\u0644\u0648\u062d\u0629",
      "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062a\u0633\u0644\u0633\u0644\u064a",
      "\u0627\u0644\u0645\u0634\u0631\u0641",
      "\u0645\u0644\u0627\u062d\u0638\u0627\u062a"
    ]
  });

  function createType(id, label, targetEntity, domain, extensions, options) {
    options = options || {};
    return {
      id: id,
      label: label,
      targetEntity: targetEntity || "",
      domain: domain || "unknown",
      extensions: extensions || [],
      fileNameTerms: normalizeList(options.fileNameTerms),
      sheetTerms: normalizeList(options.sheetTerms),
      headerTerms: normalizeList(options.headerTerms),
      rowTerms: normalizeList(options.rowTerms),
      formulaTerms: normalizeList(options.formulaTerms),
      arabicTerms: normalizeList(options.arabicTerms),
      englishTerms: normalizeList(options.englishTerms),
      requiredFields: options.requiredFields || [],
      requiredPermission: "imports.save"
    };
  }

  function normalizeList(values) {
    return (values || []).filter(Boolean).map(function (value) {
      return String(value);
    });
  }

  function applyImportTypeOverrides(typeId, overrides) {
    var importType = IMPORT_TYPES_BY_ID[typeId];
    if (!importType || !overrides) {
      return;
    }
    if (overrides.fileNameTerms) {
      importType.fileNameTerms = mergeTerms(importType.fileNameTerms, overrides.fileNameTerms);
    }
    if (overrides.sheetTerms) {
      importType.sheetTerms = mergeTerms(importType.sheetTerms, overrides.sheetTerms);
    }
    if (overrides.headerTerms) {
      importType.headerTerms = mergeTerms(importType.headerTerms, overrides.headerTerms);
    }
  }

  function mergeTerms(existingTerms, extraTerms) {
    return unique((existingTerms || []).concat(normalizeList(extraTerms)));
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).replace(/\uFEFF/g, "").trim();
  }

  function normalizeHeader(value) {
    return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
  }

  function normalizeKey(value) {
    return normalizeHeader(value).replace(/[^a-z0-9\u0600-\u06ff]+/gi, "");
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function flattenText(values) {
    return (values || []).map(function (value) {
      return normalizeText(value);
    }).filter(Boolean).join(" ");
  }

  function detectCitiesInText(value) {
    var text = normalizeHeader(value);
    var found = [];
    CITY_DEFINITIONS.forEach(function (item) {
      if (item.aliases.some(function (alias) {
        return text.indexOf(normalizeHeader(alias)) >= 0;
      })) {
        found.push(item.label);
      }
    });
    return unique(found);
  }

  function detectRegistersInText(value) {
    var text = normalizeHeader(value);
    var found = [];
    REGISTER_DEFINITIONS.forEach(function (item) {
      if (item.code === "MULTI" || item.code === "UNKNOWN") {
        return;
      }
      if (item.aliases.some(function (alias) {
        return text.indexOf(normalizeHeader(alias)) >= 0;
      })) {
        found.push(item.code);
      }
    });
    return unique(found);
  }

  function normalizeCity(value) {
    var found = detectCitiesInText(value);
    if (found.length > 1) {
      return "multi";
    }
    return found[0] || "";
  }

  function normalizeRegisterCode(value) {
    var direct = normalizeKey(value);
    var found = "";
    REGISTER_DEFINITIONS.some(function (item) {
      if (normalizeKey(item.code) === direct || normalizeKey(item.label) === direct) {
        found = item.code;
        return true;
      }
      if (item.aliases.some(function (alias) { return normalizeKey(alias) === direct; })) {
        found = item.code;
        return true;
      }
      return false;
    });
    return found || "";
  }

  function registerLabel(code) {
    var item = REGISTER_DEFINITIONS.filter(function (candidate) {
      return candidate.code === code;
    })[0];
    return item ? item.label : code;
  }

  function cityLabel(value) {
    var normalized = normalizeCity(value);
    return normalized === "multi" ? "كل المدن" : normalized;
  }

  function matchUserRegisterScope(userRegister, importRegister) {
    var normalizedUser = normalizeRegisterCode(userRegister);
    var normalizedImport = normalizeRegisterCode(importRegister);
    if (!normalizedUser || !normalizedImport) {
      return false;
    }
    if (normalizedUser === normalizedImport) {
      return true;
    }
    if (normalizedUser === "PER_ORDER_FR3PL") {
      return normalizedImport === "PER_ORDER" || normalizedImport === "FR_3PL" || normalizedImport === "PER_ORDER_FR3PL";
    }
    return false;
  }

  function extractMonthInfo(values) {
    var text = flattenText(Array.isArray(values) ? values : [values]);
    var normalized = normalizeHeader(text);
    var exact = "";
    var candidates = [];
    var yearMonth = normalized.match(/(20\d{2})[\/#_\-\s]?(0[1-9]|1[0-2])/g) || [];
    yearMonth.forEach(function (entry) {
      var match = normalizeHeader(entry).match(/(20\d{2})[\/#_\-\s]?(0[1-9]|1[0-2])/);
      if (match) {
        candidates.push(match[1] + "-" + match[2]);
      }
    });
    var monthYear = normalized.match(/(0[1-9]|1[0-2])[\/#_\-\s](20\d{2})/g) || [];
    monthYear.forEach(function (entry) {
      var match = normalizeHeader(entry).match(/(0[1-9]|1[0-2])[\/#_\-\s](20\d{2})/);
      if (match) {
        candidates.push(match[2] + "-" + match[1]);
      }
    });
    var compact = normalized.match(/20\d{2}(0[1-9]|1[0-2])[0-3]\d/g) || [];
    compact.forEach(function (entry) {
      candidates.push(entry.slice(0, 4) + "-" + entry.slice(4, 6));
    });
    exact = unique(candidates)[0] || "";
    return {
      detectedMonth: exact,
      dateRange: exact ? monthToDateRange(exact) : { start: "", end: "" },
      confidence: exact ? 0.92 : 0,
      warnings: exact ? [] : ["month_not_detected"]
    };
  }

  function monthToDateRange(monthValue) {
    if (!/^\d{4}-\d{2}$/.test(normalizeText(monthValue))) {
      return { start: "", end: "" };
    }
    var parts = monthValue.split("-");
    var start = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    var end = new Date(Number(parts[0]), Number(parts[1]), 0);
    return {
      start: toDateValue(start),
      end: toDateValue(end)
    };
  }

  function toDateValue(date) {
    return [
      String(date.getFullYear()),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function getImportType(typeId) {
    return IMPORT_TYPES_BY_ID[typeId] || IMPORT_TYPES_BY_ID.unknown;
  }

  function listImportTypes() {
    return IMPORT_TYPES.slice();
  }

  function getSupportedTargetEntities() {
    return unique(IMPORT_TYPES.map(function (item) {
      return item.targetEntity;
    }).filter(Boolean));
  }

  function getConfidenceState(confidence) {
    var numeric = Number(confidence) || 0;
    if (numeric >= CONFIDENCE_THRESHOLDS.autoDetected) {
      return "auto_detected";
    }
    if (numeric >= CONFIDENCE_THRESHOLDS.needsReview) {
      return "needs_review";
    }
    return "manual_mapping_required";
  }

  return {
    CITY_DEFINITIONS: CITY_DEFINITIONS,
    CONFIDENCE_THRESHOLDS: CONFIDENCE_THRESHOLDS,
    IMPORT_TYPES: IMPORT_TYPES,
    IMPORT_TYPES_BY_ID: IMPORT_TYPES_BY_ID,
    REGISTER_DEFINITIONS: REGISTER_DEFINITIONS,
    cityLabel: cityLabel,
    detectCitiesInText: detectCitiesInText,
    detectRegistersInText: detectRegistersInText,
    extractMonthInfo: extractMonthInfo,
    flattenText: flattenText,
    getConfidenceState: getConfidenceState,
    getImportType: getImportType,
    getSupportedTargetEntities: getSupportedTargetEntities,
    listImportTypes: listImportTypes,
    matchUserRegisterScope: matchUserRegisterScope,
    monthToDateRange: monthToDateRange,
    normalizeCity: normalizeCity,
    normalizeHeader: normalizeHeader,
    normalizeKey: normalizeKey,
    normalizeRegisterCode: normalizeRegisterCode,
    normalizeText: normalizeText,
    registerLabel: registerLabel,
    unique: unique
  };
});
