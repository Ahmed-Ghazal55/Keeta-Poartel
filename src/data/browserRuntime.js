(function () {
  "use strict";

  var Portal = window.KeetaPortal;
  if (
    !Portal ||
    !Portal.DataStoreLib ||
    !Portal.DataAdapters ||
    !Portal.DataRepositories ||
    !Portal.AuditLogLib ||
    !Portal.DevDataResetLib ||
    !Portal.ImportRegistryLib ||
    !Portal.DevSession ||
    !Portal.RBAC
  ) {
    return;
  }
  var bootMode = Portal.BootMode && typeof Portal.BootMode.getState === "function"
    ? Portal.BootMode.getState()
    : { debugBoot: false, safeMode: false };
  var startupProfiler = Portal.StartupProfiler && typeof Portal.StartupProfiler.createStartupProfiler === "function"
    ? Portal.StartupProfiler.createStartupProfiler()
    : null;
  var fleetRebuildPolicy = Portal.FleetRebuildPolicy || null;
  var verificationProfiles = Portal.RuntimeVerificationProfiles || null;

  var memoryAdapter = Portal.DataAdapters.MemoryStore.createMemoryStore();
  var browserStorageProfile = resolveBrowserStorageProfile();
  var verificationScenarioId = resolveVerificationScenario();
  var browserAdapter = Portal.DataAdapters.BrowserLocalStore.createBrowserLocalStore({
    backupAdapter: memoryAdapter,
    prefix: browserStorageProfile
      ? "keeta.prompt2.runtime." + browserStorageProfile
      : "keeta.prompt2.runtime"
  });
  var dataStore = Portal.DataStoreLib.createDataStore({
    fallbackAdapter: memoryAdapter,
    primaryAdapter: browserAdapter
  });
  var repositories = Portal.DataRepositories.createRepositories(dataStore);
  var auditLog = Portal.AuditLogLib.createAuditLogService(dataStore);
  var auditCleanup = Portal.AuditLogCleanup && typeof Portal.AuditLogCleanup.createAuditLogCleanup === "function"
    ? Portal.AuditLogCleanup.createAuditLogCleanup({
        dataStore: dataStore,
        repository: auditLog.repository
      })
    : null;
  var importRegistry = Portal.ImportRegistryLib.createImportRegistry(dataStore);
  var auth = Portal.DevSession.createDevSessionManager({
    auditLog: auditLog,
    dataStore: dataStore
  });
  var fleetIntegration = Portal.FleetOperationsIntegration
    ? Portal.FleetOperationsIntegration.createFleetOperationsIntegration({
        auditLog: auditLog,
        rbac: Portal.RBAC,
        repositories: repositories
      })
    : null;
  var monthlyRulesService = Portal.MonthlyRulesService
    ? Portal.MonthlyRulesService.createMonthlyRulesService({
        auditLog: auditLog,
        dataStore: dataStore,
        rbac: Portal.RBAC
      })
    : null;
  var performanceService = Portal.PerformanceRecalculationService
    ? Portal.PerformanceRecalculationService.createPerformanceRecalculationService({
        auditLog: auditLog,
        dataStore: dataStore,
        monthlyRulesService: monthlyRulesService,
        rbac: Portal.RBAC
      })
    : null;
  var riderOperationalProfileService = Portal.RiderOperationalProfileService
    ? Portal.RiderOperationalProfileService.createRiderOperationalProfileService({
        auditLog: auditLog,
        dataStore: dataStore
      })
    : null;
  var riderResolverFacade = Portal.RiderResolverFacade
    ? Portal.RiderResolverFacade.createRiderResolverFacade({
        auditLog: auditLog,
        dataStore: dataStore,
        profileService: riderOperationalProfileService,
        repositories: repositories
      })
    : null;
  var importBatchService = Portal.ImportBatchServiceLib
    ? Portal.ImportBatchServiceLib.createImportBatchService({
        auditLog: auditLog,
        authManager: auth,
        dataStore: dataStore,
        fleetIntegration: fleetIntegration,
        importRegistry: importRegistry,
        performanceRecalculationService: performanceService,
        rbac: Portal.RBAC,
        xlsxLib: window.XLSX || null
      })
    : null;
  var devDataReset = Portal.DevDataResetLib && typeof Portal.DevDataResetLib.createDevDataResetService === "function"
    ? Portal.DevDataResetLib.createDevDataResetService({
        auditLog: auditLog,
        dataStore: dataStore
      })
    : null;
  var notificationCenter = Portal.NotificationCenter && typeof Portal.NotificationCenter.createNotificationCenter === "function"
    ? Portal.NotificationCenter.createNotificationCenter({
        repositories: repositories
      })
    : null;

  dataStore.seedCollections(buildReferenceCollections());
  if (!dataStore.getMeta(Portal.DevDataResetLib.DEMO_SEED_META_KEY)) {
    dataStore.seedCollections(buildDemoCollections());
  }
  applyVerificationScenarioSeed(verificationScenarioId);

  auth.ensureSeedData();
  auth.restoreSession();
  if (auditCleanup && !bootMode.safeMode) {
    try {
      var cleanupSummary = auditCleanup.cleanupExistingLogs();
      dataStore.setMeta("audit:lastCleanupRunId", cleanupSummary.cleanupRunId);
      dataStore.setMeta("audit:lastCleanupMovedCount", cleanupSummary.movedCount);
    } catch (_cleanupError) {
      // Keep the runtime available even if audit cleanup cannot complete.
    }
  }

  Portal.Runtime = {
    auditCleanup: auditCleanup,
    auditLog: auditLog,
    auth: auth,
    dataStore: dataStore,
    devDataReset: devDataReset,
    fleetIntegration: fleetIntegration,
    importBatchService: importBatchService,
    importRegistry: importRegistry,
    monthlyRulesService: monthlyRulesService,
    notificationCenter: notificationCenter,
    performanceService: performanceService,
    riderOperationalProfileService: riderOperationalProfileService,
    riderResolverFacade: riderResolverFacade,
    repositories: repositories
  };
  Portal.Runtime.bootMode = bootMode;
  Portal.Runtime.startupProfiler = startupProfiler;

  if (fleetIntegration && !bootMode.safeMode) {
    window.setTimeout(function () {
      try {
        var snapshot = {
          assignments: dataStore.getAll("assignments"),
          dashboardUsers: dataStore.getAll("dashboardUsers"),
          vehicleAssignments: dataStore.getAll("vehicleAssignments"),
          vehicleCapacityReviews: dataStore.getAll("vehicleCapacityReviews"),
          vehicleComplianceIssues: dataStore.getAll("vehicleComplianceIssues"),
          vehicleMovementEvents: dataStore.getAll("vehicleMovementEvents"),
          vehicles: dataStore.getAll("vehicles")
        };
        var nextHash = fleetRebuildPolicy && typeof fleetRebuildPolicy.createFleetSourceHash === "function"
          ? fleetRebuildPolicy.createFleetSourceHash(snapshot)
          : "";
        var hasDerivedCollections = fleetRebuildPolicy && typeof fleetRebuildPolicy.hasDerivedCollections === "function"
          ? fleetRebuildPolicy.hasDerivedCollections(snapshot)
          : (!!snapshot.vehicleAssignments.length && !!snapshot.vehicleCapacityReviews.length);
        var shouldRebuild = fleetRebuildPolicy && typeof fleetRebuildPolicy.shouldRebuildFleetDerived === "function"
          ? fleetRebuildPolicy.shouldRebuildFleetDerived({
              hasDerivedCollections: hasDerivedCollections,
              lastHash: dataStore.getMeta("fleet:lastDerivedSourceHash") || "",
              nextHash: nextHash
            })
          : !hasDerivedCollections;
        if (shouldRebuild) {
          if (startupProfiler) {
            startupProfiler.step("fleetIntegration.rebuildDerivedCollections", function () {
              fleetIntegration.rebuildDerivedCollections();
            }, { phase: "browserRuntime" });
          } else {
            fleetIntegration.rebuildDerivedCollections();
          }
          dataStore.setMeta("fleet:lastDerivedSourceHash", nextHash);
        }
      } catch (_error) {
        // Keep runtime available even if derived fleet collections fail to rebuild.
      }
    }, 0);
  }

  if (performanceService && !bootMode.safeMode) {
    window.setTimeout(function () {
      try {
        var hasDerivedPerformance = dataStore.getAll("performanceMonthly").length && dataStore.getAll("validityResults").length;
        var hasPerformanceSource = dataStore.getAll("performanceDaily").length || dataStore.getAll("vdaResults").length || dataStore.getAll("faceVerification").length;
        if (hasPerformanceSource && !hasDerivedPerformance) {
          var runRecalculation = function () {
            performanceService.runPerformanceRecalculationForScope({
              month: "2026-07",
              platform: "keeta"
            }, auth.getCurrentUser());
          };
          if (startupProfiler) {
            startupProfiler.step("performanceService.runPerformanceRecalculationForScope", runRecalculation, {
              phase: "browserRuntime"
            });
          } else {
            runRecalculation();
          }
        }
      } catch (_error) {
        // Keep the runtime available even if the demo recalculation fails.
      }
    }, 0);
  }

  function buildSeedAssignments() {
    return [
      {
        id: "assignment_seed_1",
        dashboardUserId: "1782916129257495",
        riderId: "rider_1",
        riderIqama: "2444000011",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        platform: "keeta",
        assignmentType: "first_assignment",
        startDate: "2026-07-01",
        status: "active"
      },
      {
        id: "assignment_seed_2",
        dashboardUserId: "1782831407480165",
        riderId: "rider_2",
        riderIqama: "2444000022",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        register: "TOGARY",
        platform: "keeta",
        assignmentType: "first_assignment",
        startDate: "2026-07-01",
        status: "active"
      }
    ];
  }

  function buildSeedRiders() {
    return [
      {
        id: "rider_1",
        primaryIqama: "2444000011",
        displayName: "Ahmed Salem",
        normalizedName: "ahmed salem",
        cities: ["\u062c\u062f\u0629"],
        registers: ["EXPRESS"],
        platforms: ["keeta"],
        currentWorkStatus: "working",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        status: "active"
      },
      {
        id: "rider_2",
        primaryIqama: "2444000022",
        displayName: "Bader Ali",
        normalizedName: "bader ali",
        cities: ["\u0627\u0644\u0631\u064a\u0627\u0636"],
        registers: ["TOGARY"],
        platforms: ["keeta"],
        currentWorkStatus: "working",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        register: "TOGARY",
        status: "active"
      }
    ];
  }

  function buildSeedHrProfiles() {
    return [
      {
        id: "hr_profile_1",
        employeeId: "EMP-1001",
        iqama: "2444000011",
        fullNameArabic: "Ahmed Salem",
        nationality: "Egyptian",
        branch: "\u062c\u062f\u0629",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        registerName: "EXPRESS GATE Company",
        employmentType: "sponsorship",
        hrStatus: "active",
        professionAtIqama: "Courier",
        jobTitle: "Rider",
        startDate: "2026-01-10",
        residencyExpiry: "2027-02-01",
        residencyStatus: "\u0633\u0627\u0631\u064a\u0629",
        sponsorId: "1010101010",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        licenseTypeSecondary: "\u0639\u0645\u0648\u0645\u064a",
        kafalaStatus: "\u0639\u0644\u0649 \u0627\u0644\u0643\u0641\u0627\u0644\u0629",
        licenseState: "\u0633\u0627\u0631\u064a\u0629",
        notes: "Seeded prompt 8 HR row"
      },
      {
        id: "hr_profile_2",
        employeeId: "EMP-1002",
        iqama: "2444000022",
        fullNameArabic: "Bader Ali",
        nationality: "Sudanese",
        branch: "\u0627\u0644\u0631\u064a\u0627\u0636",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        register: "TOGARY",
        registerName: "Togary",
        employmentType: "freelancer",
        hrStatus: "active",
        professionAtIqama: "Courier",
        jobTitle: "Rider",
        startDate: "2026-03-14",
        residencyExpiry: "2027-05-19",
        residencyStatus: "\u0633\u0627\u0631\u064a\u0629",
        sponsorId: "2020202020",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        licenseTypeSecondary: "\u0639\u0645\u0648\u0645\u064a",
        kafalaStatus: "\u062e\u0627\u0631\u062c\u064a",
        licenseState: "\u0633\u0627\u0631\u064a\u0629",
        notes: "Seeded prompt 8 HR row"
      },
      {
        id: "hr_profile_3",
        employeeId: "EMP-1003",
        iqama: "2444000033",
        fullNameArabic: "Salem Nasser",
        nationality: "Egyptian",
        branch: "\u062c\u062f\u0629",
        city: "\u062c\u062f\u0629",
        register: "ALBAWABA",
        registerName: "Albwaba",
        employmentType: "sponsorship",
        hrStatus: "active",
        professionAtIqama: "Courier",
        jobTitle: "Rider",
        startDate: "2026-04-20",
        residencyExpiry: "2027-08-01",
        residencyStatus: "\u0633\u0627\u0631\u064a\u0629",
        sponsorId: "3030303030",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        licenseTypeSecondary: "\u0639\u0645\u0648\u0645\u064a",
        kafalaStatus: "\u0639\u0644\u0649 \u0627\u0644\u0643\u0641\u0627\u0644\u0629",
        licenseState: "\u0633\u0627\u0631\u064a\u0629",
        notes: "Seeded ready-for-assignment owner profile."
      },
      {
        id: "hr_profile_4",
        employeeId: "EMP-1004",
        iqama: "2444000044",
        fullNameArabic: "Hassan Omar",
        nationality: "Pakistani",
        branch: "\u0627\u0644\u0631\u064a\u0627\u0636",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        register: "TOGARY",
        registerName: "Togary",
        employmentType: "freelancer",
        hrStatus: "under_review",
        professionAtIqama: "Courier",
        jobTitle: "Rider",
        startDate: "2026-06-05",
        residencyExpiry: "2027-06-20",
        residencyStatus: "\u0633\u0627\u0631\u064a\u0629",
        sponsorId: "4040404040",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        licenseTypeSecondary: "\u0639\u0645\u0648\u0645\u064a",
        kafalaStatus: "\u062e\u0627\u0631\u062c\u064a",
        licenseState: "\u0633\u0627\u0631\u064a\u0629",
        notes: "Seeded pending-review owner profile."
      },
      {
        id: "hr_profile_5",
        employeeId: "EMP-1005",
        iqama: "2444000055",
        fullNameArabic: "Khaled Amin",
        nationality: "Sudanese",
        branch: "\u062c\u062f\u0629",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        registerName: "EXPRESS GATE Company",
        employmentType: "sponsorship",
        hrStatus: "active",
        professionAtIqama: "Courier",
        jobTitle: "Rider",
        startDate: "2026-05-01",
        residencyExpiry: "2027-09-15",
        residencyStatus: "\u0633\u0627\u0631\u064a\u0629",
        sponsorId: "5050505050",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        licenseTypeSecondary: "\u0639\u0645\u0648\u0645\u064a",
        kafalaStatus: "\u0639\u0644\u0649 \u0627\u0644\u0643\u0641\u0627\u0644\u0629",
        licenseState: "\u0633\u0627\u0631\u064a\u0629",
        notes: "Seeded rejected owner profile."
      },
      {
        id: "hr_profile_6",
        employeeId: "EMP-1006",
        iqama: "2444000066",
        fullNameArabic: "Yousef Samir",
        nationality: "Egyptian",
        branch: "\u062c\u062f\u0629",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        registerName: "EXPRESS GATE Company",
        employmentType: "sponsorship",
        hrStatus: "active",
        professionAtIqama: "Courier",
        jobTitle: "Rider",
        startDate: "2026-02-11",
        residencyExpiry: "2027-11-03",
        residencyStatus: "\u0633\u0627\u0631\u064a\u0629",
        sponsorId: "6060606060",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        licenseTypeSecondary: "\u0639\u0645\u0648\u0645\u064a",
        kafalaStatus: "\u0639\u0644\u0649 \u0627\u0644\u0643\u0641\u0627\u0644\u0629",
        licenseState: "\u0633\u0627\u0631\u064a\u0629",
        notes: "Seeded missing-from-latest owner profile."
      }
    ];
  }

  function buildSeedPlatformAccounts() {
    return [
      {
        id: "platform_account_1",
        riderId: "rider_1",
        platform: "keeta",
        userId: "1782916129257495",
        dashboardUserId: "1782916129257495",
        iqama: "2444000011",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        vehicleType: "car",
        workMode: "salary_tiers",
        accountStatus: "active",
        activationStatus: "active"
      },
      {
        id: "platform_account_2",
        riderId: "rider_2",
        platform: "keeta",
        userId: "1782831407480165",
        dashboardUserId: "1782831407480165",
        iqama: "2444000022",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        register: "TOGARY",
        vehicleType: "bike",
        workMode: "salary_tiers",
        accountStatus: "active",
        activationStatus: "active"
      }
    ];
  }

  function buildSeedVehicles() {
    return [
      {
        id: "vehicle_jed_1001",
        vehicleSerial: "JED-CAR-1001",
        plateNumber: "JED-1001",
        registrationType: "public_transport",
        brand: "Toyota",
        model: "Yaris",
        opc: "OPC-1001",
        register: "EXPRESS",
        registerOwner: "EXPRESS",
        brandName: "EXPRESS GATE Company",
        availableRegistersText: "EXPRESS, ALBAWABA",
        currentBoundingAccounts: "1",
        usedByPartnerName: "Ahmed Salem",
        currentBranch: "\u062c\u062f\u0629 - EXPRESS",
        currentCity: "\u062c\u062f\u0629",
        targetedBranch: "EXPRESS",
        usedInCityCount: 1,
        vehicleType: "car",
        cityAndBranch: "\u062c\u062f\u0629 - EXPRESS",
        accountsRegisteredOnVehicle: "1782916129257495 - 2444000011 - Ahmed Salem",
        iqama1: "2444000011",
        iqama2: "",
        iqama3: "",
        iqama4: "",
        movementStatus: "\u0645\u062a\u0627\u062d\u0629",
        city: "\u062c\u062f\u0629",
        transportType: "public_transport",
        status: "available",
        assignableForDashboard: true
      },
      {
        id: "vehicle_ruh_2001",
        vehicleSerial: "RUH-BIKE-2001",
        plateNumber: "RUH-2001",
        registrationType: "public_transport",
        brand: "Yamaha",
        model: "NMAX",
        opc: "OPC-2001",
        register: "TOGARY",
        registerOwner: "TOGARY",
        brandName: "Togary",
        availableRegistersText: "TOGARY",
        currentBoundingAccounts: "1",
        usedByPartnerName: "Bader Ali",
        currentBranch: "\u0627\u0644\u0631\u064a\u0627\u0636 - TOGARY",
        currentCity: "\u0627\u0644\u0631\u064a\u0627\u0636",
        targetedBranch: "TOGARY",
        usedInCityCount: 1,
        vehicleType: "bike",
        cityAndBranch: "\u0627\u0644\u0631\u064a\u0627\u0636 - TOGARY",
        accountsRegisteredOnVehicle: "1782831407480165 - 2444000022 - Bader Ali",
        iqama1: "2444000022",
        iqama2: "",
        iqama3: "",
        iqama4: "",
        movementStatus: "\u0645\u0633\u0644\u0645\u0629 \u0644\u0645\u0646\u062f\u0648\u0628",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        transportType: "public_transport",
        status: "available",
        assignableForDashboard: true
      }
    ];
  }

  function buildSeedVehicleMovementEvents() {
    return [
      {
        id: "movement_1",
        vehicleId: "vehicle_jed_1001",
        vehicleSerial: "JED-CAR-1001",
        plateNumber: "JED-1001",
        city: "\u062c\u062f\u0629",
        branch: "EXPRESS",
        eventType: "received",
        eventDate: "2026-07-01",
        delegatedPersonName: "Fleet Ops",
        delegatedIqama: "2444999000",
        currentUserIqama: "2444000011",
        currentUserName: "Ahmed Salem",
        currentUserPhone: "966501112233",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        platform: "keeta",
        dashboardUserId: "1782916129257495",
        notes: "\u0645\u062a\u0627\u062d\u0629",
        status: "available"
      },
      {
        id: "movement_2",
        vehicleId: "vehicle_ruh_2001",
        vehicleSerial: "RUH-BIKE-2001",
        plateNumber: "RUH-2001",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        branch: "TOGARY",
        eventType: "handed_over",
        eventDate: "2026-07-02",
        delegatedPersonName: "Fleet Ops",
        delegatedIqama: "2444999001",
        currentUserIqama: "2444000022",
        currentUserName: "Bader Ali",
        currentUserPhone: "966509998877",
        licenseType: "\u0639\u0645\u0648\u0645\u064a",
        platform: "keeta",
        dashboardUserId: "1782831407480165",
        notes: "\u0645\u0633\u0644\u0645\u0629 \u0644\u0645\u0646\u062f\u0648\u0628",
        status: "handed_over"
      }
    ];
  }

  function buildSeedPerformanceDaily() {
    return [
      seedDaily("1782916129257495", "rider_1", "2444000011", "\u062c\u062f\u0629", "EXPRESS", "car", "2026-07-01", 22, 9),
      seedDaily("1782916129257495", "rider_1", "2444000011", "\u062c\u062f\u0629", "EXPRESS", "car", "2026-07-02", 21, 8.5),
      seedDaily("1782916129257495", "rider_1", "2444000011", "\u062c\u062f\u0629", "EXPRESS", "car", "2026-07-03", 19, 8),
      seedDaily("1782916129257495", "rider_1", "2444000011", "\u062c\u062f\u0629", "EXPRESS", "car", "2026-07-04", 12, 5),
      seedDaily("1782916129257495", "rider_1", "2444000011", "\u062c\u062f\u0629", "EXPRESS", "car", "2026-07-05", 24, 9.5),
      seedDaily("1782916129257495", "rider_1", "2444000011", "\u062c\u062f\u0629", "EXPRESS", "car", "2026-07-06", 18, 8),
      seedDaily("1782916129257495", "rider_1", "2444000011", "\u062c\u062f\u0629", "EXPRESS", "car", "2026-07-07", 20, 8.2),
      seedDaily("1782831407480165", "rider_2", "2444000022", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "bike", "2026-07-01", 12, 6),
      seedDaily("1782831407480165", "rider_2", "2444000022", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "bike", "2026-07-02", 10, 5.5),
      seedDaily("1782831407480165", "rider_2", "2444000022", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "bike", "2026-07-03", 8, 4.5),
      seedDaily("1782831407480165", "rider_2", "2444000022", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "bike", "2026-07-04", 14, 6.8),
      seedDaily("1782831407480165", "rider_2", "2444000022", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "bike", "2026-07-05", 11, 5.2)
    ];
  }

  function seedDaily(userId, riderId, iqama, city, register, vehicleType, date, completedOrders, workingHours) {
    return {
      id: "performanceDaily::" + register + "::" + userId + "::" + date,
      riderId: riderId,
      dashboardUserId: userId,
      userId: userId,
      iqama: iqama,
      platform: "keeta",
      city: city,
      register: register,
      vehicleType: vehicleType,
      workMode: register === "PER_ORDER_FR3PL" ? "per_order" : "salary_tiers",
      date: date,
      dateKey: date.replace(/-/g, ""),
      month: "2026-07",
      orders: completedOrders,
      completedOrders: completedOrders,
      deliveredTasks: completedOrders,
      cancelledOrders: 0,
      rejectedOrders: 0,
      workingHours: workingHours,
      onlineHours: workingHours,
      attendanceStatus: "present",
      validDayStatus: "under_review",
      validDayReasons: [],
      mandatoryDayStatus: "not_mandatory",
      status: "active",
      sourceFile: "seed_runtime"
    };
  }

  function buildSeedFaceVerification() {
    return [
      seedFace("1782916129257495", "rider_1", "\u062c\u062f\u0629", "EXPRESS", "2026-07-01", "pass"),
      seedFace("1782916129257495", "rider_1", "\u062c\u062f\u0629", "EXPRESS", "2026-07-02", "pass"),
      seedFace("1782916129257495", "rider_1", "\u062c\u062f\u0629", "EXPRESS", "2026-07-03", "pass"),
      seedFace("1782916129257495", "rider_1", "\u062c\u062f\u0629", "EXPRESS", "2026-07-04", "fail"),
      seedFace("1782831407480165", "rider_2", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "2026-07-01", "pass"),
      seedFace("1782831407480165", "rider_2", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "2026-07-02", "fail"),
      seedFace("1782831407480165", "rider_2", "\u0627\u0644\u0631\u064a\u0627\u0636", "TOGARY", "2026-07-03", "fail")
    ];
  }

  function seedFace(userId, riderId, city, register, date, result) {
    return {
      id: "faceVerification::" + register + "::" + userId + "::" + date,
      riderId: riderId,
      userId: userId,
      dashboardUserId: userId,
      platform: "keeta",
      city: city,
      register: register,
      status: result,
      result: result,
      date: date,
      dateKey: date.replace(/-/g, ""),
      month: "2026-07",
      sourceFile: "seed_runtime"
    };
  }

  function buildSeedVdaResults() {
    return [
      {
        id: "vdaResults::EXPRESS::1782916129257495::2026-07",
        riderId: "rider_1",
        userId: "1782916129257495",
        dashboardUserId: "1782916129257495",
        platform: "keeta",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        status: "valid",
        month: "2026-07",
        deliveredTasks: 136,
        vehicleType: "car",
        sourceFile: "seed_runtime"
      },
      {
        id: "vdaResults::TOGARY::1782831407480165::2026-07",
        riderId: "rider_2",
        userId: "1782831407480165",
        dashboardUserId: "1782831407480165",
        platform: "keeta",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        register: "TOGARY",
        status: "invalid",
        month: "2026-07",
        deliveredTasks: 55,
        vehicleType: "bike",
        sourceFile: "seed_runtime"
      }
    ];
  }

  function buildSeedDeliveryExperience() {
    return [
      {
        id: "deliveryExperience::EXPRESS::1782916129257495::2026-07",
        riderId: "rider_1",
        userId: "1782916129257495",
        dashboardUserId: "1782916129257495",
        platform: "keeta",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        vehicleType: "car",
        month: "2026-07",
        status: "review",
        level: "A",
        estimatedBonusAmount: 2000,
        sourceFile: "seed_runtime"
      },
      {
        id: "deliveryExperience::TOGARY::1782831407480165::2026-07",
        riderId: "rider_2",
        userId: "1782831407480165",
        dashboardUserId: "1782831407480165",
        platform: "keeta",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        register: "TOGARY",
        vehicleType: "bike",
        month: "2026-07",
        status: "review",
        level: "D",
        estimatedBonusAmount: 400,
        sourceFile: "seed_runtime"
      }
    ];
  }

  function buildSeedMonthlyRules() {
    if (!Portal.MonthlyRulesDefaults || typeof Portal.MonthlyRulesDefaults.createDefaultMonthlyRule !== "function") {
      return [
        { id: "monthly_rule_2026_07_jed_express_v1", month: "2026-07", city: "\u062c\u062f\u0629", register: "EXPRESS", status: "active", platform: "keeta" }
      ];
    }

    return [
      Portal.MonthlyRulesDefaults.createDefaultMonthlyRule({
        id: "monthly_rule_2026_07_jed_express_v1",
        month: "2026-07",
        city: "\u062c\u062f\u0629",
        cityScope: "single",
        selectedCities: ["\u062c\u062f\u0629"],
        register: "EXPRESS",
        registerScope: "single",
        selectedRegisters: ["EXPRESS"],
        status: "active",
        effectiveFrom: "2026-07-01",
        effectiveTo: "2026-07-31",
        notes: "Seeded July 2026 Jeddah EXPRESS rule for Monthly Rules Manager.",
        mandatoryDaysRules: {
          enabled: true,
          mandatoryDates: ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"],
          minRequiredValidMandatoryDays: 7,
          allowMissedMandatoryDays: 0
        },
        orderRules: {
          enabled: true,
          mandatoryDayMinOrders: 6,
          regularDayMinOrders: 3
        },
        salaryEligibilityRules: {
          enabled: true,
          minimumValidDays: 6,
          minimumOrdersCar: 330,
          minimumOrdersBike: 350
        }
      }),
      Portal.MonthlyRulesDefaults.createDefaultMonthlyRule({
        id: "monthly_rule_2026_08_ruh_togary_v1",
        month: "2026-08",
        city: "\u0627\u0644\u0631\u064a\u0627\u0636",
        cityScope: "single",
        selectedCities: ["\u0627\u0644\u0631\u064a\u0627\u0636"],
        register: "TOGARY",
        registerScope: "single",
        selectedRegisters: ["TOGARY"],
        status: "draft",
        notes: "Seeded draft for August Riyadh Togary rule review.",
        mandatoryDaysRules: {
          enabled: true,
          mandatoryWeekdays: ["Sunday", "Monday"],
          minRequiredValidMandatoryDays: 2,
          allowMissedMandatoryDays: 1
        }
      })
    ];
  }

  function buildReferenceCollections() {
    return {
      cities: [
        { id: "city_jeddah", name: "\u062c\u062f\u0629", code: "JED", status: "active" },
        { id: "city_riyadh", name: "\u0627\u0644\u0631\u064a\u0627\u0636", code: "RUH", status: "active" }
      ],
      registers: [
        { id: "register_express", name: "EXPRESS GATE Company", code: "EXPRESS", city: "\u062c\u062f\u0629", status: "active" },
        { id: "register_albwaba", name: "Albwaba", code: "ALBAWABA", city: "\u062c\u062f\u0629", status: "active" },
        { id: "register_togary", name: "Togary", code: "TOGARY", city: "\u0627\u0644\u0631\u064a\u0627\u0636", status: "active" },
        { id: "register_per_order_fr3pl", name: "Per Order / FR 3PL", code: "PER_ORDER_FR3PL", city: "\u0627\u0644\u0631\u064a\u0627\u0636", status: "active" }
      ]
    };
  }

  function buildDemoCollections() {
    return {
      assignments: buildSeedAssignments(),
      dashboardUsers: [
        { id: "dash_user_1", userId: "1782916129257495", dashboardUserId: "1782916129257495", city: "\u062c\u062f\u0629", register: "EXPRESS", status: "working", employmentStatus: "In Service", activationStatus: "Accepted", reviewStatus: "ok", lifecycleStatus: "active_assigned", assignmentReadiness: "already_assigned", fullName: "Ahmed Salem", ownerName: "Ahmed Salem", vehicleType: "car", vehicleSerial: "JED-CAR-1001", plateNumber: "JED-1001", platform: "keeta", currentRiderId: "rider_1", currentRiderIqama: "2444000011", currentRiderName: "Ahmed Salem", ownerIqama: "2444000011", currentAssignmentId: "assignment_seed_1", assignmentStatus: "active", latestImportPresence: "present", operationMode: "salary_tiers" },
        { id: "dash_user_2", userId: "1782831407480165", dashboardUserId: "1782831407480165", city: "\u0627\u0644\u0631\u064a\u0627\u0636", register: "TOGARY", status: "working", employmentStatus: "In Service", activationStatus: "Accepted", reviewStatus: "ok", lifecycleStatus: "active_assigned", assignmentReadiness: "already_assigned", fullName: "Bader Ali", ownerName: "Bader Ali", vehicleType: "bike", vehicleSerial: "RUH-BIKE-2001", plateNumber: "RUH-2001", platform: "keeta", currentRiderId: "rider_2", currentRiderIqama: "2444000022", currentRiderName: "Bader Ali", ownerIqama: "2444000022", currentAssignmentId: "assignment_seed_2", assignmentStatus: "active", latestImportPresence: "present", operationMode: "salary_tiers" },
        { id: "dash_user_3", userId: "1782999000333001", dashboardUserId: "1782999000333001", city: "\u062c\u062f\u0629", register: "ALBAWABA", status: "new", employmentStatus: "In Service", activationStatus: "Accepted", reviewStatus: "needs_assignment", lifecycleStatus: "new", assignmentReadiness: "ready_for_assignment", assignmentReadinessIssues: ["new_user_needs_assignment", "accepted_user_without_assignment"], assignmentReadinessReason: "new_user_needs_assignment", fullName: "Salem Nasser", ownerName: "Salem Nasser", ownerIqama: "2444000033", phoneNumber: "966501110033", vehicleType: "car", vehicleSerial: "JED-CAR-NEW3", plateNumber: "JED-3003", platform: "keeta", latestImportPresence: "present", operationMode: "salary_tiers", firstSeenAt: "2026-07-14T09:00:00.000Z", lastSeenAt: "2026-07-15T09:00:00.000Z" },
        { id: "dash_user_4", userId: "1782999000444001", dashboardUserId: "1782999000444001", city: "\u0627\u0644\u0631\u064a\u0627\u0636", register: "TOGARY", status: "under_review", employmentStatus: "In Service", activationStatus: "Pending Review", reviewStatus: "needs_review", lifecycleStatus: "pending_review", assignmentReadiness: "under_review", assignmentReadinessIssues: ["user_pending_review"], assignmentReadinessReason: "user_pending_review", fullName: "Hassan Omar", ownerName: "Hassan Omar", ownerIqama: "2444000044", phoneNumber: "966501110044", vehicleType: "bike", vehicleSerial: "RUH-BIKE-4004", plateNumber: "RUH-4004", platform: "keeta", latestImportPresence: "present", operationMode: "salary_tiers" },
        { id: "dash_user_5", userId: "1782999000555001", dashboardUserId: "1782999000555001", city: "\u062c\u062f\u0629", register: "EXPRESS", status: "rejected", employmentStatus: "In Service", activationStatus: "Rejected", reviewStatus: "needs_review", lifecycleStatus: "rejected", assignmentReadiness: "rejected", assignmentReadinessIssues: ["user_rejected_documents"], assignmentReadinessReason: "user_rejected_documents", fullName: "Khaled Amin", ownerName: "Khaled Amin", ownerIqama: "2444000055", phoneNumber: "966501110055", vehicleType: "car", vehicleSerial: "JED-CAR-5005", plateNumber: "JED-5005", platform: "keeta", documentChangeStatus: "Rejected", latestImportPresence: "present", operationMode: "salary_tiers" },
        { id: "dash_user_6", userId: "1782999000666001", dashboardUserId: "1782999000666001", city: "\u062c\u062f\u0629", register: "EXPRESS", status: "not_working", employmentStatus: "In Service", activationStatus: "Accepted", reviewStatus: "missing_from_latest_import", lifecycleStatus: "missing_from_latest_snapshot", assignmentReadiness: "missing_from_latest_snapshot", assignmentReadinessIssues: ["user_missing_from_latest_snapshot"], assignmentReadinessReason: "user_missing_from_latest_snapshot", fullName: "Yousef Samir", ownerName: "Yousef Samir", ownerIqama: "2444000066", phoneNumber: "966501110066", vehicleType: "car", vehicleSerial: "JED-CAR-6006", plateNumber: "JED-6006", platform: "keeta", missingFromLatestImport: true, latestImportPresence: "missing", operationMode: "salary_tiers", handoverDate: "2026-06-20", assignmentStatus: "ended" }
      ],
      deliveryExperience: buildSeedDeliveryExperience(),
      externalRiders: buildSeedExternalRiders(),
      faceVerification: buildSeedFaceVerification(),
      hrProfiles: buildSeedHrProfiles(),
      monthlyRules: buildSeedMonthlyRules(),
      performanceDaily: buildSeedPerformanceDaily(),
      riders: buildSeedRiders(),
      riderOperationalProfiles: buildSeedRiderOperationalProfiles(),
      riderPlatformAccounts: buildSeedPlatformAccounts(),
      riderVehicleUsageHistory: buildSeedRiderVehicleUsageHistory(),
      vdaResults: buildSeedVdaResults(),
      vehicleMovementEvents: buildSeedVehicleMovementEvents(),
      vehicles: buildSeedVehicles()
    };
  }

  function applyVerificationScenarioSeed(scenarioId) {
    scenarioId = String(scenarioId || "").trim();
    if (!scenarioId || !verificationProfiles || typeof verificationProfiles.applyScenarioToCollections !== "function") {
      return;
    }
    var expectedSignature = typeof verificationProfiles.getScenarioSignature === "function"
      ? verificationProfiles.getScenarioSignature(scenarioId)
      : "";
    if (!expectedSignature) {
      return;
    }
    if (dataStore.getMeta("runtime:verificationScenarioSignature") === expectedSignature) {
      return;
    }
    var scenarioCollections = verificationProfiles.applyScenarioToCollections(buildDemoCollections(), scenarioId);
    Object.keys(scenarioCollections || {}).forEach(function (entityName) {
      dataStore.save(entityName, scenarioCollections[entityName]);
    });
    dataStore.setMeta("runtime:verificationScenarioId", scenarioId);
    dataStore.setMeta("runtime:verificationScenarioSignature", expectedSignature);
    dataStore.setMeta(Portal.DevDataResetLib.DEMO_SEED_META_KEY, "scenario:" + scenarioId);
  }

  function buildSeedExternalRiders() {
    return [
      {
        id: "externalRiders::2999000099::mohamed_adel::966550001122",
        sourceTimestamp: "2026-07-10T09:15:00.000Z",
        iqama: "2999000099",
        fullName: "Mohamed Adel",
        contactPhone: "966550001122",
        riderType: "external",
        vehicleDisplay: "Car",
        gasCard: "Yes",
        tools: "Bag + Uniform",
        nationality: "Egyptian",
        appPhone: "966550009988",
        iban: "SA0380000000608010167519",
        currentUserDisplay: "",
        createdByEmail: "ops.supervisor@example.com",
        updatedByEmail: "ops.supervisor@example.com",
        city: "\u062c\u062f\u0629",
        register: "EXPRESS",
        platform: "keeta",
        notes: "Seeded external rider for Prompt 8.6 resolver workflow.",
        status: "active"
      }
    ];
  }

  function buildSeedRiderOperationalProfiles() {
    return [
      {
        id: "riderOperationalProfiles::2444000011::rider_1",
        iqama: "2444000011",
        riderId: "rider_1",
        riderSource: "HR",
        contactPhone: "966501112233",
        appPhone: "966501112233",
        iban: "SA0300000000001111111111",
        gasCard: "Company Card 01",
        tools: "Bag + Uniform",
        currentUserSummary: "1782916129257495 / \u062c\u062f\u0629 / EXPRESS",
        preferredPlatform: "keeta",
        preferredCity: "\u062c\u062f\u0629",
        preferredRegister: "EXPRESS",
        lastUpdatedBy: "seed_runtime",
        lastUpdatedAt: "2026-07-10T09:00:00.000Z",
        notes: "Seeded HR operational profile."
      },
      {
        id: "riderOperationalProfiles::2999000099::",
        iqama: "2999000099",
        riderId: "",
        riderSource: "External",
        contactPhone: "966550001122",
        appPhone: "966550009988",
        iban: "SA0380000000608010167519",
        gasCard: "Yes",
        tools: "Bag + Uniform",
        currentUserSummary: "",
        preferredPlatform: "keeta",
        preferredCity: "\u062c\u062f\u0629",
        preferredRegister: "EXPRESS",
        lastUpdatedBy: "seed_runtime",
        lastUpdatedAt: "2026-07-10T09:15:00.000Z",
        notes: "Seeded external operational profile."
      }
    ];
  }

  function buildSeedRiderVehicleUsageHistory() {
    return [
      {
        id: "riderVehicleUsageHistory::2444000011::JED-CAR-1001::2026-07-01",
        riderIqama: "2444000011",
        riderName: "Ahmed Salem",
        riderSource: "HR",
        vehicleSource: "company",
        vehicleType: "car",
        vehicleSerial: "JED-CAR-1001",
        plateNumber: "JED-1001",
        vehicleRegister: "EXPRESS",
        city: "\u062c\u062f\u0629",
        platform: "keeta",
        startDate: "2026-07-01",
        endDate: "",
        active: true,
        sourceOperation: "seed_runtime",
        createdBy: "seed_runtime",
        status: "active",
        notes: "Seeded active usage for HR rider."
      },
      {
        id: "riderVehicleUsageHistory::2999000099::JED-CAR-NEW1::2026-07-10",
        riderIqama: "2999000099",
        riderName: "Mohamed Adel",
        riderSource: "External",
        vehicleSource: "private",
        vehicleType: "car",
        vehicleSerial: "JED-CAR-NEW1",
        plateNumber: "JED-9099",
        vehicleRegister: "EXPRESS",
        city: "\u062c\u062f\u0629",
        platform: "keeta",
        startDate: "2026-07-10",
        endDate: "",
        active: true,
        sourceOperation: "seed_runtime",
        createdBy: "seed_runtime",
        status: "active",
        notes: "Seeded active usage for external rider."
      }
    ];
  }

  function resolveBrowserStorageProfile() {
    if (typeof window === "undefined" || !window.location || typeof window.location.search !== "string") {
      return "";
    }
    try {
      var params = new URLSearchParams(window.location.search || "");
      return normalizeStorageProfile(params.get("storageProfile"));
    } catch (_error) {
      return "";
    }
  }

  function resolveVerificationScenario() {
    if (!verificationProfiles || typeof verificationProfiles.resolveScenario !== "function") {
      return "";
    }
    try {
      var params = new URLSearchParams(window && window.location ? window.location.search || "" : "");
      return verificationProfiles.resolveScenario({
        storageProfile: browserStorageProfile,
        verify: params.get("verify")
      });
    } catch (_error) {
      return "";
    }
  }

  function normalizeStorageProfile(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
  }
})();
