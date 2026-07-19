(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./importTypes.js"),
      require("./headerMapper.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportTemplateRegistry = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.HeaderMapper
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HeaderMapper) {
  "use strict";

  var FIELD_ALIASES = HeaderMapper.FIELD_ALIASES || {};
  var normalizeKey = ImportTypes.normalizeKey;
  var normalizeText = ImportTypes.normalizeText;

  var dashboardUsersColumns = [
    column("userId", "Courier ID", { required: true }),
    column("qualificationType", "Courier qualification type"),
    column("personalName", "First Name"),
    column("familyName", "Last Name"),
    column("iqama", "ID Number"),
    column("phone", "Phone Number"),
    column("email", "Email"),
    column("vehicleType", "Vehicle"),
    column("status", "Employment Status"),
    column("reviewStatus", "Review Status"),
    column("documentChangeStatus", "Document change status"),
    column("notes", "Please note"),
    column("settlementMode", "Settlement mode"),
    column("city", "Operations  city"),
    column("register", "register")
  ];

  var hrMasterSourceColumns = [
    column("sequence", "تسلسل"),
    column("employeeNumber", "الرقم الوظيفى"),
    column("iqama", "رقم الهوية", { required: true }),
    column("fullName", "الاسم", { required: true }),
    column("startDate", "تاريخ التعين"),
    column("nationality", "الجنسية"),
    column("professionAtIqama", "المهنه بالاقامه"),
    column("jobTitle", "المسمي الوظيفي"),
    column("branch", "الفرع"),
    column("residencyExpiry", "تاريخ انتهاء الاقامة"),
    column("residencyStatus", "الصلاحية"),
    column("sponsorId", "هوية صاحب العمل"),
    column("registerName", "اسم السجل"),
    column("licenseType", "نوع الرخصة"),
    column("licenseTypeSecondary", "نوع الرخصة"),
    column("kafalaStatus", "حالة الكفالة"),
    column("riderStatus", "حالة المندوب"),
    column("notes", "الملاحظات"),
    column("licenseState", "حاله الرخصه")
  ];

  var hrMasterComputedColumns = [
    column("driverCardSummary", "بطاقة السائق", { computed: true }),
    column("workApplicationsSummary", "تطبيق العمل", { computed: true }),
    column("keetaCityRegister", "مدينة و سجل ايدي كيتا", { computed: true }),
    column("keetaId", "ايدي كيتا", { computed: true }),
    column("hungerId", "ايدي هنقر", { computed: true }),
    column("amazonId", "ايدي امازون", { computed: true }),
    column("ninjaId", "ايدي نينجا", { computed: true }),
    column("jahezId", "ايدي جاهز", { computed: true }),
    column("chefzId", "ايدي شفز", { computed: true })
  ];

  var externalRidersColumns = [
    column("sourceTimestamp", "Timestamp", { required: true }),
    column("iqama", "رقم اقامة المندوب", { required: true, aliases: ["رقم إقامة المندوب", "Iqama", "Iqama Number", "ID Number"] }),
    column("fullName", "اسم المندوب", { required: true }),
    column("phone", "رقم جوال التواصل", { required: true }),
    column("riderType", "نوع المندوب / نوع البديل", { required: true }),
    column("vehicleType", "نوع المركبة", { required: true }),
    column("gasCard", "كارت بنزين", { required: true }),
    column("tools", "عهدة الادوات", { required: true }),
    column("nationality", "الجنسية", { required: true }),
    column("appPhone", "رقم الجوال المسجل بالتطبيق للمندوب", { required: true }),
    column("iban", "رقم الايبان البنكي", { required: true }),
    column("userId", "المعرف", { required: true }),
    column("email", "Email Address", { required: true })
  ];

  var currentAssignmentsColumns = [
    column("register", "السجل", { required: true }),
    column("city", "المدينة", { required: true }),
    column("platform", "التطبيق", { required: true }),
    column("userId", "Courier ID / User ID", { required: true }),
    column("ownerIqama", "رقم إقامة صاحب اليوزر", { required: true }),
    column("ownerName", "اسم صاحب اليوزر", { required: true }),
    column("actualRiderIqama", "رقم إقامة المندوب المستخدم فعليًا", { required: true }),
    column("actualRiderName", "اسم المندوب المستخدم فعليًا", { required: true }),
    column("riderType", "نوع المندوب: كفالة / خارجي", { required: true }),
    column("actualRiderPhone", "رقم جوال المندوب الفعلي", { required: true }),
    column("operationMode", "نوع التشغيل: راتب / بالطلب / خارجي / بديل", { required: true }),
    column("assignmentStartDate", "تاريخ بداية التسكين", { required: true }),
    column("riderReceiveDate", "تاريخ الاستلام للمندوب المستخدم", { required: true }),
    column("firstOnlineDate", "تاريخ أول يوم عمل للأيدي", { required: true }),
    column("assignmentStatus", "حالة التسكين: نشط / موقوف / تبديل / إقالة", { required: true }),
    column("dashboardVehicle", "المركبة المسجلة على اليوزر", { required: true }),
    column("actualVehicle", "المركبة المستخدمة فعليًا", { required: true }),
    column("vehicleType", "نوع المركبة", { required: true }),
    column("plateNumber", "رقم اللوحة", { required: true }),
    column("vehicleSerial", "الرقم التسلسلي", { required: true }),
    column("supervisor", "المشرف", { required: true }),
    column("notes", "ملاحظات", { required: true })
  ];

  var operatingVehiclesSourceColumns = [
    column("plateNumber", "رقم اللوحة"),
    column("registrationType", "نوع التسجيل"),
    column("brand", "الماركة"),
    column("model", "الطراز"),
    column("opc", "OPC"),
    column("vehicleSerial", "الرقم التسلسلي", { required: true }),
    column("register", "السجل"),
    column("brandName", "Brand Name"),
    column("availableRegistersText", "السجلات المتاحه للاستخدام")
  ];

  var operatingVehiclesDisplayColumns = [
    column("currentBoundingAccounts", "current bounding accounts"),
    column("usedByPartnerName", "used by how name partner"),
    column("currentBranch", "Current branch"),
    column("currentCity", "Current City"),
    column("targetedBranch", "Targeted Branch"),
    column("usedInCityCount", "In how many city is it used?"),
    column("vehicleType", "Vehicle Type"),
    column("cityAndBranch", "City & Pranch"),
    column("accountsRegisteredOnVehicle", "Accounts registered on the vehicle"),
    column("iqama1", "Iqama 1"),
    column("iqama2", "Iqama 2"),
    column("iqama3", "Iqama 3"),
    column("iqama4", "Iqama 4"),
    column("movementStatus", "Vehicle movement status")
  ];

  var vehiclesMovementColumns = [
    column("branch", "الفرع"),
    column("newPlateNumber", "اللوحة الجديدة"),
    column("movementActionType", "نوع تم"),
    column("newRegistrationType", "نوع التسجيل الجديد"),
    column("brand", "الماركة"),
    column("model", "الطراز"),
    column("manufactureYear", "سنة الصنع"),
    column("vehicleSerial", "الرقم التسلسلي", { required: true }),
    column("chassisNumber", "رقم الهيكل"),
    column("primaryColor", "اللون الأساسي"),
    column("delegatedPersonName", "اسم المفوض"),
    column("delegatedPhone", "رقم الجوال بالتفويض"),
    column("authorizationStartDate", "تاريخ بداية التفويض"),
    column("authorizationEndDate", "تاريخ نهاية التفويض"),
    column("movementStatus", "الحالة"),
    column("movementStatusSecondary", "الحالة"),
    column("movementFlagD", "D"),
    column("delegatedIqama", "رقم إقامة المفوض"),
    column("currentUserIqama", "رقم اقامة المستخدم"),
    column("currentUserName", "الإسم"),
    column("currentUserPhone", "رقم جوال المستخدم"),
    column("licenseType", "نوع الرخصة"),
    column("riderType", "نوع المندوب"),
    column("platform", "تطبيق العمل"),
    column("userId", "رقم الأيدي"),
    column("receiptDate", "تاريخ الإستلام"),
    column("notes", "ملاحظات")
  ];

  var dailyPerformanceColumns = [
    column("date", "Date", { required: true }),
    column("userId", "User ID", { required: true }),
    column("iqama", "Iqama"),
    column("fullName", "Full Name"),
    column("city", "City"),
    column("register", "Register"),
    column("vehicleType", "Vehicle Type"),
    column("completedOrders", "Completed Orders"),
    column("cancelledOrders", "Cancelled Orders"),
    column("rejectedOrders", "Rejected Orders"),
    column("workingHours", "Working Hours"),
    column("onlineHours", "Online Hours"),
    column("attendanceStatus", "Attendance Status"),
    column("ataScore", "ATA"),
    column("lateCount", "Late Count"),
    column("cancellationRate", "Cancellation Rate")
  ];

  var overallPerformanceColumns = [
    column("userId", "User ID", { required: true }),
    column("iqama", "Iqama"),
    column("fullName", "Full Name"),
    column("city", "City"),
    column("register", "Register"),
    column("vehicleType", "Vehicle Type"),
    column("month", "Month"),
    column("completedOrders", "Completed Orders"),
    column("cancelledOrders", "Cancelled Orders"),
    column("rejectedOrders", "Rejected Orders"),
    column("workingHours", "Working Hours"),
    column("onlineHours", "Online Hours"),
    column("status", "Status"),
    column("notes", "Notes")
  ];

  var vdaColumns = [
    column("city", "City"),
    column("partnerId", "3PL ID"),
    column("partnerName", "3PL Name"),
    column("userId", "Rider ID", { required: true }),
    column("vehicleType", "Vehicle Type"),
    column("vda", "VDA"),
    column("deliveredTasks", "Sum of total delivered tasks"),
    column("onlineHours", "Shift Online hours"),
    column("status", "Status")
  ];

  var faceVerificationColumns = [
    column("userId", "Rider ID", { required: true }),
    column("fullName", "Courier Name"),
    column("city", "City"),
    column("register", "Register"),
    column("date", "Date"),
    column("status", "Verification Status"),
    column("notes", "Notes")
  ];

  var deliveryExperienceColumns = [
    column("userId", "معرّف سائق التوصيل", { required: true }),
    column("fullName", "الاسم"),
    column("city", "المدينة"),
    column("register", "السجل"),
    column("month", "الشهر"),
    column("status", "المستوى التقديري الحالي"),
    column("deliveredTasks", "المبلغ التقديري الحالي للمكافأة"),
    column("notes", "ملاحظات")
  ];

  var companyInvoiceColumns = [
    column("partnerId", "معرف الشريك", { required: true }),
    column("partnerName", "اسم الشريك", { required: true }),
    column("month", "دورة الفوترة"),
    column("userId", "معرّف سائق التوصيل", { required: true }),
    column("fullName", "اسم سائق التوصيل", { required: true }),
    column("city", "المدينة"),
    column("register", "السجل"),
    column("deliveredTasks", "إجمالي عدد الطلبات"),
    column("iban", "الايبان"),
    column("notes", "ملاحظات")
  ];

  var internalSettlementColumns = [
    column("userId", "المعرف", { required: true }),
    column("fullName", "اسم صاحب الايدي"),
    column("iqama", "رقم الهوية"),
    column("city", "المدينة"),
    column("register", "السجل"),
    column("month", "الشهر"),
    column("vehicleType", "نوع المركبة"),
    column("iban", "الايبان"),
    column("status", "الحالة"),
    column("notes", "ملاحظات")
  ];

  var shiftScheduleColumns = [
    column("date", "Date", { required: true }),
    column("userId", "Rider ID", { required: true }),
    column("fullName", "Rider Name"),
    column("city", "City"),
    column("register", "Register"),
    column("status", "Status"),
    column("notes", "Notes")
  ];

  var TEMPLATE_DEFINITIONS = [
    template({
      id: "dashboard_users",
      label: "Dashboard Users",
      targetEntity: "dashboardUsers",
      supportedImportTypes: ["dashboard_users_workbook", "dashboard_users_csv"],
      defaultImportTypes: ["dashboard_users_workbook", "dashboard_users_csv"],
      sheetNames: ["Dashboard Users", "Update User", "Dashboard", "Dash"],
      columns: dashboardUsersColumns,
      primaryKey: "Courier ID",
      secondaryKeys: ["ID Number"],
      sampleRows: [{
        userId: "1782916129257495",
        qualificationType: "Car - External",
        personalName: "Ahmed",
        familyName: "Salem",
        iqama: "2444000011",
        phone: "966501112233",
        email: "ops@example.com",
        vehicleType: "Car",
        status: "Working",
        reviewStatus: "Accepted",
        documentChangeStatus: "No Change",
        notes: "Imported from latest dashboard sheet",
        settlementMode: "Salary Tiers",
        city: "جدة",
        register: "EXPRESS"
      }],
      validationRules: [
        "Courier ID must remain unique inside the imported batch.",
        "ID Number must be treated as text and preserved exactly as exported.",
        "City/register scope should align with the selected organization context before save."
      ],
      relationships: [
        "Dashboard Users.ownerIqama -> HR Master.رقم الهوية",
        "Dashboard Users.vehicleSerial/plate -> Fleet Operating Vehicles"
      ]
    }),
    template({
      id: "hr_master",
      label: "HR Master",
      targetEntity: "hrProfiles",
      supportedImportTypes: ["hr_master_workbook", "rider_master_workbook"],
      defaultImportTypes: ["hr_master_workbook", "rider_master_workbook"],
      sheetNames: ["HR اكبريس جايت", "HR شركة البوابة المقبلة", "HR Express", "HR"],
      columns: hrMasterSourceColumns.concat(hrMasterComputedColumns),
      primaryKey: "رقم الهوية",
      secondaryKeys: ["الرقم الوظيفى"],
      sampleRows: [{
        sequence: "1",
        employeeNumber: "EMP-1001",
        iqama: "2444556677",
        fullName: "بدر علي",
        startDate: "2026-01-10",
        nationality: "مصري",
        professionAtIqama: "مندوب توصيل",
        jobTitle: "Rider",
        branch: "جدة",
        residencyExpiry: "2027-02-01",
        residencyStatus: "سارية",
        sponsorId: "1010101010",
        registerName: "EXPRESS GATE Company",
        licenseType: "عمومي",
        licenseTypeSecondary: "عمومي",
        kafalaStatus: "على الكفالة",
        riderStatus: "يعمل",
        notes: "سجل موحد",
        licenseState: "سارية",
        driverCardSummary: "CARD-2026-001 - ساري - 2027-02-01",
        workApplicationsSummary: "كيتا جدة - 1782916129257495",
        keetaCityRegister: "جدة - EXPRESS",
        keetaId: "1782916129257495",
        hungerId: "",
        amazonId: "",
        ninjaId: "",
        jahezId: "",
        chefzId: ""
      }],
      validationRules: [
        "رقم الهوية must stay as text and is the primary rider/employee identity key.",
        "Do not merge riders by name only; Courier/User IDs stay separate from employee identities.",
        "Computed columns T:AB can be blank on import and are re-derived in the HR display layer."
      ],
      relationships: [
        "HR Master.رقم الهوية -> Riders.primaryIqama",
        "HR Master.رقم الهوية -> Dashboard Users.ownerIqama",
        "HR Master.رقم الهوية -> Driver Cards / platform account lookups"
      ]
    }),
    template({
      id: "external_riders",
      label: "External Riders Master",
      targetEntity: "externalRiders",
      supportedImportTypes: ["external_riders_workbook", "external_riders_csv"],
      defaultImportTypes: ["external_riders_workbook", "external_riders_csv"],
      sheetNames: ["External Riders", "External Rider", "Riders External"],
      columns: externalRidersColumns,
      primaryKey: "Ø±Ù‚Ù… Ø§Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨",
      secondaryKeys: ["Ø§Ù„Ù…Ø¹Ø±Ù", "Email Address"],
      sampleRows: [{
        sourceTimestamp: "2026-07-15 09:15:00",
        iqama: "2444333222",
        fullName: "Mohammed Adel",
        phone: "966550001122",
        riderType: "Ø®Ø§Ø±Ø¬ÙŠ",
        vehicleType: "Car",
        gasCard: "Yes",
        tools: "Bag + Uniform",
        nationality: "Egyptian",
        appPhone: "966550009988",
        iban: "SA0380000000608010167519",
        userId: "1782999000112233",
        email: "supervisor.ops@example.com"
      }],
      validationRules: [
        "Iqama is the business key and must stay unique per rider across external imports.",
        "If the same iqama already exists in HR Master, save only the operational profile and do not duplicate the external identity.",
        "Email Address belongs to the creator/updater of the row and is not the rider email."
      ],
      relationships: [
        "External Riders.iqama -> Rider Operational Profiles.iqama",
        "External Riders.iqama -> Assignments.actualRiderIqama",
        "External Riders.userId/email -> Import ownership and review context"
      ]
    }),
    template({
      id: "current_assignments",
      label: "Current Assignments",
      targetEntity: "assignments",
      supportedImportTypes: ["current_assignments_workbook", "current_assignments_csv"],
      defaultImportTypes: ["current_assignments_workbook", "current_assignments_csv"],
      sheetNames: ["Current Assignments", "Assignments", "Current Operations"],
      columns: currentAssignmentsColumns,
      primaryKey: "Courier ID / User ID",
      secondaryKeys: ["Ø±Ù‚Ù… Ø¥Ù‚Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙØ¹Ù„ÙŠØ§", "ØªØ§Ø±ÙŠØ® Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„ØªØ³ÙƒÙŠÙ†"],
      sampleRows: [{
        register: "EXPRESS",
        city: "Ø¬Ø¯Ø©",
        platform: "Keeta",
        userId: "1782916129257495",
        ownerIqama: "2444000011",
        ownerName: "Ahmed Salem",
        actualRiderIqama: "2999000011",
        actualRiderName: "Mohamed Hamza",
        riderType: "Ø®Ø§Ø±Ø¬ÙŠ",
        actualRiderPhone: "966501010101",
        operationMode: "Ø±Ø§ØªØ¨",
        assignmentStartDate: "2026-07-01",
        riderReceiveDate: "2026-07-01",
        firstOnlineDate: "2026-07-02",
        assignmentStatus: "Ù†Ø´Ø·",
        dashboardVehicle: "EXPRESS Registered Car",
        actualVehicle: "Toyota Yaris",
        vehicleType: "Car",
        plateNumber: "JED-1001",
        vehicleSerial: "JED-CAR-1001",
        supervisor: "Shift Lead A",
        notes: "Imported from current operations tracker"
      }],
      validationRules: [
        "Business identity is platform + register + city + courierId + actualRiderIqama + assignmentStartDate.",
        "Actual rider attribution must follow the assignment period and must not default blindly to the dashboard owner.",
        "Vehicle usage history must close previous active periods before opening a new one for the same rider."
      ],
      relationships: [
        "Current Assignments.userId -> Dashboard Users.dashboardUserId",
        "Current Assignments.actualRiderIqama -> HR Master/External Riders/Rider Operational Profiles",
        "Current Assignments.vehicleSerial/plateNumber -> Rider Vehicle Usage History and Fleet views"
      ]
    }),
    template({
      id: "vehicles",
      label: "Operating Vehicles",
      shortLabel: "Operating Vehicles",
      targetEntity: "vehicles",
      supportedImportTypes: ["vehicle_workbook"],
      defaultImportTypes: ["vehicle_workbook"],
      sheetNames: ["Operating Vehicles", "VehicleS", "Update VehicleS", "Update Branches"],
      columns: operatingVehiclesSourceColumns.concat(operatingVehiclesDisplayColumns),
      primaryKey: "الرقم التسلسلي",
      secondaryKeys: ["رقم اللوحة"],
      sampleRows: [{
        plateNumber: "أ ب ج 1234",
        registrationType: "نقل عام",
        brand: "Toyota",
        model: "Yaris",
        opc: "OPC-1001",
        vehicleSerial: "JED-CAR-1001",
        register: "EXPRESS",
        brandName: "EXPRESS GATE Company",
        availableRegistersText: "EXPRESS, ALBAWABA",
        currentBoundingAccounts: "1",
        usedByPartnerName: "Ahmed Salem",
        currentBranch: "جدة - EXPRESS",
        currentCity: "جدة",
        targetedBranch: "EXPRESS",
        usedInCityCount: "1",
        vehicleType: "car",
        cityAndBranch: "جدة - EXPRESS",
        accountsRegisteredOnVehicle: "1782916129257495 - 2444000011 - Ahmed Salem",
        iqama1: "2444000011",
        iqama2: "",
        iqama3: "",
        iqama4: "",
        movementStatus: "متاحة"
      }],
      validationRules: [
        "الرقم التسلسلي is the primary fleet identity and must be preserved as text.",
        "If the same serial appears with a different plate, treat it as a plate update for the same vehicle.",
        "Operating fleet vehicles must respect city/register segregation and transport eligibility rules."
      ],
      relationships: [
        "Operating Vehicles.الرقم التسلسلي -> Vehicles Movement.الرقم التسلسلي",
        "Operating Vehicles.الرقم التسلسلي -> Dashboard Users.vehicleSerial",
        "Operating Vehicles.current bounding accounts -> capacity / assignment review"
      ]
    }),
    template({
      id: "vehicles_movement",
      label: "Vehicles Movement",
      shortLabel: "Vehicles Movement",
      targetEntity: "vehicleMovementEvents",
      supportedImportTypes: ["vehicle_workbook"],
      defaultImportTypes: [],
      sheetNames: ["Vehicle Movement", "Movement", "Fleet Movement", "الحركة"],
      columns: vehiclesMovementColumns,
      primaryKey: "الرقم التسلسلي",
      secondaryKeys: ["اللوحة الجديدة", "تاريخ الإستلام"],
      sampleRows: [{
        branch: "جدة",
        newPlateNumber: "أ ب ج 1234",
        movementActionType: "تسليم",
        newRegistrationType: "نقل عام",
        brand: "Toyota",
        model: "Yaris",
        manufactureYear: "2024",
        vehicleSerial: "JED-CAR-1001",
        chassisNumber: "CH-001",
        primaryColor: "White",
        delegatedPersonName: "Abdullah",
        delegatedPhone: "966500000001",
        authorizationStartDate: "2026-07-01",
        authorizationEndDate: "2026-07-31",
        movementStatus: "مسلمة لمندوب",
        movementStatusSecondary: "Active",
        movementFlagD: "",
        delegatedIqama: "2444556677",
        currentUserIqama: "2444000011",
        currentUserName: "Ahmed Salem",
        currentUserPhone: "966501112233",
        licenseType: "عمومي",
        riderType: "سيارة",
        platform: "Keeta",
        userId: "1782916129257495",
        receiptDate: "2026-07-01",
        notes: "تسليم تشغيلي"
      }],
      validationRules: [
        "Vehicles Movement must link to a vehicle by serial first, with the new plate used only as a secondary trace key.",
        "This template is fleet-wide and may include public and private transport plus movement, maintenance, and accident states.",
        "Unknown movement headers should not be saved directly without a reviewed template match."
      ],
      relationships: [
        "Vehicles Movement.الرقم التسلسلي -> Operating Vehicles.الرقم التسلسلي",
        "Vehicles Movement.رقم اقامة المستخدم / رقم الأيدي -> actualUsedVehicle linkage",
        "Vehicles Movement.الحالة -> vehicle movement status and fleet compliance state"
      ]
    }),
    template({
      id: "daily_performance",
      label: "Daily Performance",
      targetEntity: "performanceDaily",
      supportedImportTypes: ["performance_daily_csv", "performance_daily_workbook"],
      defaultImportTypes: ["performance_daily_csv", "performance_daily_workbook"],
      sheetNames: ["Daily", "Performance Daily", "التقرير اليومي"],
      columns: dailyPerformanceColumns,
      primaryKey: "Date + User ID",
      secondaryKeys: ["Iqama"],
      sampleRows: [{
        date: "2026-07-01",
        userId: "1782916129257495",
        iqama: "2444000011",
        fullName: "Ahmed Salem",
        city: "جدة",
        register: "EXPRESS",
        vehicleType: "car",
        completedOrders: "22",
        cancelledOrders: "0",
        rejectedOrders: "0",
        workingHours: "9",
        onlineHours: "9",
        attendanceStatus: "present",
        ataScore: "94",
        lateCount: "1",
        cancellationRate: "0"
      }],
      validationRules: [
        "Date + User ID uniquely identify a daily performance row.",
        "Keep only the columns needed by the validity engine; avoid carrying unused workbook fields.",
        "If rules change monthly, re-import daily data under the correct rule month."
      ],
      relationships: [
        "Daily Performance.userId -> Dashboard Users.dashboardUserId",
        "Daily Performance.iqama -> HR Master.رقم الهوية"
      ]
    }),
    template({
      id: "overall_performance",
      label: "Overall Performance",
      targetEntity: "performanceMonthly",
      supportedImportTypes: ["performance_overall_csv", "performance_overall_workbook"],
      defaultImportTypes: ["performance_overall_csv", "performance_overall_workbook"],
      sheetNames: ["Overall", "Monthly Performance", "الأداء الكلي"],
      columns: overallPerformanceColumns,
      primaryKey: "User ID + Month",
      secondaryKeys: ["Iqama"],
      sampleRows: [{
        userId: "1782916129257495",
        iqama: "2444000011",
        fullName: "Ahmed Salem",
        city: "جدة",
        register: "EXPRESS",
        vehicleType: "car",
        month: "2026-07",
        completedOrders: "560",
        cancelledOrders: "0",
        rejectedOrders: "1",
        workingHours: "248",
        onlineHours: "248",
        status: "valid",
        notes: "Monthly aggregate"
      }],
      validationRules: [
        "Overall performance remains a placeholder-aligned registry definition in Prompt 8.",
        "Keep only the columns required by the monthly validity and projection layers.",
        "Use this template for detection, preview, and download even if deeper engine work was completed in Prompt 7."
      ],
      relationships: [
        "Overall Performance.userId -> Dashboard Users.dashboardUserId",
        "Overall Performance.month -> Monthly Rules.month"
      ],
      implementationStatus: "reference_pending"
    }),
    template({
      id: "vda",
      label: "VDA",
      targetEntity: "vdaResults",
      supportedImportTypes: ["vda_csv", "vda_workbook", "vda_keeta_csv", "vda_keeta_workbook"],
      defaultImportTypes: ["vda_csv", "vda_workbook", "vda_keeta_csv", "vda_keeta_workbook"],
      sheetNames: ["VDA", "VDA_kEETA"],
      columns: vdaColumns,
      primaryKey: "Rider ID + Month",
      secondaryKeys: ["3PL Name", "City"],
      sampleRows: [{
        city: "Jeddah",
        partnerId: "3PL-001",
        partnerName: "EXPRESS GATE Company",
        userId: "1782916129257495",
        vehicleType: "Car",
        vda: "24",
        deliveredTasks: "136",
        onlineHours: "118",
        status: "valid"
      }],
      validationRules: [
        "VDA template detection is active in Prompt 8, but the deeper validity engine remains preserved from Prompt 7.",
        "Use rider ID as the operational join key and keep company-level VDA exports archived raw when needed.",
        "Template matching should support both company VDA files and Keeta-side VDA exports."
      ],
      relationships: [
        "VDA.Rider ID -> Dashboard Users.dashboardUserId",
        "VDA -> Monthly validity engine / rule resolver"
      ]
    }),
    template({
      id: "face_verification",
      label: "Face Verification",
      targetEntity: "faceVerification",
      supportedImportTypes: ["face_verification_csv", "face_verification_workbook"],
      defaultImportTypes: ["face_verification_csv", "face_verification_workbook"],
      sheetNames: ["Face Verification", "FR Full Data"],
      columns: faceVerificationColumns,
      primaryKey: "Rider ID + Date",
      secondaryKeys: ["City", "Register"],
      sampleRows: [{
        userId: "1782916129257495",
        fullName: "Ahmed Salem",
        city: "جدة",
        register: "EXPRESS",
        date: "2026-07-01",
        status: "pass",
        notes: "FR full data export"
      }],
      validationRules: [
        "Face Verification remains template-ready in Prompt 8 and should not introduce a new engine here.",
        "Preserve rider/date linkage and allow clear pass/fail review during preview.",
        "Unknown face-verification headers require review before save."
      ],
      relationships: [
        "Face Verification.Rider ID -> Dashboard Users.dashboardUserId",
        "Face Verification -> Monthly validity engine"
      ],
      implementationStatus: "reference_pending"
    }),
    template({
      id: "delivery_experience",
      label: "Delivery Experience",
      targetEntity: "deliveryExperience",
      supportedImportTypes: ["delivery_experience_csv", "delivery_experience_workbook"],
      defaultImportTypes: ["delivery_experience_csv", "delivery_experience_workbook"],
      sheetNames: ["Delivery Experience", "حالة نتيجة تجربة التوصيل"],
      columns: deliveryExperienceColumns,
      primaryKey: "معرّف سائق التوصيل + الشهر",
      secondaryKeys: ["المدينة", "السجل"],
      sampleRows: [{
        userId: "1782916129257495",
        fullName: "Ahmed Salem",
        city: "جدة",
        register: "EXPRESS",
        month: "2026-07",
        status: "A",
        deliveredTasks: "2000",
        notes: "Estimated bonus"
      }],
      validationRules: [
        "Delivery Experience stays placeholder-aligned in Prompt 8.",
        "Map the current estimated level and reward columns only; avoid speculative extra fields.",
        "Do not rebuild salary logic here."
      ],
      relationships: [
        "Delivery Experience.userId -> Dashboard Users.dashboardUserId",
        "Delivery Experience -> Monthly validity engine"
      ],
      implementationStatus: "reference_pending"
    }),
    template({
      id: "company_invoice",
      label: "Company Invoice",
      targetEntity: "invoiceCourierDetail",
      supportedImportTypes: ["company_invoice_workbook"],
      defaultImportTypes: ["company_invoice_workbook"],
      sheetNames: ["تفاصيل الشركاء", "تفاصيل سائق التوصيل", "Partner Details", "Courier Details"],
      columns: companyInvoiceColumns,
      primaryKey: "معرف الشريك + معرّف سائق التوصيل + دورة الفوترة",
      secondaryKeys: ["اسم الشريك", "الايبان"],
      sampleRows: [{
        partnerId: "3PL-001",
        partnerName: "EXPRESS GATE Company",
        month: "2026-07",
        userId: "1782916129257495",
        fullName: "Ahmed Salem",
        city: "جدة",
        register: "EXPRESS",
        deliveredTasks: "2450",
        iban: "SA0380000000608010167519",
        notes: "Raw archive row"
      }],
      validationRules: [
        "Company invoices should be archived in their original company structure before any settlement logic.",
        "Prompt 8 only requires detection, raw archive, and normalized basic preview for invoice files.",
        "Do not start monthly closing or salary settlement logic here."
      ],
      relationships: [
        "Company Invoice.معرّف سائق التوصيل -> Dashboard Users.dashboardUserId",
        "Company Invoice -> monthly archive / finance module"
      ],
      implementationStatus: "reference_pending"
    }),
    template({
      id: "internal_settlement",
      label: "Internal Settlement",
      targetEntity: "internalSettlement",
      supportedImportTypes: ["internal_settlement_workbook"],
      defaultImportTypes: ["internal_settlement_workbook"],
      sheetNames: ["Express", "Albwaba", "FR 3PL"],
      columns: internalSettlementColumns,
      primaryKey: "المعرف + الشهر",
      secondaryKeys: ["الايبان", "السجل"],
      sampleRows: [{
        userId: "1782916129257495",
        fullName: "Ahmed Salem",
        iqama: "2444000011",
        city: "جدة",
        register: "EXPRESS",
        month: "2026-07",
        vehicleType: "car",
        iban: "SA0380000000608010167519",
        status: "ready",
        notes: "Placeholder settlement row"
      }],
      validationRules: [
        "Internal Settlement is registered as a reference template in Prompt 8 only.",
        "Preserve detection and preview support without introducing final settlement logic.",
        "Use this template to document expected joins and future finance dependencies."
      ],
      relationships: [
        "Internal Settlement.userId -> Dashboard Users.dashboardUserId",
        "Internal Settlement -> finance / monthly closing placeholders"
      ],
      implementationStatus: "reference_pending"
    }),
    template({
      id: "shift_schedule",
      label: "Shift Schedule",
      targetEntity: "shiftSchedules",
      supportedImportTypes: ["shift_schedule_workbook", "shift_schedule_xlsm"],
      defaultImportTypes: ["shift_schedule_workbook", "shift_schedule_xlsm"],
      sheetNames: ["Shift Scheduling", "Schedule", "Shifts"],
      columns: shiftScheduleColumns,
      primaryKey: "Date + Rider ID",
      secondaryKeys: ["City", "Register"],
      sampleRows: [{
        date: "2026-07-01",
        userId: "1782916129257495",
        fullName: "Ahmed Salem",
        city: "جدة",
        register: "EXPRESS",
        status: "draft",
        notes: "Morning shift"
      }],
      validationRules: [
        "Shift Schedule is template-ready in Prompt 8 but full scheduler logic is deferred.",
        "XLSM inputs may carry macros, but the portal works on extracted data only.",
        "Use the template registry and analysis reports to preserve the official shift-file structure."
      ],
      relationships: [
        "Shift Schedule.userId -> Dashboard Users.dashboardUserId",
        "Shift Schedule -> future scheduler integration"
      ],
      implementationStatus: "reference_pending"
    })
  ];

  var TEMPLATES_BY_ID = TEMPLATE_DEFINITIONS.reduce(function (memo, item) {
    memo[item.id] = item;
    return memo;
  }, {});

  var IMPORT_TYPE_TO_TEMPLATE = TEMPLATE_DEFINITIONS.reduce(function (memo, item) {
    (item.defaultImportTypes || []).forEach(function (importTypeId) {
      memo[importTypeId] = item.id;
    });
    return memo;
  }, {});

  function listTemplates() {
    return TEMPLATE_DEFINITIONS.slice();
  }

  function getTemplate(templateId) {
    return TEMPLATES_BY_ID[templateId] || null;
  }

  function getTemplateByImportType(importTypeId) {
    return getTemplate(IMPORT_TYPE_TO_TEMPLATE[importTypeId] || "");
  }

  function matchTemplates(headers, options) {
    options = options || {};
    var normalizedHeaders = (headers || []).map(function (header) {
      return normalizeText(header);
    }).filter(Boolean);
    var candidates = resolveCandidates(options.importType);
    var matches = candidates.map(function (templateDefinition) {
      return scoreTemplate(templateDefinition, normalizedHeaders);
    }).sort(function (left, right) {
      return right.confidence - left.confidence;
    });
    return {
      bestMatch: matches[0] || null,
      headers: normalizedHeaders,
      matches: matches
    };
  }

  function createTemplateWorkbook(templateId, xlsxLib) {
    var templateDefinition = typeof templateId === "string" ? getTemplate(templateId) : templateId;
    if (!templateDefinition) {
      throw new Error("Unknown import template: " + templateId);
    }
    if (!xlsxLib || !xlsxLib.utils || typeof xlsxLib.utils.book_new !== "function") {
      throw new Error("XLSX library is required to build template workbooks.");
    }
    var workbook = xlsxLib.utils.book_new();
    xlsxLib.utils.book_append_sheet(workbook, xlsxLib.utils.aoa_to_sheet(buildTemplateRows(templateDefinition)), templateDefinition.sheetName);
    xlsxLib.utils.book_append_sheet(workbook, xlsxLib.utils.aoa_to_sheet(buildRequirementsRows(templateDefinition)), "Requirements");
    xlsxLib.utils.book_append_sheet(workbook, xlsxLib.utils.aoa_to_sheet(buildAliasesRows(templateDefinition)), "Aliases");
    return workbook;
  }

  function createTemplateBundleWorkbook(xlsxLib) {
    if (!xlsxLib || !xlsxLib.utils || typeof xlsxLib.utils.book_new !== "function") {
      throw new Error("XLSX library is required to build template workbooks.");
    }
    var workbook = xlsxLib.utils.book_new();
    xlsxLib.utils.book_append_sheet(workbook, xlsxLib.utils.aoa_to_sheet(buildCatalogRows()), "Catalog");
    TEMPLATE_DEFINITIONS.forEach(function (templateDefinition, index) {
      var sheetName = String(index + 1).padStart(2, "0") + " " + truncateSheetName(templateDefinition.shortLabel);
      xlsxLib.utils.book_append_sheet(workbook, xlsxLib.utils.aoa_to_sheet(buildTemplateRows(templateDefinition)), sheetName.slice(0, 31));
    });
    return workbook;
  }

  function buildCatalogRows() {
    var rows = [
      ["Template", "Target Entity", "Supported Import Types", "Primary Key", "Required Headers", "Computed Headers", "Implementation Status"]
    ];
    TEMPLATE_DEFINITIONS.forEach(function (templateDefinition) {
      rows.push([
        templateDefinition.label,
        templateDefinition.targetEntity,
        templateDefinition.supportedImportTypes.join(", "),
        templateDefinition.primaryKey || "",
        templateDefinition.requiredHeaders.join(", "),
        templateDefinition.computedHeaders.join(", "),
        templateDefinition.implementationStatus
      ]);
    });
    return rows;
  }

  function buildTemplateRows(templateDefinition) {
    var headers = templateDefinition.displayColumns.map(function (columnDefinition) {
      return columnDefinition.header;
    });
    var sample = templateDefinition.displayColumns.map(function (columnDefinition) {
      var row = (templateDefinition.sampleRows || [])[0] || {};
      return Object.prototype.hasOwnProperty.call(row, columnDefinition.fieldName)
        ? row[columnDefinition.fieldName]
        : "";
    });
    return [headers, sample];
  }

  function buildRequirementsRows(templateDefinition) {
    return [
      ["Property", "Value"],
      ["Template", templateDefinition.label],
      ["Target Entity", templateDefinition.targetEntity],
      ["Supported Import Types", templateDefinition.supportedImportTypes.join(", ")],
      ["Source Sheets", templateDefinition.sheetNames.join(", ")],
      ["Primary Key", templateDefinition.primaryKey || ""],
      ["Secondary Keys", templateDefinition.secondaryKeys.join(", ")],
      ["Required Headers", templateDefinition.requiredHeaders.join(", ")],
      ["Optional Headers", templateDefinition.optionalHeaders.join(", ")],
      ["Computed Headers", templateDefinition.computedHeaders.join(", ")],
      ["Relationships", templateDefinition.relationships.join(" | ")],
      ["Validation Rule 1", templateDefinition.validationRules[0] || ""],
      ["Validation Rule 2", templateDefinition.validationRules[1] || ""],
      ["Validation Rule 3", templateDefinition.validationRules[2] || ""],
      ["Implementation Status", templateDefinition.implementationStatus]
    ];
  }

  function buildAliasesRows(templateDefinition) {
    var rows = [["Index", "Field", "Suggested Header", "Kind", "Supported Aliases"]];
    templateDefinition.displayColumns.forEach(function (columnDefinition, index) {
      rows.push([
        index + 1,
        columnDefinition.fieldName,
        columnDefinition.header,
        columnDefinition.kind,
        columnDefinition.aliases.join(" | ")
      ]);
    });
    return rows;
  }

  function resolveCandidates(importTypeId) {
    var scoped = TEMPLATE_DEFINITIONS.filter(function (templateDefinition) {
      return !importTypeId || templateDefinition.supportedImportTypes.indexOf(importTypeId) >= 0;
    });
    return scoped.length ? scoped : TEMPLATE_DEFINITIONS.slice();
  }

  function scoreTemplate(templateDefinition, headers) {
    var mapping = mapTemplateHeaders(templateDefinition, headers);
    var requiredMatched = templateDefinition.requiredColumns.filter(function (columnDefinition) {
      return !!mapping.byField[columnDefinition.fieldName];
    }).map(function (columnDefinition) {
      return columnDefinition.fieldName;
    });
    var optionalMatched = templateDefinition.optionalColumns.filter(function (columnDefinition) {
      return !!mapping.byField[columnDefinition.fieldName];
    }).map(function (columnDefinition) {
      return columnDefinition.fieldName;
    });
    var computedMatched = templateDefinition.computedColumns.filter(function (columnDefinition) {
      return !!mapping.byField[columnDefinition.fieldName];
    }).map(function (columnDefinition) {
      return columnDefinition.fieldName;
    });
    var requiredCoverage = templateDefinition.requiredColumns.length
      ? requiredMatched.length / templateDefinition.requiredColumns.length
      : (mapping.mappedCount ? 1 : 0);
    var optionalPool = templateDefinition.optionalColumns.length + templateDefinition.computedColumns.length;
    var optionalCoverage = optionalPool
      ? (optionalMatched.length + computedMatched.length) / optionalPool
      : 0;
    var headerCoverage = headers.length ? mapping.mappedCount / headers.length : 0;
    var confidence = round(clamp((requiredCoverage * 0.72) + (optionalCoverage * 0.18) + (headerCoverage * 0.10), 0, 0.995), 4);
    var state = deriveMatchState(requiredCoverage, optionalMatched.length + computedMatched.length, mapping.mappedCount, confidence);
    return {
      confidence: confidence,
      computedMatched: computedMatched,
      headerCoverage: round(headerCoverage, 4),
      mapping: sanitizeMapping(mapping),
      missingRequired: templateDefinition.requiredColumns.filter(function (columnDefinition) {
        return !mapping.byField[columnDefinition.fieldName];
      }).map(function (columnDefinition) {
        return columnDefinition.fieldName;
      }),
      optionalMatched: optionalMatched,
      requiredCoverage: round(requiredCoverage, 4),
      requiredMatched: requiredMatched,
      reviewRequired: state !== "auto",
      state: state,
      targetEntity: templateDefinition.targetEntity,
      templateId: templateDefinition.id,
      templateLabel: templateDefinition.label
    };
  }

  function mapTemplateHeaders(templateDefinition, headers) {
    var byField = {};
    var byHeader = {};
    var normalizedHeaders = (headers || []).map(function (header) {
      return normalizeText(header);
    }).filter(Boolean);
    normalizedHeaders.forEach(function (header) {
      var fieldName = resolveTemplateField(templateDefinition, header);
      if (!fieldName) {
        return;
      }
      if (!byField[fieldName]) {
        byField[fieldName] = header;
      }
      byHeader[header] = fieldName;
    });
    return {
      byField: byField,
      byHeader: byHeader,
      coverage: normalizedHeaders.length ? Object.keys(byField).length / normalizedHeaders.length : 0,
      headers: normalizedHeaders,
      mappedCount: Object.keys(byField).length,
      mappedFields: Object.keys(byField),
      missingRequired: templateDefinition.requiredColumns.filter(function (columnDefinition) {
        return !byField[columnDefinition.fieldName];
      }).map(function (columnDefinition) {
        return columnDefinition.fieldName;
      }),
      unknownHeaders: normalizedHeaders.filter(function (header) {
        return !byHeader[header];
      })
    };
  }

  function resolveTemplateField(templateDefinition, header) {
    var normalized = normalizeKey(header);
    var exactField = templateDefinition.aliasIndex[normalized] || "";
    if (exactField) {
      return exactField;
    }
    var genericField = typeof HeaderMapper.resolveFieldName === "function"
      ? HeaderMapper.resolveFieldName(header)
      : "";
    if (!genericField) {
      return "";
    }
    return templateDefinition.genericFieldMap[genericField] || "";
  }

  function deriveMatchState(requiredCoverage, optionalMatchedCount, mappedCount, confidence) {
    if (requiredCoverage === 1 && (optionalMatchedCount >= 2 || mappedCount >= 3) && confidence >= 0.82) {
      return "auto";
    }
    if (requiredCoverage > 0 || optionalMatchedCount >= 2 || confidence >= 0.45) {
      return "review";
    }
    return "manual";
  }

  function sanitizeMapping(mapping) {
    return {
      byField: mergeObjects({}, mapping.byField || {}),
      headers: (mapping.headers || []).slice(),
      mappedCount: Number(mapping.mappedCount) || 0,
      mappedFields: (mapping.mappedFields || []).slice(),
      missingRequired: (mapping.missingRequired || []).slice(),
      coverage: Number(mapping.coverage) || 0,
      unknownHeaders: (mapping.unknownHeaders || []).slice()
    };
  }

  function template(options) {
    var columns = (options.columns || []).map(cloneColumn);
    var requiredColumns = columns.filter(function (item) { return item.required; });
    var computedColumns = columns.filter(function (item) { return item.computed; });
    var optionalColumns = columns.filter(function (item) { return !item.required && !item.computed; });
    var aliasIndex = {};
    var genericFieldMap = {};

    columns.forEach(function (columnDefinition) {
      columnDefinition.aliases.forEach(function (alias) {
        var normalized = normalizeKey(alias);
        if (normalized && !aliasIndex[normalized]) {
          aliasIndex[normalized] = columnDefinition.fieldName;
        }
      });
      var genericField = normalizeText(columnDefinition.fieldName);
      if (genericField && !genericFieldMap[genericField]) {
        genericFieldMap[genericField] = columnDefinition.fieldName;
      }
    });

    return {
      aliasIndex: aliasIndex,
      columns: columns,
      computedColumns: computedColumns,
      computedHeaders: computedColumns.map(function (item) { return item.header; }),
      defaultImportTypes: (options.defaultImportTypes || []).slice(),
      displayColumns: columns.slice(),
      genericFieldMap: genericFieldMap,
      id: options.id,
      implementationStatus: options.implementationStatus || "ready",
      importTypes: (options.supportedImportTypes || []).slice(),
      label: options.label,
      optionalColumns: optionalColumns,
      optionalFields: optionalColumns.map(function (item) { return item.fieldName; }),
      optionalHeaders: optionalColumns.map(function (item) { return item.header; }),
      primaryKey: options.primaryKey || "",
      relationships: (options.relationships || []).slice(),
      requiredColumns: requiredColumns,
      requiredFields: requiredColumns.map(function (item) { return item.fieldName; }),
      requiredHeaders: requiredColumns.map(function (item) { return item.header; }),
      sampleRow: mergeObjects({}, (options.sampleRows || [])[0] || {}),
      sampleRows: (options.sampleRows || []).map(function (item) { return mergeObjects({}, item); }),
      secondaryKeys: (options.secondaryKeys || []).slice(),
      sheetName: truncateSheetName(options.shortLabel || options.label || options.id),
      sheetNames: (options.sheetNames || []).slice(),
      shortLabel: options.shortLabel || options.label || options.id,
      supportedImportTypes: (options.supportedImportTypes || []).slice(),
      targetEntity: options.targetEntity || "",
      validationRules: (options.validationRules || []).slice()
    };
  }

  function column(fieldName, header, options) {
    options = options || {};
    var aliases = unique([header].concat(options.aliases || []).concat(getFieldAliases(fieldName)));
    return {
      aliases: aliases,
      computed: options.computed === true,
      fieldName: fieldName,
      genericFieldName: options.genericFieldName || fieldName,
      header: header,
      kind: options.computed ? "computed" : (options.required ? "required" : "optional"),
      required: options.required === true
    };
  }

  function cloneColumn(columnDefinition) {
    return {
      aliases: (columnDefinition.aliases || []).slice(),
      computed: !!columnDefinition.computed,
      fieldName: columnDefinition.fieldName,
      genericFieldName: columnDefinition.genericFieldName,
      header: columnDefinition.header,
      kind: columnDefinition.kind,
      required: !!columnDefinition.required
    };
  }

  function getFieldAliases(fieldName) {
    return (FIELD_ALIASES[fieldName] || []).slice();
  }

  function truncateSheetName(value) {
    return String(value || "").slice(0, 31);
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value || "");
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits) {
    var factor = Math.pow(10, digits == null ? 2 : digits);
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    IMPORT_TYPE_TO_TEMPLATE: IMPORT_TYPE_TO_TEMPLATE,
    TEMPLATES: TEMPLATE_DEFINITIONS,
    buildAliasesRows: buildAliasesRows,
    buildRequirementsRows: buildRequirementsRows,
    buildTemplateRows: buildTemplateRows,
    createTemplateBundleWorkbook: createTemplateBundleWorkbook,
    createTemplateWorkbook: createTemplateWorkbook,
    getFieldAliases: getFieldAliases,
    getTemplate: getTemplate,
    getTemplateByImportType: getTemplateByImportType,
    listTemplates: listTemplates,
    matchTemplates: matchTemplates
  };
});
