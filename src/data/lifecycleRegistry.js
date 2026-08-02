(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.LifecycleRegistry = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ENTITY_DEFINITIONS = {
    hr_master: entity({
      id: "hr_master",
      label: "HR Master",
      pageKey: "hr-shell",
      sourceOfTruth: "HR files only",
      targetEntities: ["hrProfiles", "riders"],
      requiredScope: ["city", "register"],
      identityKey: "iqama",
      notes: [
        "HR Master is the sponsored rider and sponsorship source of truth.",
        "If iqama exists in HR, riderSource must resolve to HR.",
        "External riders are not stored as HR identities."
      ]
    }),
    external_riders: entity({
      id: "external_riders",
      label: "External Riders Master",
      pageKey: "rider-master",
      sourceOfTruth: "External riders template",
      targetEntities: ["externalRiders", "riderOperationalProfiles", "riders"],
      requiredScope: ["city", "register", "platform"],
      identityKey: "iqama",
      notes: [
        "External riders stay separated from HR Master identities.",
        "If iqama already exists in HR, keep the HR identity and save only operational profile fields.",
        "If iqama is new, allow creating an external rider identity."
      ]
    }),
    rider_operational_profile: entity({
      id: "rider_operational_profile",
      label: "Rider Operational Profile",
      pageKey: "rider-master",
      sourceOfTruth: "Derived from HR, External Riders, and assignment imports",
      targetEntities: ["riderOperationalProfiles"],
      requiredScope: ["city", "register", "platform"],
      identityKey: "iqama",
      notes: [
        "Shared operational fields are stored separately from identity sources.",
        "The profile can point to either HR or External rider sources."
      ]
    }),
    dashboard_users: entity({
      id: "dashboard_users",
      label: "Dashboard Users",
      pageKey: "operations-shell",
      sourceOfTruth: "Platform dashboard exports",
      targetEntities: ["dashboardUsers", "operationalStatusReviews"],
      requiredScope: ["city", "register", "platform"],
      identityKey: "platform + register + city + courierId",
      notes: [
        "Missing users are marked dismissed in lifecycleStatus and never physically deleted.",
        "Lifecycle status is tracked separately from operational assignment state.",
        "Accepted active users can be marked ready for assignment."
      ]
    }),
    current_assignments: entity({
      id: "current_assignments",
      label: "Current Assignments",
      pageKey: "operations-shell",
      sourceOfTruth: "Operations assignments imports and direct actions",
      targetEntities: ["assignments", "dashboardUsers", "externalRiders", "riderOperationalProfiles", "riders"],
      requiredScope: ["city", "register", "platform"],
      identityKey: "platform + register + city + courierId + assignmentStartDate",
      notes: [
        "Operational metrics attach to the actual rider resolved by assignment period.",
        "Current assignments may introduce a new external rider when iqama is not found in HR or External Riders."
      ],
      rowActions: [
        "details",
        "first_assignment",
        "swap",
        "stop_without_replacement",
        "dismissal",
        "status_history",
        "operation_history"
      ]
    }),
    supporting_documents: entity({
      id: "supporting_documents",
      label: "Supporting Documents",
      pageKey: "hr-shell",
      sourceOfTruth: "Helper templates",
      targetEntities: ["riderOperationalProfiles", "riderPlatformAccounts"],
      requiredScope: ["city", "register", "platform"],
      identityKey: "iqama | courierId | document number",
      notes: [
        "Driver cards, licenses, health cards, and platform-account helper sheets are registered as supporting imports.",
        "They are linked through iqama, courierId, platform, register, city, or document number.",
        "They do not require full independent module pages in Prompt 8.5."
      ]
    }),
    performance_validity: entity({
      id: "performance_validity",
      label: "Performance + Validity Pipeline",
      pageKey: "performance-shell",
      sourceOfTruth: "Performance / VDA / Face / Delivery Experience reports",
      targetEntities: ["performanceDaily", "performanceMonthly", "validityResults", "performanceIssues"],
      requiredScope: ["city", "register", "platform"],
      identityKey: "platform + register + city + courierId + date",
      notes: [
        "Daily records must resolve to the actual rider by assignment period.",
        "Monthly grouping splits the same courier across multiple riders when assignments change in the same month."
      ]
    }),
    monthly_archive: entity({
      id: "monthly_archive",
      label: "Monthly Archive",
      pageKey: "monthly-closing-shell",
      sourceOfTruth: "Cycle close snapshot",
      targetEntities: ["monthlyArchiveSnapshots", "monthlyClosingBatches"],
      requiredScope: ["city", "register", "platform"],
      identityKey: "month + city + register + platform",
      notes: [
        "Current state is mutable, archive snapshots are immutable.",
        "No operational history is deleted when the month closes."
      ]
    })
  };

  var TEMPLATE_GROUPS = {
    performance_pipeline: templateGroup({
      id: "performance_pipeline",
      label: "Performance Pipeline",
      pageKey: "performance-shell",
      templateIds: ["daily_performance", "overall_performance", "vda", "face_verification", "delivery_experience"],
      notes: [
        "Overall performance imports can seed or cross-check daily rows.",
        "VDA, Face Verification, and Delivery Experience remain separate helper stages before validity."
      ]
    }),
    supporting_documents: templateGroup({
      id: "supporting_documents",
      label: "Supporting Documents",
      pageKey: "hr-shell",
      templateIds: ["hr_master"],
      supportingTemplateLabels: [
        "Driver Card",
        "Licenses",
        "Health Cards",
        "Keeta IDs",
        "HungerStation Data",
        "Jahez",
        "Chefz",
        "Ninja",
        "Amazon"
      ],
      notes: [
        "These supporting sources are registered for lifecycle planning and future template expansion.",
        "Prompt 8.5 keeps them as lightweight registered helper imports rather than full modules."
      ]
    })
  };

  var PAGE_IMPORT_ROUTES = [
    route({
      id: "hr_master_import",
      pageKey: "hr-shell",
      label: "HR Master Import",
      ownerModule: "HR Master",
      description: "Upload HR workbooks, preview required headers, validate, and save sponsored riders only.",
      templateIds: ["hr_master"],
      defaultImportType: "hr_master_workbook",
      defaultTargetEntity: "hrProfiles"
    }),
    route({
      id: "external_riders_import",
      pageKey: "rider-master",
      label: "External Riders Import",
      ownerModule: "External Riders",
      description: "Upload the external riders template, resolve HR vs External identity, and save operational profiles safely.",
      templateIds: ["external_riders"],
      defaultImportType: "external_riders_workbook",
      defaultTargetEntity: "externalRiders"
    }),
    route({
      id: "dashboard_users_import",
      pageKey: "operations-shell",
      label: "Dashboard Users Import",
      ownerModule: "Operations",
      description: "Update dashboard users, mark new/missing states, and prepare riders for assignment review.",
      templateIds: ["dashboard_users"],
      defaultImportType: "dashboard_users_workbook",
      defaultTargetEntity: "dashboardUsers"
    }),
    route({
      id: "current_assignments_import",
      pageKey: "operations-shell",
      label: "Current Assignments Import",
      ownerModule: "Operations",
      description: "Import current operational assignments and resolve the actual rider per courier and assignment period.",
      templateIds: ["current_assignments"],
      defaultImportType: "current_assignments_workbook",
      defaultTargetEntity: "assignments"
    }),
    route({
      id: "performance_pipeline_import",
      pageKey: "performance-shell",
      label: "Performance Pipeline Import",
      ownerModule: "Performance",
      description: "Use the import center to stage daily/overall/VDA/Face/Delivery reports before validity recalculation.",
      templateIds: ["daily_performance", "overall_performance", "vda", "face_verification", "delivery_experience"],
      defaultImportType: "performance_daily_csv",
      defaultTargetEntity: "performanceDaily"
    }),
    route({ id: "fleet_operating_vehicles_import", pageKey: "fleet-shell", label: "Fleet Operating Vehicles Import", ownerModule: "Fleet", description: "Preview and validate operating vehicles before explicit save.", templateIds: ["vehicles"], defaultImportType: "vehicle_workbook", defaultTargetEntity: "vehicles" }),
    route({ id: "vehicle_assignments_import", pageKey: "fleet-shell", label: "Vehicle Assignments Import", ownerModule: "Fleet", description: "Preview registered and actual vehicle assignment context separately.", templateIds: ["vehicles_movement"], defaultImportType: "vehicle_workbook", defaultTargetEntity: "vehicleAssignments" }),
    route({ id: "overall_performance_import", pageKey: "performance-shell", label: "Overall Performance Import", ownerModule: "Performance", description: "Stage overall performance before daily extraction.", templateIds: ["overall_performance"], defaultImportType: "overall_performance_workbook", defaultTargetEntity: "performanceMonthly" }),
    route({ id: "daily_performance_import", pageKey: "performance-shell", label: "Daily Performance Import", ownerModule: "Performance", description: "Stage date-scoped daily performance before validity.", templateIds: ["daily_performance"], defaultImportType: "performance_daily_csv", defaultTargetEntity: "performanceDaily" }),
    route({ id: "vda_import", pageKey: "performance-shell", label: "VDA Import", ownerModule: "Performance", description: "Stage VDA evidence before validity.", templateIds: ["vda"], defaultImportType: "company_vda", defaultTargetEntity: "vdaResults" }),
    route({ id: "face_verification_import", pageKey: "performance-shell", label: "Face Verification Import", ownerModule: "Performance", description: "Stage face verification evidence before validity.", templateIds: ["face_verification"], defaultImportType: "face_recognition", defaultTargetEntity: "faceVerification" }),
    route({ id: "delivery_experience_import", pageKey: "performance-shell", label: "Delivery Experience Import", ownerModule: "Performance", description: "Stage delivery experience evidence before validity.", templateIds: ["delivery_experience"], defaultImportType: "delivery_experience_workbook", defaultTargetEntity: "deliveryExperience" }),
    route({ id: "validity_results_import", pageKey: "performance-shell", label: "Validity Results Import", ownerModule: "Performance", description: "Read-only validity result context; no monthly close is performed.", templateIds: [], defaultImportType: "", defaultTargetEntity: "validityResults" })
  ];

  function entity(options) {
    return mergeObjects({
      id: "",
      identityKey: "",
      label: "",
      notes: [],
      pageKey: "",
      requiredScope: [],
      sourceOfTruth: "",
      targetEntities: []
    }, options || {});
  }

  function templateGroup(options) {
    return mergeObjects({
      id: "",
      label: "",
      notes: [],
      pageKey: "",
      supportingTemplateLabels: [],
      templateIds: []
    }, options || {});
  }

  function route(options) {
    return mergeObjects({
      defaultImportType: "",
      defaultTargetEntity: "",
      description: "",
      id: "",
      label: "",
      ownerModule: "",
      pageKey: "",
      templateIds: []
    }, options || {});
  }

  function listLifecycleEntities() {
    return Object.keys(ENTITY_DEFINITIONS).map(function (key) {
      return clone(ENTITY_DEFINITIONS[key]);
    });
  }

  function getLifecycleEntity(entityId) {
    return ENTITY_DEFINITIONS[entityId] ? clone(ENTITY_DEFINITIONS[entityId]) : null;
  }

  function listTemplateGroups() {
    return Object.keys(TEMPLATE_GROUPS).map(function (key) {
      return clone(TEMPLATE_GROUPS[key]);
    });
  }

  function getTemplateGroup(groupId) {
    return TEMPLATE_GROUPS[groupId] ? clone(TEMPLATE_GROUPS[groupId]) : null;
  }

  function listImportRoutes() {
    return PAGE_IMPORT_ROUTES.map(clone);
  }

  function resolveImportRoute(routeId) {
    var normalized = normalizeText(routeId);
    return clone(PAGE_IMPORT_ROUTES.filter(function (item) {
      return normalizeText(item.id) === normalized;
    })[0] || null);
  }

  function resolveRoutesForPage(pageKey) {
    var normalized = normalizePageKey(pageKey);
    return PAGE_IMPORT_ROUTES.filter(function (item) {
      return normalizePageKey(item.pageKey) === normalized;
    }).map(clone);
  }

  function createPageImportSummary(pageKey) {
    return resolveRoutesForPage(pageKey).map(function (item) {
      return {
        defaultImportType: item.defaultImportType,
        defaultTargetEntity: item.defaultTargetEntity,
        description: item.description,
        label: item.label,
        ownerModule: item.ownerModule,
        templateIds: item.templateIds.slice()
      };
    });
  }

  function normalizePageKey(pageKey) {
    var text = normalizeText(pageKey);
    return text.indexOf("page-") === 0 ? text.slice(5) : text;
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).replace(/\uFEFF/g, "").trim();
  }

  function clone(value) {
    return value == null ? null : JSON.parse(JSON.stringify(value));
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
    ENTITY_DEFINITIONS: clone(ENTITY_DEFINITIONS),
    PAGE_IMPORT_ROUTES: PAGE_IMPORT_ROUTES.map(clone),
    TEMPLATE_GROUPS: clone(TEMPLATE_GROUPS),
    createPageImportSummary: createPageImportSummary,
    getLifecycleEntity: getLifecycleEntity,
    getTemplateGroup: getTemplateGroup,
    listImportRoutes: listImportRoutes,
    listLifecycleEntities: listLifecycleEntities,
    listTemplateGroups: listTemplateGroups,
    normalizePageKey: normalizePageKey,
    resolveImportRoute: resolveImportRoute,
    resolveRoutesForPage: resolveRoutesForPage
  };
});
