(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("../import/headerMapper.js"),
      require("./vehicleComputedFieldsService.js"),
      require("./vehicleMovementService.js"),
      require("./vehicleValidator.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VehicleNormalizer = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.HeaderMapper,
    root.KeetaPortal.VehicleComputedFieldsService,
    root.KeetaPortal.VehicleMovementService,
    root.KeetaPortal.VehicleValidator
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HeaderMapper, ComputedFields, VehicleMovementService, VehicleValidator) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function normalizeOperatingVehicleRows(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["vehicleSerial"]);
    var baseRows = rows.map(function (row, index) {
      var vehicleSerial = normalizeText(HeaderMapper.getValue(row, mapping, "vehicleSerial"));
      if (!vehicleSerial) {
        return null;
      }
      var record = {
        id: stableId("vehicles", [vehicleSerial]),
        vehicleSerial: vehicleSerial,
        plateNumber: normalizeText(HeaderMapper.getValue(row, mapping, "plateNumber")) || normalizeText(row["رقم اللوحة"]),
        registrationType: normalizeText(HeaderMapper.getValue(row, mapping, "registrationType")) || normalizeText(row["نوع التسجيل"]),
        brand: normalizeText(HeaderMapper.getValue(row, mapping, "brand")) || normalizeText(row["الماركة"]),
        model: normalizeText(HeaderMapper.getValue(row, mapping, "model")) || normalizeText(row["الطراز"]),
        opc: normalizeText(HeaderMapper.getValue(row, mapping, "opc")) || normalizeText(row.OPC),
        register: normalizeText(HeaderMapper.getValue(row, mapping, "register")) || normalizeText(row["السجل"]),
        registerOwner: normalizeText(HeaderMapper.getValue(row, mapping, "registerOwner")) || normalizeText(row["السجل المالك"]),
        brandName: normalizeText(HeaderMapper.getValue(row, mapping, "brandName")) || normalizeText(row["Brand Name"]),
        availableRegistersText: normalizeText(HeaderMapper.getValue(row, mapping, "availableRegistersText")) || normalizeText(row["السجلات المتاحه للاستخدام"]),
        currentBoundingAccounts: normalizeText(HeaderMapper.getValue(row, mapping, "currentBoundingAccounts")) || normalizeText(row["current bounding accounts"]),
        usedByPartnerName: normalizeText(HeaderMapper.getValue(row, mapping, "usedByPartnerName")) || normalizeText(row["used by how name partner"]),
        currentBranch: normalizeText(HeaderMapper.getValue(row, mapping, "currentBranch")) || normalizeText(row["Current branch"]),
        currentCity: normalizeText(HeaderMapper.getValue(row, mapping, "currentCity")) || normalizeText(row["Current City"]),
        targetedBranch: normalizeText(HeaderMapper.getValue(row, mapping, "targetedBranch")) || normalizeText(row["Targeted Branch"]),
        usedInCityCount: parseInteger(HeaderMapper.getValue(row, mapping, "usedInCityCount") || row["In how many city is it used?"]),
        vehicleType: normalizeText(HeaderMapper.getValue(row, mapping, "vehicleType")) || normalizeText(row["Vehicle Type"]),
        cityAndBranch: normalizeText(HeaderMapper.getValue(row, mapping, "cityAndBranch")) || normalizeText(row["City & Pranch"]),
        accountsRegisteredOnVehicle: normalizeText(HeaderMapper.getValue(row, mapping, "accountsRegisteredOnVehicle")) || normalizeText(row["Accounts registered on the vehicle"]),
        iqama1: normalizeText(HeaderMapper.getValue(row, mapping, "iqama1")) || normalizeText(row["Iqama 1"]),
        iqama2: normalizeText(HeaderMapper.getValue(row, mapping, "iqama2")) || normalizeText(row["Iqama 2"]),
        iqama3: normalizeText(HeaderMapper.getValue(row, mapping, "iqama3")) || normalizeText(row["Iqama 3"]),
        iqama4: normalizeText(HeaderMapper.getValue(row, mapping, "iqama4")) || normalizeText(row["Iqama 4"]),
        movementStatus: normalizeText(HeaderMapper.getValue(row, mapping, "movementStatus")) || normalizeText(row["Vehicle movement status"]),
        city: normalizeText(HeaderMapper.getValue(row, mapping, "city")) || normalizeText(row["مدينة المركبة الفعلية"]) || normalizeText(row["Current City"]),
        transportType: VehicleValidator.normalizeTransportType(HeaderMapper.getValue(row, mapping, "registrationType") || row["نوع التسجيل"]),
        status: normalizeText(HeaderMapper.getValue(row, mapping, "movementStatus")) || normalizeText(row["الوضع الفعلي للمركبة"]) || "available",
        assignableForDashboard: VehicleValidator.isAssignableVehicle({
          registrationType: normalizeText(HeaderMapper.getValue(row, mapping, "registrationType") || row["نوع التسجيل"]),
          movementStatus: normalizeText(row["Vehicle movement status"]),
          status: normalizeText(row["الوضع الفعلي للمركبة"])
        }),
        sourceFile: importRecord.sourceFileName || "",
        sourceSheet: inferSourceSheetName(importRecord),
        sourceRow: index + 2,
        importBatchId: importRecord.id || ""
      };
      return ComputedFields.computeOperatingVehicleDisplayRow(record, {
        vehicleMovementEvents: [],
        vehicleUpdateRows: rows.map(toVehicleUpdateRow),
        vehicles: []
      });
    }).filter(Boolean);

    return baseRows;
  }

  function normalizeVehicleMovementRows(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["vehicleSerial"]);
    return rows.map(function (row, index) {
      var vehicleSerial = normalizeText(HeaderMapper.getValue(row, mapping, "vehicleSerial")) || normalizeText(row["الرقم التسلسلي"]);
      if (!vehicleSerial) {
        return null;
      }
      return VehicleMovementService.createVehicleMovementEvent({
        vehicleSerial: vehicleSerial,
        plateNumber: normalizeText(HeaderMapper.getValue(row, mapping, "newPlateNumber")) || normalizeText(row["اللوحة الجديدة"]),
        city: normalizeText(HeaderMapper.getValue(row, mapping, "city")) || inferCityFromBranch(normalizeText(row["الفرع"])),
        branch: normalizeText(HeaderMapper.getValue(row, mapping, "branch")) || normalizeText(row["الفرع"]),
        eventDate: normalizeText(HeaderMapper.getValue(row, mapping, "receiptDate")) || normalizeText(row["تاريخ الإستلام"]),
        delegatedPersonName: normalizeText(HeaderMapper.getValue(row, mapping, "delegatedPersonName")) || normalizeText(row["اسم المفوض"]),
        delegatedIqama: normalizeText(HeaderMapper.getValue(row, mapping, "delegatedIqama")) || normalizeText(row["رقم إقامة المفوض"]),
        currentUserIqama: normalizeText(HeaderMapper.getValue(row, mapping, "currentUserIqama")) || normalizeText(row["رقم اقامة المستخدم"]),
        currentUserName: normalizeText(HeaderMapper.getValue(row, mapping, "currentUserName")) || normalizeText(row["الإسم"]),
        currentUserPhone: normalizeText(HeaderMapper.getValue(row, mapping, "currentUserPhone")) || normalizeText(row["رقم جوال المستخدم"]),
        licenseType: normalizeText(HeaderMapper.getValue(row, mapping, "licenseType")) || normalizeText(row["نوع الرخصة"]),
        platform: normalizeText(HeaderMapper.getValue(row, mapping, "platform")) || normalizeText(row["تطبيق العمل"]),
        dashboardUserId: normalizeText(HeaderMapper.getValue(row, mapping, "userId")) || normalizeText(row["رقم الأيدي"]),
        primaryStatus: normalizeText(HeaderMapper.getValue(row, mapping, "movementStatus")) || normalizeText(row["الحالة"]),
        secondaryStatus: normalizeText(HeaderMapper.getValue(row, mapping, "movementStatusSecondary")) || normalizeText(row.D),
        notes: normalizeText(HeaderMapper.getValue(row, mapping, "notes")) || normalizeText(row["ملاحظات"]),
        sourceFile: importRecord.sourceFileName || "",
        sourceSheet: inferSourceSheetName(importRecord),
        sourceRow: index + 2
      }, {
        fallbackDate: new Date().toISOString().slice(0, 10)
      });
    }).filter(Boolean);
  }

  function toVehicleUpdateRow(row) {
    return {
      Branch: normalizeText(row.Branch || row["Current branch"]),
      IQAMA: normalizeText(row.IQAMA || row["Iqama 1"]),
      NAME: normalizeText(row.NAME),
      brandName: normalizeText(row.brand_name || row["Brand Name"]),
      city: normalizeText(row["Current City"]),
      courier_id: normalizeText(row.courier_id),
      currentBoundingAccounts: normalizeText(row["current bounding accounts"]),
      register: normalizeText(row["السجل"]),
      usedByPartnerName: normalizeText(row["used by how name partner"]),
      vehicleSerial: normalizeText(row.vehicle_sequence_number || row["الرقم التسلسلي"]),
      vehicleType: normalizeText(row["Vehicle Type"])
    };
  }

  function getRows(importRecord) {
    var analysis = importRecord.analysis || {};
    if (analysis.tableSummary && Array.isArray(analysis.tableSummary.rows)) {
      return analysis.tableSummary.rows;
    }
    if (analysis.workbookSummary && Array.isArray(analysis.workbookSummary.bestRows)) {
      return analysis.workbookSummary.bestRows;
    }
    return [];
  }

  function getMapping(importRecord, requiredFields) {
    var analysis = importRecord.analysis || {};
    if (importRecord.mapping && importRecord.mapping.byField && Object.keys(importRecord.mapping.byField).length) {
      return importRecord.mapping;
    }
    if (analysis.tableSummary && analysis.tableSummary.mapping) {
      return analysis.tableSummary.mapping;
    }
    if (analysis.workbookSummary && analysis.workbookSummary.bestMapping) {
      return analysis.workbookSummary.bestMapping;
    }
    return HeaderMapper.mapHeaders(importRecord.headers || [], requiredFields || []);
  }

  function inferSourceSheetName(importRecord) {
    var sheetNames = importRecord.sheetNames || importRecord.analysis && importRecord.analysis.workbookSummary && importRecord.analysis.workbookSummary.sheetNames || [];
    return sheetNames[0] || "";
  }

  function inferCityFromBranch(branch) {
    var text = normalizeText(branch);
    if (/جدة|jeddah/i.test(text)) {
      return "جدة";
    }
    if (/الرياض|riyadh/i.test(text)) {
      return "الرياض";
    }
    return "";
  }

  function parseInteger(value) {
    var numeric = parseInt(String(value == null ? "" : value).replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/\s+/g, "_");
    }).join("::");
  }

  return {
    normalizeOperatingVehicleRows: normalizeOperatingVehicleRows,
    normalizeVehicleMovementRows: normalizeVehicleMovementRows
  };
});
