(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const Config = {
    referenceAvailability: {
      workbookName: "Updata_Vehicles (5).xlsx",
      workbookFoundInWorkspace: true,
      note:
        "ملف Excel المرجعي موجود داخل مساحة العمل، لكن المتصفح يحتاج رفعه يدويًا داخل الصفحة لتحليل الصيغ فعليًا.",
    },
    salary: {
      baseFare: 6.5,
      kmRate: 0.6,
      averageKm: { car: 8.5, bike: 3.5 },
      monthlyCommission: 2500,
      monthlyHousing: 200,
      monthlyRent: { car: 1800, bike: 800 },
      validityDaysRequired: 6,
      minimumOrders: { car: 330, bike: 350 },
      validityTiers: {
        car: [
          { tier: "A", minOrders: 600, incentive: 2600 },
          { tier: "B", minOrders: 500, incentive: 2100 },
          { tier: "C", minOrders: 415, incentive: 1800 },
          { tier: "D", minOrders: 330, incentive: 1200 },
          { tier: "E", minOrders: 0, incentive: 0 },
        ],
        bike: [
          { tier: "A", minOrders: 650, incentive: 2000 },
          { tier: "B", minOrders: 550, incentive: 1200 },
          { tier: "C", minOrders: 450, incentive: 1000 },
          { tier: "D", minOrders: 350, incentive: 600 },
          { tier: "E", minOrders: 0, incentive: 0 },
        ],
      },
      experienceLevels: {
        car: { A: 2000, B: 1500, C: 1000, NONE: 0 },
        bike: { A: 1200, B: 800, C: 400, NONE: 0 },
      },
    },
    shifts: {
      templates: {
        standard6: [
          { code: "S1", label: "شفت 1", time: "12 AM - 3 AM", target: 8, max: 12 },
          { code: "S2", label: "شفت 2", time: "3 AM - 8 AM", target: 14, max: 18 },
          { code: "S3", label: "شفت 3", time: "8 AM - 12 PM", target: 18, max: 22 },
          { code: "S4", label: "شفت 4", time: "12 PM - 4 PM", target: 22, max: 26 },
          { code: "S5", label: "شفت 5", time: "4 PM - 8 PM", target: 24, max: 28 },
          { code: "S6", label: "شفت 6", time: "8 PM - 12 AM", target: 20, max: 24 },
        ],
        standard5: [
          { code: "S1", label: "شفت 1", time: "6 AM - 10 AM", target: 14, max: 18 },
          { code: "S2", label: "شفت 2", time: "10 AM - 2 PM", target: 18, max: 22 },
          { code: "S3", label: "شفت 3", time: "2 PM - 6 PM", target: 24, max: 28 },
          { code: "S4", label: "شفت 4", time: "6 PM - 10 PM", target: 28, max: 32 },
          { code: "S5", label: "شفت 5", time: "10 PM - 2 AM", target: 16, max: 20 },
        ],
        ramadan: [
          { code: "R1", label: "رمضان 1", time: "10 AM - 2 PM", target: 10, max: 14 },
          { code: "R2", label: "رمضان 2", time: "2 PM - 6 PM", target: 14, max: 18 },
          { code: "R3", label: "رمضان 3", time: "6 PM - 9 PM", target: 26, max: 30 },
          { code: "R4", label: "رمضان 4", time: "9 PM - 1 AM", target: 32, max: 36 },
          { code: "R5", label: "رمضان 5", time: "1 AM - 5 AM", target: 18, max: 22 },
        ],
      },
    },
    vehicles: {
      defaultCapacities: { car: 2, bike: 3 },
      excludedStatusKeywords: [
        "insurance withdrawn",
        "withdrawn",
        "maintenance",
        "damaged",
        "agency",
        "unknown",
        "inactive",
        "scrap",
        "تالف",
        "صيانة",
        "مسحوب",
        "تأمين",
        "وكالة",
        "غير معروف",
      ],
    },
  };

  const SampleData = {
    operatingVehiclesCsv: [
      "vehicle_serial,plate,city,register,vehicle_type,operating_status,transport_mode,notes",
      "CAR-1001,JDD-101,جدة,CR-JED,car,operational,public,Primary Jeddah car",
      "CAR-1002,JDD-102,جدة,CR-JED,car,operational,public,Backup Jeddah car",
      "CAR-1004,RYD-104,الرياض,CR-RYD,car,operational,private,Private dashboard car",
      "BIKE-2001,RYD-201,الرياض,CR-RYD,bike,operational,public,Primary Riyadh bike",
      "BIKE-2002,RYD-202,الرياض,CR-RYD,bike,maintenance,public,Excluded by status",
      "BIKE-2003,JDD-203,جدة,CR-JED,bike,operational,public,Jeddah bike",
      "BIKE-2004,RYD-204,الرياض,CR-RYD,bike,operational,public,Backup Riyadh bike",
      "CAR-1003,RYD-103,الرياض,CR-RYD,car,insurance withdrawn,public,Excluded by insurance",
    ].join("\n"),
    updateVehiclesCsv: [
      "vehicle_serial,city,register,vehicle_type,operating_status,transport_mode,notes",
      "CAR-1002,جدة,CR-JED,car,operational,public,Verified from update feed",
      "BIKE-2002,الرياض,CR-RYD,bike,maintenance,public,Still under maintenance",
      "CAR-9999,الرياض,CR-RYD,car,operational,public,Appears only in update and should warn",
    ].join("\n"),
    updateBranchesCsv: [
      "city,register,allowed_registers,direct_agreement,notes",
      "جدة,CR-JED,CR-JED|CR-JED-OPS,true,Primary Jeddah register agreement",
      "جدة,CR-JED-OPS,CR-JED,true,Approved direct agreement",
      "الرياض,CR-RYD,CR-RYD,true,Primary Riyadh register agreement",
    ].join("\n"),
    ridersCsv: [
      "user_id,iqama,rider_name,city,register,current_vehicle_serial,vehicle_type,dashboard_transport_mode",
      "U001,1001,Ahmed Salem,جدة,CR-JED,CAR-1001,car,public",
      "U002,1002,Bader Ali,جدة,CR-JED,CAR-1001,car,public",
      "U003,1003,Faisal Omar,جدة,CR-JED,CAR-1004,car,public",
      "U004,1004,Khaled Nasser,الرياض,CR-RYD,BIKE-2002,bike,public",
      "U005,1005,Mazen Saad,الرياض,CR-RYD,BIKE-9999,bike,public",
      "U006,1006,Nawaf Adel,الرياض,CR-RYD,CAR-1004,car,public",
      "U007,1007,Saleh Sami,جدة,CR-JED,BIKE-2003,bike,public",
      "U008,1008,Yousef Tariq,جدة,CR-JED-OPS,CAR-1002,car,public",
    ].join("\n"),
  };

  const HeaderAliases = {
    vehicleSerial: ["vehicle serial", "vehicle_serial", "serial", "vehicle id", "chassis", "vin", "سيريال", "رقم الهيكل"],
    plate: ["plate", "plate number", "plate_no", "plate_no.", "رقم اللوحة", "لوحة"],
    city: ["city", "branch city", "operation city", "المدينة", "مدينة"],
    register: ["register", "registration", "cr", "commercial register", "السجل", "سجل"],
    vehicleType: ["vehicle type", "vehicle_type", "type", "نوع المركبة", "مركبة"],
    operatingStatus: ["operating status", "operating_status", "status", "الحالة", "status notes"],
    transportMode: ["transport mode", "dashboard transport mode", "transport_mode", "نمط النقل", "نقل"],
    notes: ["notes", "note", "remarks", "ملاحظات", "ملاحظة"],
    userId: ["user id", "user_id", "userid", "user", "يوزر", "معرف"],
    iqama: ["iqama", "id", "national id", "هوية", "اقامة"],
    riderName: ["rider name", "rider_name", "name", "مندوب", "الاسم"],
    currentVehicleSerial: [
      "current vehicle serial",
      "current_vehicle_serial",
      "vehicle serial",
      "current serial",
      "المركبة الحالية",
    ],
    dashboardTransportMode: ["dashboard transport mode", "transport mode", "dashboard_mode", "نمط النقل", "نقل"],
    directAgreement: ["direct agreement", "agreement", "approved", "مباشر", "اتفاقية مباشرة"],
    allowedRegisters: ["allowed registers", "allowed_registers", "register list", "السجلات المسموحة"],
  };

  const Utils = {
    normalizeText(value) {
      return String(value == null ? "" : value).trim();
    },

    normalizeKey(value) {
      return Utils.normalizeText(value)
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "");
    },

    titleCase(value) {
      return Utils.normalizeText(value)
        .toLowerCase()
        .replace(/\b\w/g, function (match) {
          return match.toUpperCase();
        });
    },

    parseNumber(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    },

    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    round(value, digits) {
      const factor = Math.pow(10, digits == null ? 2 : digits);
      return Math.round((Number(value) || 0) * factor) / factor;
    },

    approxEqual(a, b, tolerance) {
      return Math.abs((Number(a) || 0) - (Number(b) || 0)) <= (tolerance == null ? 0.01 : tolerance);
    },

    sum(items, selector) {
      const pick = typeof selector === "function" ? selector : function (item) { return item; };
      return (items || []).reduce(function (total, item) {
        return total + (Number(pick(item)) || 0);
      }, 0);
    },

    unique(items) {
      return Array.from(new Set(items || []));
    },

    parseBoolean(value) {
      const text = Utils.normalizeText(value).toLowerCase();
      return ["1", "true", "yes", "y", "نعم", "صح", "مفعل"].indexOf(text) >= 0;
    },

    splitLooseLine(line) {
      const source = String(line == null ? "" : line);
      const cells = [];
      let cell = "";
      let inQuotes = false;

      for (let index = 0; index < source.length; index += 1) {
        const character = source[index];
        const nextCharacter = source[index + 1];

        if (inQuotes) {
          if (character === '"' && nextCharacter === '"') {
            cell += '"';
            index += 1;
            continue;
          }
          if (character === '"') {
            inQuotes = false;
            continue;
          }
          cell += character;
          continue;
        }

        if (character === '"') {
          inQuotes = true;
          continue;
        }

        if (character === "," || character === ";" || character === "\t") {
          cells.push(cell);
          cell = "";
          continue;
        }

        cell += character;
      }

      cells.push(cell);
      return cells.map(function (value) {
        return Utils.normalizeText(value);
      });
    },

    csvEscape(value) {
      const text = String(value == null ? "" : value);
      if (/[",\n]/.test(text)) {
        return '"' + text.replace(/"/g, '""') + '"';
      }
      return text;
    },

    toCsv(rows, headers) {
      const body = (rows || []).map(function (row) {
        return headers
          .map(function (header) {
            return Utils.csvEscape(row[header.key]);
          })
          .join(",");
      });
      return [
        headers.map(function (header) { return Utils.csvEscape(header.label); }).join(","),
        body.join("\n"),
      ].join("\n");
    },

    parseCsvText(text) {
      const source = String(text == null ? "" : text);
      const rows = [];
      let row = [];
      let cell = "";
      let inQuotes = false;

      function pushCell() {
        row.push(cell);
        cell = "";
      }

      function pushRow() {
        if (row.length === 0 && cell === "") {
          return;
        }
        pushCell();
        rows.push(row);
        row = [];
      }

      for (let index = 0; index < source.length; index += 1) {
        const character = source[index];
        const nextCharacter = source[index + 1];

        if (inQuotes) {
          if (character === '"' && nextCharacter === '"') {
            cell += '"';
            index += 1;
            continue;
          }
          if (character === '"') {
            inQuotes = false;
            continue;
          }
          cell += character;
          continue;
        }

        if (character === '"') {
          inQuotes = true;
          continue;
        }
        if (character === ",") {
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

      if (cell !== "" || row.length > 0) {
        pushRow();
      }

      const filteredRows = rows.filter(function (item) {
        return item.some(function (value) {
          return Utils.normalizeText(value) !== "";
        });
      });
      if (!filteredRows.length) {
        return [];
      }

      const headers = filteredRows[0].map(function (header) {
        return Utils.normalizeText(header);
      });
      return filteredRows.slice(1).map(function (values) {
        const record = {};
        headers.forEach(function (header, columnIndex) {
          record[header || "Column " + (columnIndex + 1)] = values[columnIndex] == null ? "" : values[columnIndex];
        });
        return record;
      });
    },

    getByAliases(row, aliases) {
      const keys = Object.keys(row || {});
      const index = {};
      keys.forEach(function (key) {
        index[Utils.normalizeKey(key)] = row[key];
      });
      for (let aliasIndex = 0; aliasIndex < aliases.length; aliasIndex += 1) {
        const aliasKey = Utils.normalizeKey(aliases[aliasIndex]);
        if (Object.prototype.hasOwnProperty.call(index, aliasKey)) {
          return index[aliasKey];
        }
      }
      return "";
    },
  };

  function normalizeVehicleType(value) {
    const text = Utils.normalizeText(value).toLowerCase();
    if (["car", "cars", "سيارة", "سياره"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "car";
    }
    if (["bike", "motorcycle", "scooter", "دباب", "دراجة"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "bike";
    }
    return "unknown";
  }

  function normalizeCity(value) {
    const text = Utils.normalizeText(value).toLowerCase();
    if (text.indexOf("جدة") >= 0 || text.indexOf("jeddah") >= 0) {
      return "جدة";
    }
    if (text.indexOf("الرياض") >= 0 || text.indexOf("riyadh") >= 0) {
      return "الرياض";
    }
    return Utils.normalizeText(value);
  }

  function normalizeRegister(value) {
    return Utils.normalizeText(value).toUpperCase().replace(/\s+/g, "");
  }

  function normalizeTransportMode(value) {
    const text = Utils.normalizeText(value).toLowerCase();
    if (!text) {
      return "unknown";
    }
    if (["private", "خاص", "نقل خاص"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "private";
    }
    if (["public", "عام", "نقل عام"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "public";
    }
    return Utils.titleCase(text);
  }

  function normalizeStatus(value) {
    const text = Utils.normalizeText(value).toLowerCase();
    if (!text) {
      return "unknown";
    }
    if (["operational", "active", "running", "تشغي", "نشط"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "operational";
    }
    if (["maintenance", "صيانة"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "maintenance";
    }
    if (["insurance", "مسحوب", "withdrawn", "تأمين"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "insurance_withdrawn";
    }
    if (["damage", "damaged", "تالف"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "damaged";
    }
    if (["agency", "وكالة"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "agency";
    }
    if (["inactive", "disabled", "not operating"].some(function (keyword) { return text.indexOf(keyword) >= 0; })) {
      return "inactive";
    }
    return "unknown";
  }

  function isOperationalStatus(value) {
    return normalizeStatus(value) === "operational";
  }

  const RiderIdHeaderAliases = [
    "userid",
    "useridnumber",
    "user",
    "useridid",
    "user_id",
    "riderid",
    "rider_id",
    "courierid",
    "courier_id",
    "driverid",
    "driver_id",
    "daid",
    "da_id",
    "id",
    "identifier",
    "الايدي",
    "ايدي",
    "معرف",
    "معرفالمندوب",
    "رقمالمندوب",
  ];

  function normalizeRiderHeader(value) {
    return Utils.normalizeKey(String(value == null ? "" : value).replace(/\uFEFF/g, ""));
  }

  function isRiderIdHeader(value) {
    const normalized = normalizeRiderHeader(value);
    if (!normalized) {
      return false;
    }
    return RiderIdHeaderAliases.indexOf(normalized) >= 0 ||
      normalized.indexOf("userid") >= 0 ||
      normalized.indexOf("riderid") >= 0 ||
      normalized.indexOf("courierid") >= 0 ||
      normalized.indexOf("driverid") >= 0 ||
      normalized.indexOf("daid") >= 0 ||
      normalized.indexOf("ايدي") >= 0 ||
      normalized.indexOf("معرف") >= 0;
  }

  function cleanRiderId(value) {
    return Utils.normalizeText(String(value == null ? "" : value).replace(/\uFEFF/g, "").replace(/^["']+|["']+$/g, ""));
  }

  function looksLikeRiderId(value) {
    const cleaned = cleanRiderId(value);
    if (!cleaned || isRiderIdHeader(cleaned)) {
      return false;
    }
    return /[A-Za-z0-9\u0600-\u06FF]/.test(cleaned);
  }

  const SalaryEngine = {
    createDefaultInput() {
      return {
        vehicleType: "car",
        vehicleSource: "company",
        monthDays: 31,
        orders: 460,
        workDays: 26,
        vehicleDays: 26,
        validDays: 6,
        validOverride: "auto",
        experienceLevel: "NONE",
        baseFare: Config.salary.baseFare,
        kmRate: Config.salary.kmRate,
        carKm: Config.salary.averageKm.car,
        bikeKm: Config.salary.averageKm.bike,
        companyHousing: false,
        housingDays: 0,
        loans: 0,
        otherDeductions: 0,
      };
    },

    prorateMonthlyAmount(monthlyAmount, monthDays, activeDays) {
      return (Number(monthlyAmount) || 0) / Math.max(1, Number(monthDays) || 1) * Math.max(0, Number(activeDays) || 0);
    },

    getMinimumOrders(vehicleType) {
      return Config.salary.minimumOrders[vehicleType] || 0;
    },

    getAverageKm(input) {
      return input.vehicleType === "bike" ? input.bikeKm : input.carKm;
    },

    getValidityTier(vehicleType, orders) {
      const tiers = Config.salary.validityTiers[vehicleType] || [];
      for (let index = 0; index < tiers.length; index += 1) {
        if ((Number(orders) || 0) >= tiers[index].minOrders) {
          return tiers[index];
        }
      }
      return { tier: "E", minOrders: 0, incentive: 0 };
    },

    getExperienceIncentive(vehicleType, level) {
      const normalizedLevel = Utils.normalizeText(level || "NONE").toUpperCase();
      const map = Config.salary.experienceLevels[vehicleType] || {};
      return map[normalizedLevel] || 0;
    },

    evaluateValidity(input) {
      const minimumOrders = SalaryEngine.getMinimumOrders(input.vehicleType);
      const meetsOrders = input.orders >= minimumOrders;
      const meetsDays = input.validDays >= Config.salary.validityDaysRequired;
      const autoValid = meetsOrders && meetsDays;
      let isValid = autoValid;
      if (input.validOverride === "valid") {
        isValid = true;
      }
      if (input.validOverride === "invalid") {
        isValid = false;
      }
      const reasons = [];
      if (!meetsOrders) {
        reasons.push("الطلبات أقل من الحد الأدنى المطلوب (" + minimumOrders + ").");
      }
      if (!meetsDays) {
        reasons.push("أيام الصلاحية أقل من " + Config.salary.validityDaysRequired + " من 7.");
      }
      if (input.validOverride === "valid") {
        reasons.push("تم تفعيل الصلاحية يدويًا.");
      }
      if (input.validOverride === "invalid") {
        reasons.push("تم إلغاء الصلاحية يدويًا.");
      }
      return {
        minimumOrders: minimumOrders,
        meetsOrders: meetsOrders,
        meetsDays: meetsDays,
        autoValid: autoValid,
        isValid: isValid,
        reasons: reasons,
      };
    },

    sanitizeInput(input) {
      const warnings = [];
      const monthDays = Math.max(1, Utils.parseNumber(input.monthDays, 31));
      const workDaysRaw = Math.max(0, Utils.parseNumber(input.workDays, 0));
      const vehicleDaysRaw = Math.max(0, Utils.parseNumber(input.vehicleDays, 0));
      const housingDaysRaw = Math.max(0, Utils.parseNumber(input.housingDays, 0));

      if (workDaysRaw > monthDays) {
        warnings.push({
          source: "salary",
          severity: "medium",
          code: "work_days_over_month",
          message: "تم تقليص أيام العمل إلى عدد أيام الشهر.",
          suggestion: "راجع قيمة workDays أو monthDays.",
        });
      }
      if (vehicleDaysRaw > monthDays) {
        warnings.push({
          source: "salary",
          severity: "medium",
          code: "vehicle_days_over_month",
          message: "تم تقليص أيام وجود المركبة إلى عدد أيام الشهر.",
          suggestion: "راجع قيمة vehicleDays.",
        });
      }
      if (housingDaysRaw > monthDays) {
        warnings.push({
          source: "salary",
          severity: "low",
          code: "housing_days_over_month",
          message: "تم تقليص أيام السكن إلى عدد أيام الشهر.",
          suggestion: "راجع قيمة housingDays.",
        });
      }

      return {
        vehicleType: input.vehicleType === "bike" ? "bike" : "car",
        vehicleSource: input.vehicleSource === "own" ? "own" : "company",
        monthDays: monthDays,
        orders: Math.max(0, Utils.parseNumber(input.orders, 0)),
        workDays: Utils.clamp(workDaysRaw, 0, monthDays),
        vehicleDays: Utils.clamp(vehicleDaysRaw, 0, monthDays),
        validDays: Utils.clamp(Math.max(0, Utils.parseNumber(input.validDays, 0)), 0, 7),
        validOverride: ["valid", "invalid"].indexOf(input.validOverride) >= 0 ? input.validOverride : "auto",
        experienceLevel: Utils.normalizeText(input.experienceLevel || "NONE").toUpperCase() || "NONE",
        baseFare: Math.max(0, Utils.parseNumber(input.baseFare, Config.salary.baseFare)),
        kmRate: Math.max(0, Utils.parseNumber(input.kmRate, Config.salary.kmRate)),
        carKm: Math.max(0, Utils.parseNumber(input.carKm, Config.salary.averageKm.car)),
        bikeKm: Math.max(0, Utils.parseNumber(input.bikeKm, Config.salary.averageKm.bike)),
        companyHousing: !!input.companyHousing,
        housingDays: Utils.clamp(housingDaysRaw, 0, monthDays),
        loans: Math.max(0, Utils.parseNumber(input.loans, 0)),
        otherDeductions: Math.max(0, Utils.parseNumber(input.otherDeductions, 0)),
        warnings: warnings,
      };
    },

    calculate(input) {
      const sanitized = SalaryEngine.sanitizeInput(input);
      const validity = SalaryEngine.evaluateValidity(sanitized);
      const averageKm = SalaryEngine.getAverageKm(sanitized);
      const perOrderRevenue = sanitized.baseFare + averageKm * sanitized.kmRate;
      const deliveryRevenue = sanitized.orders * perOrderRevenue;
      const validityTier = SalaryEngine.getValidityTier(sanitized.vehicleType, sanitized.orders);
      const validityIncentive = validity.isValid ? validityTier.incentive : 0;
      const experienceIncentive = validity.isValid
        ? SalaryEngine.getExperienceIncentive(sanitized.vehicleType, sanitized.experienceLevel)
        : 0;
      const commission = SalaryEngine.prorateMonthlyAmount(
        Config.salary.monthlyCommission,
        sanitized.monthDays,
        sanitized.workDays
      );
      const rent = sanitized.vehicleSource === "company"
        ? SalaryEngine.prorateMonthlyAmount(
            Config.salary.monthlyRent[sanitized.vehicleType],
            sanitized.monthDays,
            sanitized.vehicleDays
          )
        : 0;
      const housing = sanitized.companyHousing
        ? SalaryEngine.prorateMonthlyAmount(
            Config.salary.monthlyHousing,
            sanitized.monthDays,
            sanitized.housingDays
          )
        : 0;
      const totalDeductions = commission + rent + housing + sanitized.loans + sanitized.otherDeductions;
      const totalIncentives = validityIncentive + experienceIncentive;
      const netPay = deliveryRevenue + totalIncentives - totalDeductions;
      const dailyNet = sanitized.workDays > 0 ? netPay / sanitized.workDays : 0;
      const validations = sanitized.warnings.slice();

      if (!validity.isValid) {
        validations.push({
          source: "salary",
          severity: "high",
          code: "invalid_rider",
          message: "المندوب غير صالح، لذلك تم تصفير حوافز الصلاحية وتجربة التوصيل.",
          suggestion: "حقق شرط الحد الأدنى للطلبات و" + Config.salary.validityDaysRequired + " أيام صلاحية.",
        });
      }
      if (sanitized.vehicleSource === "own") {
        validations.push({
          source: "salary",
          severity: "info",
          code: "own_vehicle",
          message: "تم إلغاء الإيجار لأن المركبة خاصة.",
          suggestion: "لا حاجة لأي إجراء إذا كانت هذه هي الحالة الفعلية.",
        });
      }

      return {
        input: sanitized,
        validity: validity,
        validityTier: validityTier,
        isValid: validity.isValid,
        averageKm: averageKm,
        perOrderRevenue: perOrderRevenue,
        deliveryRevenue: deliveryRevenue,
        validityIncentive: validityIncentive,
        experienceIncentive: experienceIncentive,
        totalIncentives: totalIncentives,
        commission: commission,
        rent: rent,
        housing: housing,
        loans: sanitized.loans,
        otherDeductions: sanitized.otherDeductions,
        totalDeductions: totalDeductions,
        netPay: netPay,
        dailyNet: dailyNet,
        statusLabel: validity.isValid ? "صالح - فئة " + validityTier.tier : "غير صالح - بدون حوافز",
        validations: validations,
      };
    },
  };

  function buildCircularBundles(shiftCount, bundleLength) {
    const bundles = [];
    for (let start = 0; start < shiftCount; start += 1) {
      const bundle = [];
      for (let step = 0; step < bundleLength; step += 1) {
        bundle.push((start + step) % shiftCount);
      }
      bundles.push(bundle);
    }
    return bundles;
  }

  function buildCombinations(shiftCount, bundleLength) {
    const combinations = [];
    function recurse(startIndex, selection) {
      if (selection.length === bundleLength) {
        combinations.push(selection.slice());
        return;
      }
      for (let index = startIndex; index < shiftCount; index += 1) {
        selection.push(index);
        recurse(index + 1, selection);
        selection.pop();
      }
    }
    recurse(0, []);
    return combinations;
  }

  function createFallbackRiderIds(count) {
    return Array.from({ length: Math.max(0, count) }, function (_, index) {
      return "Rider " + (index + 1);
    });
  }

  function normalizeBundleKey(bundle) {
    return bundle.slice().sort(function (left, right) {
      return left - right;
    }).join("-");
  }

  function buildPriorityBundles(shiftCount) {
    const bundleMap = new Map();

    function addBundle(indexes, combinationType, priority) {
      const normalizedIndexes = indexes.map(function (index) {
        return ((index % shiftCount) + shiftCount) % shiftCount;
      });
      if (Utils.unique(normalizedIndexes).length !== normalizedIndexes.length) {
        return;
      }
      const key = normalizeBundleKey(normalizedIndexes);
      if (!bundleMap.has(key) || bundleMap.get(key).priority > priority) {
        bundleMap.set(key, {
          indexes: normalizedIndexes,
          combinationType: combinationType,
          priority: priority,
        });
      }
    }

    for (let start = 0; start < shiftCount; start += 1) {
      addBundle([start, start + 1, start + 2], "Back to Back", 1);
      addBundle([start, start + 1, start + 3], "1 Gap", 2);
      addBundle([start, start + 2, start + 3], "1 Gap", 2);
      addBundle([start, start + 1, start + 4], "2 Gap", 3);
      addBundle([start, start + 3, start + 4], "2 Gap", 3);
      addBundle([start, start + 2, start + 4], "1 Gap + 1 Gap", 4);
    }

    return Array.from(bundleMap.values()).sort(function (left, right) {
      return left.priority - right.priority ||
        normalizeBundleKey(left.indexes).localeCompare(normalizeBundleKey(right.indexes));
    });
  }

  function buildGenericBundleEntries(shiftCount, bundleLength, strategy) {
    const bundles = strategy === "consecutive"
      ? buildCircularBundles(shiftCount, bundleLength)
      : buildCombinations(shiftCount, bundleLength);
    return bundles.map(function (bundle) {
      return {
        indexes: bundle.slice(),
        combinationType: strategy === "consecutive" ? "Consecutive" : "Balanced",
        priority: strategy === "consecutive" ? 1 : 2,
      };
    });
  }

  const ShiftEngine = {
    createDefaultInput() {
      return {
        templateKey: "standard6",
        riderCount: 40,
        riderIds: [],
        shiftsPerRider: 3,
        strategy: "balanced",
        shifts: Config.shifts.templates.standard6.map(function (shift) {
          return Object.assign({}, shift);
        }),
      };
    },

    getTemplate(templateKey) {
      const template = Config.shifts.templates[templateKey] || Config.shifts.templates.standard6;
      return template.map(function (shift) {
        return Object.assign({}, shift);
      });
    },

    buildBundles(shiftCount, bundleLength, strategy) {
      if (bundleLength === 3) {
        return buildPriorityBundles(shiftCount);
      }
      return buildGenericBundleEntries(shiftCount, bundleLength, strategy);
    },

    scoreBundle(bundleEntry, assignedCounts, shifts, strategy) {
      const bundle = bundleEntry.indexes;
      let score = 0;
      for (let index = 0; index < bundle.length; index += 1) {
        const shiftIndex = bundle[index];
        const shift = shifts[shiftIndex];
        const assigned = assignedCounts[shiftIndex];
        const deficit = shift.target - assigned;
        const headroom = shift.max - assigned;
        if (headroom <= 0) {
          return -Infinity;
        }
        score += deficit > 0 ? deficit * 24 : -Math.abs(deficit) * 9;
        score += headroom * 1.5;
        if (assigned + 1 > shift.target) {
          score -= 14;
        }
      }
      score -= (bundleEntry.priority || 99) * 8;
      if (strategy === "consecutive" && bundleEntry.combinationType === "Back to Back") {
        score += 22;
      }
      return score;
    },

    plan(input) {
      const shifts = (input.shifts || []).map(function (shift, shiftIndex) {
        const target = Math.max(0, Utils.parseNumber(shift.target, 0));
        const max = Math.max(target, Utils.parseNumber(shift.max, target));
        return {
          code: shift.code || "S" + (shiftIndex + 1),
          label: shift.label || "شفت " + (shiftIndex + 1),
          time: shift.time || "",
          target: target,
          max: max,
        };
      });
      const riderCount = Math.max(0, Utils.parseNumber(input.riderCount, 0));
      const riderIds = Array.isArray(input.riderIds)
        ? input.riderIds.map(cleanRiderId).filter(Boolean)
        : [];
      const riderPool = riderIds.length ? riderIds.slice() : createFallbackRiderIds(riderCount);
      const requestedRiders = riderPool.length;
      const shiftsPerRider = Utils.clamp(
        Math.max(1, Utils.parseNumber(input.shiftsPerRider, 3)),
        1,
        Math.max(1, shifts.length)
      );
      const strategy = input.strategy === "consecutive" ? "consecutive" : "balanced";
      const bundles = ShiftEngine.buildBundles(shifts.length, shiftsPerRider, strategy);
      const assignedCounts = shifts.map(function () { return 0; });
      const rows = [];
      const unassigned = [];
      const warnings = [];
      const totalMaxCapacity = Utils.sum(shifts, function (shift) { return shift.max; });

      if (requestedRiders * shiftsPerRider > totalMaxCapacity) {
        warnings.push({
          source: "shifts",
          severity: "medium",
          code: "requested_slots_over_max_capacity",
          message: "إجمالي الطلب يتجاوز سعة Max الحالية للشفتات.",
          suggestion: "خفّض عدد المناديب أو الشفتات لكل مندوب أو ارفع قيم Max.",
        });
      }

      for (let riderIndex = 0; riderIndex < requestedRiders; riderIndex += 1) {
        let bestBundle = null;
        let bestScore = -Infinity;
        bundles.forEach(function (bundleEntry) {
          const score = ShiftEngine.scoreBundle(bundleEntry, assignedCounts, shifts, strategy);
          if (score > bestScore) {
            bestScore = score;
            bestBundle = bundleEntry;
          }
        });

        if (!bestBundle || bestScore === -Infinity) {
          warnings.push({
            source: "shifts",
            severity: "medium",
            code: "max_reached_before_all_riders",
            message: "توقفت عملية التوزيع قبل استخدام جميع المناديب لأن بعض الشفتات وصلت إلى الحد الأقصى.",
            suggestion: "ارفع Max أو غيّر استراتيجية التوزيع أو عدد الشفتات لكل مندوب.",
          });
          break;
        }

        bestBundle.indexes.forEach(function (shiftIndex) {
          assignedCounts[shiftIndex] += 1;
        });
        const shiftCodes = bestBundle.indexes.map(function (shiftIndex) { return shifts[shiftIndex].code; });
        const shiftLabels = bestBundle.indexes.map(function (shiftIndex) { return shifts[shiftIndex].label; });
        rows.push({
          riderId: riderPool[riderIndex],
          shiftIndexes: bestBundle.indexes.slice(),
          shiftCodes: shiftCodes,
          shiftLabels: shiftLabels,
          shift_1: shiftCodes[0] || "",
          shift_2: shiftCodes[1] || "",
          shift_3: shiftCodes[2] || "",
          shiftsText: shiftLabels.join(" + "),
          combinationType: bestBundle.combinationType,
        });
      }

      if (rows.length < requestedRiders) {
        const reason = "لم يتم توزيع هذا المندوب لأن أي تركيبة متاحة ستتجاوز Max أو لا تحقق القيود الحالية.";
        riderPool.slice(rows.length).forEach(function (riderId) {
          unassigned.push({
            riderId: riderId,
            reason: reason,
          });
        });
      }

      const shiftStats = shifts.map(function (shift, shiftIndex) {
        const assigned = assignedCounts[shiftIndex];
        const deficit = Math.max(0, shift.target - assigned);
        const surplus = Math.max(0, assigned - shift.target);
        const coverage = shift.target > 0 ? assigned / shift.target * 100 : 100;
        return {
          code: shift.code,
          label: shift.label,
          time: shift.time,
          target: shift.target,
          max: shift.max,
          assigned: assigned,
          deficit: deficit,
          surplus: surplus,
          coverage: coverage,
          withinMax: assigned <= shift.max,
        };
      });

      const totalTarget = Utils.sum(shiftStats, function (item) { return item.target; });
      const totalAssigned = Utils.sum(shiftStats, function (item) { return item.assigned; });
      const totalDeficit = Utils.sum(shiftStats, function (item) { return item.deficit; });
      const totalSurplus = Utils.sum(shiftStats, function (item) { return item.surplus; });

      if (rows.length < requestedRiders) {
        warnings.push({
          source: "shifts",
          severity: "low",
          code: "unused_riders",
          message: "بعض المناديب لم يتم توزيعهم بسبب القيود الحالية.",
          suggestion: "راجع قيم Max أو خفف عدد الشفتات لكل مندوب.",
        });
      }

      return {
        input: {
          riderCount: requestedRiders,
          shiftsPerRider: shiftsPerRider,
          strategy: strategy,
          shiftCount: shifts.length,
        },
        shifts: shifts,
        riderIds: riderPool,
        providedRiderIds: riderIds,
        totalInputRiders: requestedRiders,
        rows: rows,
        unassigned: unassigned,
        shiftStats: shiftStats,
        totalTarget: totalTarget,
        totalAssigned: totalAssigned,
        totalDeficit: totalDeficit,
        totalSurplus: totalSurplus,
        coveragePct: totalTarget > 0 ? totalAssigned / totalTarget * 100 : 100,
        warnings: warnings,
      };
    },
  };

  const DataEngine = {
    parseCsvRows(text) {
      return Utils.parseCsvText(text);
    },

    parseRiderIds(text) {
      const source = String(text == null ? "" : text).replace(/\uFEFF/g, "");
      const lines = source.split(/\r?\n/).map(function (line) {
        return Utils.normalizeText(line);
      }).filter(Boolean);

      if (!lines.length) {
        return {
          ids: [],
          totalRows: 0,
          uniqueCount: 0,
          duplicateCount: 0,
          ignoredCount: 0,
          hasHeader: false,
        };
      }

      const parsedRows = lines.map(function (line) {
        return Utils.splitLooseLine(line);
      });
      const firstRow = parsedRows[0] || [];
      const hasStructuredRows = parsedRows.some(function (row) {
        return row.length > 1;
      });
      const firstRowLooksHeader = firstRow.some(function (cell) {
        return isRiderIdHeader(cell);
      }) || (hasStructuredRows && firstRow.every(function (cell) {
        return cell && !looksLikeRiderId(cell);
      }));

      let hasHeader = false;
      let idColumn = -1;
      let dataRows = parsedRows.slice();

      if (hasStructuredRows) {
        idColumn = firstRow.findIndex(function (cell) {
          return isRiderIdHeader(cell);
        });
        if (idColumn >= 0 || firstRowLooksHeader) {
          hasHeader = true;
          dataRows = parsedRows.slice(1);
        }
      } else if (firstRow.length === 1 && isRiderIdHeader(firstRow[0])) {
        hasHeader = true;
        dataRows = parsedRows.slice(1);
      }

      const seen = new Set();
      const ids = [];
      let duplicateCount = 0;
      let ignoredCount = 0;

      dataRows.forEach(function (row) {
        const candidate = idColumn >= 0
          ? row[idColumn]
          : (row[0] && looksLikeRiderId(row[0]) ? row[0] : row.find(function (cell) {
              return looksLikeRiderId(cell);
            }));
        const cleaned = cleanRiderId(candidate);
        if (!cleaned || isRiderIdHeader(cleaned)) {
          ignoredCount += 1;
          return;
        }
        const key = cleaned.toUpperCase();
        if (seen.has(key)) {
          duplicateCount += 1;
          return;
        }
        seen.add(key);
        ids.push(cleaned);
      });

      return {
        ids: ids,
        totalRows: lines.length,
        uniqueCount: ids.length,
        duplicateCount: duplicateCount,
        ignoredCount: ignoredCount,
        hasHeader: hasHeader,
      };
    },

    normalizeVehicleRecord(row, source) {
      const statusText = Utils.getByAliases(row, HeaderAliases.operatingStatus);
      return {
        source: source,
        serial: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.vehicleSerial)).toUpperCase(),
        plate: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.plate)).toUpperCase(),
        city: normalizeCity(Utils.getByAliases(row, HeaderAliases.city)),
        register: normalizeRegister(Utils.getByAliases(row, HeaderAliases.register)),
        vehicleType: normalizeVehicleType(Utils.getByAliases(row, HeaderAliases.vehicleType)),
        rawStatus: Utils.normalizeText(statusText),
        status: normalizeStatus(statusText),
        isOperational: isOperationalStatus(statusText),
        transportMode: normalizeTransportMode(Utils.getByAliases(row, HeaderAliases.transportMode)),
        notes: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.notes)),
        raw: row,
      };
    },

    normalizeRiderRecord(row) {
      return {
        userId: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.userId)).toUpperCase(),
        iqama: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.iqama)),
        riderName: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.riderName)),
        city: normalizeCity(Utils.getByAliases(row, HeaderAliases.city)),
        register: normalizeRegister(Utils.getByAliases(row, HeaderAliases.register)),
        currentVehicleSerial: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.currentVehicleSerial)).toUpperCase(),
        vehicleType: normalizeVehicleType(Utils.getByAliases(row, HeaderAliases.vehicleType)),
        dashboardTransportMode: normalizeTransportMode(Utils.getByAliases(row, HeaderAliases.dashboardTransportMode)),
        raw: row,
      };
    },

    normalizeBranchRecord(row) {
      const allowedRegistersText = Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.allowedRegisters));
      return {
        city: normalizeCity(Utils.getByAliases(row, HeaderAliases.city)),
        register: normalizeRegister(Utils.getByAliases(row, HeaderAliases.register)),
        allowedRegisters: allowedRegistersText
          ? allowedRegistersText.split("|").map(function (value) { return normalizeRegister(value); }).filter(Boolean)
          : [],
        directAgreement: Utils.parseBoolean(Utils.getByAliases(row, HeaderAliases.directAgreement)),
        notes: Utils.normalizeText(Utils.getByAliases(row, HeaderAliases.notes)),
        raw: row,
      };
    },

    mergeVehicleSources(operatingRows, updateRows) {
      const operatingMap = new Map();
      const orphanUpdates = [];
      const warnings = [];

      (operatingRows || []).forEach(function (vehicle) {
        if (!vehicle.serial) {
          return;
        }
        operatingMap.set(vehicle.serial, Object.assign({}, vehicle));
      });

      (updateRows || []).forEach(function (updateVehicle) {
        if (!updateVehicle.serial) {
          return;
        }
        if (!operatingMap.has(updateVehicle.serial)) {
          orphanUpdates.push(updateVehicle);
          return;
        }
        const baseVehicle = operatingMap.get(updateVehicle.serial);
        const mergedVehicle = Object.assign({}, baseVehicle, {
          city: updateVehicle.city || baseVehicle.city,
          register: updateVehicle.register || baseVehicle.register,
          vehicleType: updateVehicle.vehicleType !== "unknown" ? updateVehicle.vehicleType : baseVehicle.vehicleType,
          transportMode: updateVehicle.transportMode !== "unknown" ? updateVehicle.transportMode : baseVehicle.transportMode,
          rawStatus: updateVehicle.rawStatus || baseVehicle.rawStatus,
          status: updateVehicle.status !== "unknown" ? updateVehicle.status : baseVehicle.status,
          isOperational: updateVehicle.status !== "unknown" ? updateVehicle.isOperational : baseVehicle.isOperational,
          notes: Utils.unique([baseVehicle.notes, updateVehicle.notes].filter(Boolean)).join(" | "),
          source: "operating+update",
        });
        operatingMap.set(updateVehicle.serial, mergedVehicle);
      });

      if (!operatingMap.size) {
        warnings.push({
          source: "vehicles",
          severity: "high",
          code: "missing_operating_source",
          message: "لا يوجد Operating Vehicles كمصدر حقيقة، لذلك لا يمكن الاعتماد على التوزيع بالكامل.",
          suggestion: "ارفع ملف Operating Vehicles أولاً ثم أعد التحليل.",
        });
      }

      if (orphanUpdates.length) {
        warnings.push({
          source: "vehicles",
          severity: "medium",
          code: "orphan_update_rows",
          message: "يوجد " + orphanUpdates.length + " صف تحديث لا يطابق أي Vehicle Serial في Operating Vehicles.",
          suggestion: "راجع Vehicle Serial أو أضف المركبات الناقصة في المصدر الرئيسي.",
        });
      }

      return {
        vehicles: Array.from(operatingMap.values()),
        orphanUpdates: orphanUpdates,
        warnings: warnings,
      };
    },
  };

  function buildAgreementMap(branchRows) {
    const agreementMap = new Map();
    (branchRows || []).forEach(function (branchRow) {
      const key = branchRow.city + "|" + branchRow.register;
      agreementMap.set(key, {
        directAgreement: branchRow.directAgreement,
        allowedRegisters: Utils.unique([branchRow.register].concat(branchRow.allowedRegisters || [])),
        notes: branchRow.notes,
      });
    });
    return agreementMap;
  }

  function hasRegisterAgreement(city, riderRegister, vehicleRegister, agreementMap) {
    if (!riderRegister || !vehicleRegister) {
      return true;
    }
    if (riderRegister === vehicleRegister) {
      return true;
    }
    const key = city + "|" + riderRegister;
    const entry = agreementMap.get(key);
    return !!(entry && entry.directAgreement && entry.allowedRegisters.indexOf(vehicleRegister) >= 0);
  }

  function getCapacityLimit(vehicleType, settings) {
    return vehicleType === "bike" ? settings.bikeCapacity : settings.carCapacity;
  }

  function createVehicleIssue(source, severity, code, rider, vehicle, message, suggestion) {
    return {
      source: source,
      severity: severity,
      code: code,
      riderId: rider.userId,
      riderName: rider.riderName,
      city: rider.city,
      register: rider.register,
      vehicleSerial: vehicle ? vehicle.serial : "",
      message: message,
      suggestion: suggestion,
    };
  }

  const VehicleEngine = {
    createDefaultSettings() {
      return {
        carCapacity: Config.vehicles.defaultCapacities.car,
        bikeCapacity: Config.vehicles.defaultCapacities.bike,
        dashboardRule: "public_only",
        strictCity: true,
        strictRegister: true,
      };
    },

    isVehicleAllowedByTransportRule(vehicle, settings) {
      if (settings.dashboardRule !== "public_only") {
        return true;
      }
      return vehicle.transportMode !== "private";
    },

    evaluateCandidate(rider, vehicle, context) {
      const reasons = [];
      if (!vehicle.serial) {
        reasons.push("missing_serial");
      }
      if (!vehicle.isOperational) {
        reasons.push("not_operational");
      }
      if (rider.vehicleType !== "unknown" && vehicle.vehicleType !== "unknown" && rider.vehicleType !== vehicle.vehicleType) {
        reasons.push("type_mismatch");
      }
      if (context.settings.strictCity && rider.city && vehicle.city && rider.city !== vehicle.city) {
        reasons.push("city_mismatch");
      }
      const registerAllowed = hasRegisterAgreement(rider.city || vehicle.city, rider.register, vehicle.register, context.agreementMap);
      if (context.settings.strictRegister && rider.register && vehicle.register && !registerAllowed) {
        reasons.push("register_mismatch");
      }
      if (!VehicleEngine.isVehicleAllowedByTransportRule(vehicle, context.settings)) {
        reasons.push("private_transport_blocked");
      }
      const occupancy = (context.occupancy.get(vehicle.serial) || []).length;
      const capacityLimit = getCapacityLimit(vehicle.vehicleType, context.settings);
      if (occupancy >= capacityLimit) {
        reasons.push("capacity_full");
      }
      const score =
        (rider.currentVehicleSerial && rider.currentVehicleSerial === vehicle.serial ? 200 : 0) +
        (rider.city && rider.city === vehicle.city ? 60 : 0) +
        (rider.register && rider.register === vehicle.register ? 50 : 0) +
        (registerAllowed && rider.register !== vehicle.register ? 20 : 0) +
        (vehicle.transportMode === "public" ? 12 : 0) -
        occupancy * 8;

      return {
        rider: rider,
        vehicle: vehicle,
        reasons: reasons,
        allowed: reasons.length === 0,
        score: score,
        occupancy: occupancy,
        capacityLimit: capacityLimit,
        registerAllowed: registerAllowed,
      };
    },

    diagnoseFailure(rider, evaluations) {
      const sameType = evaluations.filter(function (evaluation) {
        return evaluation.vehicle.vehicleType === rider.vehicleType || rider.vehicleType === "unknown";
      });

      if (!sameType.length) {
        return {
          code: "missing_vehicle",
          message: "لا توجد مركبة تشغيلية من نفس النوع للمندوب.",
          suggestion: "أضف مركبة " + (rider.vehicleType === "bike" ? "دباب" : "سيارة") + " تشغيلية في نفس المدينة.",
        };
      }

      if (sameType.every(function (evaluation) { return evaluation.reasons.indexOf("city_mismatch") >= 0; })) {
        return {
          code: "city_mismatch",
          message: "كل المركبات المطابقة من نوع " + rider.vehicleType + " تقع في مدينة مختلفة.",
          suggestion: "استخدم مركبة داخل " + rider.city + " أو انقل بيانات المندوب للمدينة الصحيحة.",
        };
      }

      if (sameType.every(function (evaluation) {
        return evaluation.reasons.indexOf("register_mismatch") >= 0 || evaluation.reasons.indexOf("capacity_full") >= 0;
      })) {
        if (sameType.some(function (evaluation) { return evaluation.reasons.indexOf("capacity_full") >= 0; })) {
          return {
            code: "capacity_violation",
            message: "السعة ممتلئة على المركبات المتاحة للمندوب.",
            suggestion: "ارفع السعة من الإعدادات أو وفر مركبة إضافية.",
          };
        }
        return {
          code: "register_mismatch",
          message: "المركبات المتاحة لا تطابق السجل التجاري للمندوب.",
          suggestion: "اعتمد اتفاقية مباشرة أو استخدم مركبة بنفس السجل.",
        };
      }

      if (sameType.some(function (evaluation) { return evaluation.reasons.indexOf("private_transport_blocked") >= 0; })) {
        return {
          code: "private_transport_blocked",
          message: "المطابقة المتاحة تتطلب مركبة نقل خاص بينما القاعدة الحالية تسمح بالنقل العام فقط.",
          suggestion: "استخدم مركبة نقل عام أو غيّر سياسة dashboard transport إذا كان ذلك معتمدًا.",
        };
      }

      return {
        code: "conflict",
        message: "تعذر تثبيت المندوب على مركبة مطابقة بالكامل.",
        suggestion: "راجع المدينة والسجل والحالة التشغيلية والسعة.",
      };
    },

    assignVehicles(input) {
      const settings = Object.assign({}, VehicleEngine.createDefaultSettings(), input.settings || {});
      const normalizedOperating = (input.operatingRows || []).map(function (row) {
        return DataEngine.normalizeVehicleRecord(row, "operating");
      }).filter(function (vehicle) {
        return !!vehicle.serial;
      });
      const normalizedUpdates = (input.updateRows || []).map(function (row) {
        return DataEngine.normalizeVehicleRecord(row, "update");
      }).filter(function (vehicle) {
        return !!vehicle.serial;
      });
      const normalizedBranches = (input.branchRows || []).map(function (row) {
        return DataEngine.normalizeBranchRecord(row);
      }).filter(function (branch) {
        return !!branch.city && !!branch.register;
      });
      const normalizedRiders = (input.riderRows || []).map(function (row) {
        return DataEngine.normalizeRiderRecord(row);
      }).filter(function (rider) {
        return !!rider.userId || !!rider.riderName;
      });

      const merged = DataEngine.mergeVehicleSources(normalizedOperating, normalizedUpdates);
      const agreementMap = buildAgreementMap(normalizedBranches);
      const occupancy = new Map();
      const assignableVehicles = merged.vehicles.filter(function (vehicle) {
        return vehicle.isOperational;
      });
      const vehicleBySerial = new Map();
      assignableVehicles.forEach(function (vehicle) {
        vehicleBySerial.set(vehicle.serial, vehicle);
        occupancy.set(vehicle.serial, []);
      });

      const validAssignments = [];
      const conflicts = [];
      const capacityViolations = [];
      const cityMismatch = [];
      const registerMismatch = [];
      const missingVehicles = [];
      const suggestedFixes = [];
      const excludedVehicles = merged.vehicles.filter(function (vehicle) { return !vehicle.isOperational; });
      const warnings = merged.warnings.slice();

      normalizedRiders.sort(function (left, right) {
        return (right.currentVehicleSerial ? 1 : 0) - (left.currentVehicleSerial ? 1 : 0);
      });

      normalizedRiders.forEach(function (rider) {
        const allEvaluations = assignableVehicles.map(function (vehicle) {
          return VehicleEngine.evaluateCandidate(rider, vehicle, {
            settings: settings,
            agreementMap: agreementMap,
            occupancy: occupancy,
          });
        });

        const preferredVehicle = rider.currentVehicleSerial ? vehicleBySerial.get(rider.currentVehicleSerial) : null;
        const preferredEvaluation = preferredVehicle
          ? VehicleEngine.evaluateCandidate(rider, preferredVehicle, {
              settings: settings,
              agreementMap: agreementMap,
              occupancy: occupancy,
            })
          : null;

        let chosenEvaluation = null;
        if (preferredEvaluation && preferredEvaluation.allowed) {
          chosenEvaluation = preferredEvaluation;
        } else {
          chosenEvaluation = allEvaluations
            .filter(function (evaluation) { return evaluation.allowed; })
            .sort(function (left, right) { return right.score - left.score; })[0] || null;
        }

        if (chosenEvaluation) {
          const assignedRiders = occupancy.get(chosenEvaluation.vehicle.serial) || [];
          assignedRiders.push(rider.userId || rider.riderName);
          occupancy.set(chosenEvaluation.vehicle.serial, assignedRiders);
          const notes = [];
          if (preferredEvaluation && !preferredEvaluation.allowed) {
            notes.push("تمت إعادة التوزيع بدل المركبة الحالية بسبب: " + preferredEvaluation.reasons.join(", "));
          }
          if (rider.currentVehicleSerial && rider.currentVehicleSerial === chosenEvaluation.vehicle.serial) {
            notes.push("تثبيت على المركبة الحالية");
          }
          if (!notes.length) {
            notes.push("مقترح تسجيل جديد مطابق للقواعد");
          }
          validAssignments.push({
            riderId: rider.userId,
            riderName: rider.riderName,
            vehicleSerial: chosenEvaluation.vehicle.serial,
            vehicleType: chosenEvaluation.vehicle.vehicleType,
            city: chosenEvaluation.vehicle.city,
            register: chosenEvaluation.vehicle.register,
            transportMode: chosenEvaluation.vehicle.transportMode,
            occupancy: occupancy.get(chosenEvaluation.vehicle.serial).length,
            capacityLimit: chosenEvaluation.capacityLimit,
            keptCurrentVehicle: !!(rider.currentVehicleSerial && rider.currentVehicleSerial === chosenEvaluation.vehicle.serial),
            notes: notes.join(" "),
          });
          return;
        }

        const diagnosis = VehicleEngine.diagnoseFailure(rider, allEvaluations);
        const issue = createVehicleIssue(
          "vehicles",
          diagnosis.code === "capacity_violation" ? "high" : "medium",
          diagnosis.code,
          rider,
          preferredVehicle,
          diagnosis.message,
          diagnosis.suggestion
        );

        conflicts.push(issue);
        suggestedFixes.push({
          riderId: rider.userId,
          riderName: rider.riderName,
          code: diagnosis.code,
          suggestion: diagnosis.suggestion,
        });

        if (diagnosis.code === "capacity_violation") {
          capacityViolations.push(issue);
        } else if (diagnosis.code === "city_mismatch") {
          cityMismatch.push(issue);
        } else if (diagnosis.code === "register_mismatch") {
          registerMismatch.push(issue);
        } else if (diagnosis.code === "missing_vehicle") {
          missingVehicles.push(issue);
        }
      });

      if (excludedVehicles.length) {
        warnings.push({
          source: "vehicles",
          severity: "low",
          code: "excluded_vehicle_count",
          message: "تم استبعاد " + excludedVehicles.length + " مركبة غير تشغيلية من التحليل.",
          suggestion: "راجع الحالات مثل الصيانة أو التأمين أو التالف.",
        });
      }

      const vehicleUtilization = assignableVehicles.map(function (vehicle) {
        const assignedRiders = occupancy.get(vehicle.serial) || [];
        const capacityLimit = getCapacityLimit(vehicle.vehicleType, settings);
        return {
          vehicleSerial: vehicle.serial,
          vehicleType: vehicle.vehicleType,
          city: vehicle.city,
          register: vehicle.register,
          transportMode: vehicle.transportMode,
          occupancy: assignedRiders.length,
          capacityLimit: capacityLimit,
          availableSlots: Math.max(0, capacityLimit - assignedRiders.length),
          assignedRiders: assignedRiders.slice(),
          isFull: assignedRiders.length >= capacityLimit,
        };
      });
      const availableVehicles = vehicleUtilization.filter(function (vehicle) {
        return !vehicle.isFull;
      });
      const fullVehicles = vehicleUtilization.filter(function (vehicle) {
        return vehicle.isFull;
      });
      const unassignedRiders = conflicts.map(function (issue) {
        return {
          riderId: issue.riderId,
          riderName: issue.riderName,
          code: issue.code,
          reason: issue.message,
          suggestion: issue.suggestion,
        };
      });

      return {
        settings: settings,
        counts: {
          riders: normalizedRiders.length,
          operatingVehicles: normalizedOperating.length,
          mergedVehicles: merged.vehicles.length,
          assignableVehicles: assignableVehicles.length,
          validAssignments: validAssignments.length,
          unresolvedConflicts: conflicts.length,
          availableVehicles: availableVehicles.length,
          fullVehicles: fullVehicles.length,
          unassignedRiders: unassignedRiders.length,
        },
        validAssignments: validAssignments,
        conflicts: conflicts,
        capacityViolations: capacityViolations,
        cityMismatch: cityMismatch,
        registerMismatch: registerMismatch,
        missingVehicles: missingVehicles,
        suggestedFixes: suggestedFixes,
        vehicleUtilization: vehicleUtilization,
        availableVehicles: availableVehicles,
        fullVehicles: fullVehicles,
        unassignedRiders: unassignedRiders,
        orphanUpdates: merged.orphanUpdates,
        excludedVehicles: excludedVehicles,
        warnings: warnings,
      };
    },
  };

  function decodeColumnLetters(letters) {
    let value = 0;
    for (let index = 0; index < letters.length; index += 1) {
      value = value * 26 + (letters.charCodeAt(index) - 64);
    }
    return value - 1;
  }

  function encodeColumnIndex(index) {
    let value = index + 1;
    let letters = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      value = Math.floor((value - 1) / 26);
    }
    return letters;
  }

  function decodeCellReference(reference) {
    const match = /^([A-Z]+)(\d+)$/i.exec(reference || "");
    if (!match) {
      return null;
    }
    return {
      col: decodeColumnLetters(match[1].toUpperCase()),
      row: Number(match[2]) - 1,
    };
  }

  function decodeRange(reference) {
    const parts = String(reference || "").split(":");
    const start = decodeCellReference(parts[0]);
    const end = decodeCellReference(parts[1] || parts[0]);
    if (!start || !end) {
      return null;
    }
    return { start: start, end: end };
  }

  function getSheetCell(sheet, rowIndex, colIndex) {
    const ref = encodeColumnIndex(colIndex) + String(rowIndex + 1);
    return sheet[ref];
  }

  function getCellValue(cell) {
    if (!cell) {
      return "";
    }
    if (cell.w != null) {
      return cell.w;
    }
    if (cell.v != null) {
      return cell.v;
    }
    return "";
  }

  const ExcelEngine = {
    summarizeWorkbook(workbook) {
      const sheetNames = workbook && workbook.SheetNames ? workbook.SheetNames.slice() : [];
      const sheetSummaries = [];
      const formulaInventory = [];
      const warnings = [];

      sheetNames.forEach(function (sheetName) {
        const sheet = workbook.Sheets[sheetName] || {};
        const range = decodeRange(sheet["!ref"]);
        const headers = [];
        if (range) {
          for (let colIndex = range.start.col; colIndex <= range.end.col; colIndex += 1) {
            headers.push(String(getCellValue(getSheetCell(sheet, range.start.row, colIndex)) || ""));
          }
        }

        Object.keys(sheet).forEach(function (cellRef) {
          if (cellRef[0] === "!") {
            return;
          }
          const cell = sheet[cellRef];
          if (cell && cell.f) {
            formulaInventory.push({
              sheet: sheetName,
              cell: cellRef,
              formula: String(cell.f),
              value: cell.v == null ? "" : cell.v,
            });
          }
        });

        sheetSummaries.push({
          sheet: sheetName,
          range: sheet["!ref"] || "",
          rowCount: range ? Math.max(0, range.end.row - range.start.row) : 0,
          columnCount: headers.filter(Boolean).length,
          headers: headers.filter(Boolean),
          formulaCount: formulaInventory.filter(function (item) { return item.sheet === sheetName; }).length,
        });
      });

      if (!sheetNames.length) {
        warnings.push({
          source: "excel",
          severity: "high",
          code: "empty_workbook",
          message: "لم يتم العثور على أوراق عمل داخل الملف المرفوع.",
          suggestion: "تأكد من رفع ملف XLSX/XLS صالح.",
        });
      }

      if (!formulaInventory.length) {
        warnings.push({
          source: "excel",
          severity: "medium",
          code: "no_formulas_detected",
          message: "لم يتم اكتشاف معادلات صريحة داخل الملف، أو أن الورقة تعتمد على قيم ثابتة فقط.",
          suggestion: "راجع الورقة اليدوية أو ارفع نسخة تحتوي على المعادلات الأصلية.",
        });
      }

      if (!Config.referenceAvailability.workbookFoundInWorkspace) {
        warnings.push({
          source: "excel",
          severity: "medium",
          code: "workspace_reference_missing",
          message: Config.referenceAvailability.note,
          suggestion: "إذا توفر الملف المرجعي لاحقًا ارفعه من صفحة مراجعة Excel لالتقاط الصيغ الفعلية.",
        });
      }

      return {
        workbookName: workbook && workbook.Props && workbook.Props.Title ? workbook.Props.Title : Config.referenceAvailability.workbookName,
        sheets: sheetSummaries,
        formulas: formulaInventory,
        warnings: warnings,
        translatedFunctions: ExcelEngine.getTranslatedFunctions(formulaInventory),
      };
    },

    getTranslatedFunctions(formulaInventory) {
      const translated = [
        {
          name: "prorateMonthlyAmount",
          source: "Operational prompt / Excel-equivalent proration",
          description: "تحويل معادلات القسمة على أيام الشهر ثم الضرب في الأيام الفعلية للعمولة والإيجار والسكن.",
        },
        {
          name: "getValidityTier",
          source: "Operational prompt / expected IF ladder",
          description: "تحويل سلالم IF الخاصة بحوافز الصلاحية حسب نوع المركبة وعدد الطلبات.",
        },
        {
          name: "getExperienceIncentive",
          source: "Operational prompt / lookup-equivalent",
          description: "تحويل Lookup لمستوى تجربة التوصيل A/B/C إلى قيمة الحافز المناسبة.",
        },
        {
          name: "isOperationalStatus",
          source: "Update Vehicles operational filter",
          description: "تحويل شروط الاستبعاد للمركبات غير التشغيلية إلى دالة JavaScript صريحة.",
        },
        {
          name: "assignVehicles",
          source: "Operating Vehicles + Update Branches rules engine",
          description: "تحويل منطق المطابقة بالسيريال والمدينة والسجل والسعة إلى محرك تحقق وتوزيع واضح.",
        },
      ];

      const seen = new Set(translated.map(function (item) { return item.name; }));
      (formulaInventory || []).forEach(function (formulaItem) {
        const upper = String(formulaItem.formula || "").toUpperCase();
        const mapping = [
          { key: "IF(", name: "translateIfBranches", description: "تحويل منطق IF المتداخل إلى شروط JavaScript واضحة." },
          { key: "COUNTIF", name: "countMatchingRows", description: "تحويل COUNTIF/COUNTIFS إلى مرشح صفوف مع عدّ النتائج." },
          { key: "SUMIF", name: "sumMatchingRows", description: "تحويل SUMIF/SUMIFS إلى جمع شرطي على المصفوفات." },
          { key: "VLOOKUP", name: "lookupBySerial", description: "تحويل VLOOKUP إلى فهرسة Map حسب Vehicle Serial." },
          { key: "XLOOKUP", name: "lookupBySerial", description: "تحويل XLOOKUP إلى فهرسة مباشرة مع fallback." },
          { key: "IFERROR", name: "safeLookup", description: "تحويل IFERROR إلى مسار احتياطي يعرض warning بدل التخمين." },
        ].find(function (entry) {
          return upper.indexOf(entry.key) >= 0;
        });

        if (mapping && !seen.has(mapping.name)) {
          seen.add(mapping.name);
          translated.push({
            name: mapping.name,
            source: "Detected formula pattern from uploaded workbook",
            description: mapping.description,
          });
        }
      });

      return translated;
    },

    buildConversionReport(review) {
      const lines = [
        "# Excel Conversion Report",
        "",
        "## Current Status",
        "- Workspace reference file present: " + (Config.referenceAvailability.workbookFoundInWorkspace ? "Yes" : "No"),
        "- Reference workbook: `" + Config.referenceAvailability.workbookName + "`",
        "- Build note: " + Config.referenceAvailability.note,
        "",
        "## Sheets",
      ];

      (review && review.sheets ? review.sheets : []).forEach(function (sheet) {
        lines.push("- `" + sheet.sheet + "`: rows " + sheet.rowCount + ", columns " + sheet.columnCount + ", formulas " + sheet.formulaCount);
      });

      lines.push("", "## Translated Functions");
      (review && review.translatedFunctions ? review.translatedFunctions : ExcelEngine.getTranslatedFunctions([])).forEach(function (item) {
        lines.push("- `" + item.name + "`: " + item.description + " (" + item.source + ")");
      });

      lines.push("", "## Formula Inventory Preview");
      (review && review.formulas ? review.formulas.slice(0, 20) : []).forEach(function (item) {
        lines.push("- `" + item.sheet + "!" + item.cell + "` => `" + item.formula + "`");
      });

      return lines.join("\n");
    },
  };

  const ValidationEngine = {
    buildUnifiedIssues(payload) {
      const issues = [];
      const salaryResult = payload.salaryResult;
      const shiftPlan = payload.shiftPlan;
      const vehicleAnalysis = payload.vehicleAnalysis;
      const excelReview = payload.excelReview;
      const testResults = payload.testResults;

      (salaryResult && salaryResult.validations ? salaryResult.validations : []).forEach(function (item) {
        issues.push(item);
      });

      if (shiftPlan) {
        shiftPlan.shiftStats.forEach(function (stat) {
          if (!stat.withinMax) {
            issues.push({
              source: "shifts",
              severity: "high",
              code: "shift_over_max",
              message: stat.label + " تجاوز الحد الأقصى.",
              suggestion: "قلل التوزيع على هذا الشفت أو ارفع Max إذا كانت القاعدة تسمح.",
            });
          }
          if (stat.deficit > 0) {
            issues.push({
              source: "shifts",
              severity: "medium",
              code: "shift_deficit",
              message: stat.label + " لديه عجز مقداره " + stat.deficit + ".",
              suggestion: "زد عدد المناديب أو غيّر الاستراتيجية أو Targets.",
            });
          }
        });
        (shiftPlan.warnings || []).forEach(function (warning) {
          issues.push(warning);
        });
      }

      if (vehicleAnalysis) {
        (vehicleAnalysis.conflicts || []).forEach(function (issue) { issues.push(issue); });
        (vehicleAnalysis.warnings || []).forEach(function (warning) { issues.push(warning); });
      }

      if (excelReview) {
        (excelReview.warnings || []).forEach(function (warning) { issues.push(warning); });
      } else if (!Config.referenceAvailability.workbookFoundInWorkspace) {
        issues.push({
          source: "excel",
          severity: "medium",
          code: "excel_reference_missing",
          message: Config.referenceAvailability.note,
          suggestion: "ارفع الملف المرجعي من صفحة مراجعة Excel لاحقًا.",
        });
      }

      if (testResults) {
        (testResults.results || []).forEach(function (result) {
          if (!result.passed) {
            issues.push({
              source: "tests",
              severity: "high",
              code: "test_failure",
              message: "فشل الاختبار: " + result.name,
              suggestion: result.details,
            });
          }
        });
      }

      const summary = issues.reduce(function (memo, issue) {
        memo.total += 1;
        memo[issue.severity] = (memo[issue.severity] || 0) + 1;
        return memo;
      }, { total: 0, high: 0, medium: 0, low: 0, info: 0 });

      return {
        issues: issues,
        summary: summary,
      };
    },
  };

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  const TestEngine = {
    runAll() {
      const tests = [];

      function runTest(id, name, handler) {
        try {
          const details = handler();
          tests.push({ id: id, name: name, passed: true, details: details });
        } catch (error) {
          tests.push({ id: id, name: name, passed: false, details: error.message });
        }
      }

      runTest("salary_car_460", "سيارة 460 طلب صالحة", function () {
        const result = SalaryEngine.calculate(SalaryEngine.createDefaultInput());
        assert(result.isValid, "Expected valid rider for car scenario.");
        assert(Utils.approxEqual(result.netPay, 3529.5483870967746, 0.05), "Unexpected net pay: " + result.netPay);
        return "Net pay " + Utils.round(result.netPay, 2);
      });

      runTest("salary_bike_460", "دباب 460 طلب صالح", function () {
        const input = SalaryEngine.createDefaultInput();
        input.vehicleType = "bike";
        const result = SalaryEngine.calculate(input);
        assert(result.isValid, "Expected valid rider for bike scenario.");
        assert(Utils.approxEqual(result.netPay, 2188.258064516129, 0.05), "Unexpected bike net pay: " + result.netPay);
        return "Net pay " + Utils.round(result.netPay, 2);
      });

      runTest("salary_invalid_zero_incentives", "مندوب غير صالح حوافزه صفر", function () {
        const input = SalaryEngine.createDefaultInput();
        input.orders = 300;
        input.validDays = 5;
        const result = SalaryEngine.calculate(input);
        assert(!result.isValid, "Expected invalid rider.");
        assert(result.validityIncentive === 0, "Validity incentive should be zero.");
        assert(result.experienceIncentive === 0, "Experience incentive should be zero.");
        return "Incentives cleared";
      });

      runTest("salary_mid_month_proration", "بدء يوم 15 يحسب نسبيًا", function () {
        const input = SalaryEngine.createDefaultInput();
        input.workDays = 17;
        input.vehicleDays = 17;
        const result = SalaryEngine.calculate(input);
        assert(Utils.approxEqual(result.commission, 1370.967741935484, 0.05), "Commission proration mismatch.");
        assert(Utils.approxEqual(result.rent, 987.0967741935484, 0.05), "Rent proration mismatch.");
        return "Commission " + Utils.round(result.commission, 2) + ", rent " + Utils.round(result.rent, 2);
      });

      runTest("shift_shortage_no_max_exceed", "نقص المناديب لا يتجاوز Max", function () {
        const template = Config.shifts.templates.standard6.map(function (shift) {
          return Object.assign({}, shift, { target: 8, max: 8 });
        });
        const result = ShiftEngine.plan({
          shifts: template,
          riderCount: 12,
          shiftsPerRider: 3,
          strategy: "balanced",
        });
        assert(result.shiftStats.every(function (stat) { return stat.assigned <= stat.max; }), "Found max exceed.");
        assert(result.totalAssigned === 36, "Expected 36 assigned slots.");
        assert(result.totalDeficit === 12, "Expected minimized deficit of 12.");
        return "Assigned " + result.totalAssigned + " with deficit " + result.totalDeficit;
      });

      runTest("shift_rider_ids_and_unassigned", "توزيع الشفتات يحتفظ بالأيديهات ويُظهر غير الموزعين", function () {
        const template = Config.shifts.templates.standard6.map(function (shift) {
          return Object.assign({}, shift, { target: 1, max: 1 });
        });
        const result = ShiftEngine.plan({
          shifts: template,
          riderIds: ["U100", "U200", "U300"],
          shiftsPerRider: 3,
          strategy: "balanced",
        });
        assert(result.rows.length === 2, "Expected exactly 2 assigned riders.");
        assert(result.rows[0].riderId === "U100", "Expected provided rider ID in output.");
        assert(result.rows.every(function (row) { return row.combinationType; }), "Expected combination types.");
        assert(result.unassigned.length === 1 && result.unassigned[0].riderId === "U300", "Expected one unassigned rider.");
        return "Assigned " + result.rows.length + ", unassigned " + result.unassigned.length;
      });

      runTest("parse_rider_ids_dedupes_and_skips_header", "قراءة الأيديهات تزيل التكرار وتتجاهل الهيدر", function () {
        const parsed = DataEngine.parseRiderIds([
          "user_id,name",
          "1782916129257495,Ahmed",
          "1782916129257495,Ahmed duplicate",
          "1782831407480165,Bader",
        ].join("\n"));
        assert(parsed.uniqueCount === 2, "Expected 2 unique IDs.");
        assert(parsed.duplicateCount === 1, "Expected one duplicate.");
        assert(parsed.hasHeader, "Expected header detection.");
        return "IDs " + parsed.ids.join(", ");
      });

      runTest("vehicle_city_mismatch", "مركبة بمدينة مختلفة تظهر Conflict", function () {
        const analysis = VehicleEngine.assignVehicles({
          operatingRows: DataEngine.parseCsvRows([
            "vehicle_serial,city,register,vehicle_type,operating_status,transport_mode",
            "CAR-1,جدة,CR-JED,car,operational,public",
          ].join("\n")),
          updateRows: [],
          branchRows: [],
          riderRows: DataEngine.parseCsvRows([
            "user_id,rider_name,city,register,current_vehicle_serial,vehicle_type,dashboard_transport_mode",
            "R1,Ahmed,الرياض,CR-RYD,CAR-1,car,public",
          ].join("\n")),
          settings: VehicleEngine.createDefaultSettings(),
        });
        assert(analysis.cityMismatch.length === 1, "Expected one city mismatch.");
        return "City mismatch captured";
      });

      runTest("vehicle_capacity_violation", "تجاوز السعة يظهر Capacity Violation", function () {
        const settings = VehicleEngine.createDefaultSettings();
        settings.carCapacity = 1;
        const analysis = VehicleEngine.assignVehicles({
          operatingRows: DataEngine.parseCsvRows([
            "vehicle_serial,city,register,vehicle_type,operating_status,transport_mode",
            "CAR-1,جدة,CR-JED,car,operational,public",
          ].join("\n")),
          updateRows: [],
          branchRows: [],
          riderRows: DataEngine.parseCsvRows([
            "user_id,rider_name,city,register,current_vehicle_serial,vehicle_type,dashboard_transport_mode",
            "R1,Ahmed,جدة,CR-JED,CAR-1,car,public",
            "R2,Bader,جدة,CR-JED,CAR-1,car,public",
          ].join("\n")),
          settings: settings,
        });
        assert(analysis.capacityViolations.length === 1, "Expected one capacity violation.");
        return "Capacity violation captured";
      });

      runTest("vehicle_reports_utilization", "تقرير المركبات يُظهر المتاح والممتلئ وغير الموزعين", function () {
        const settings = VehicleEngine.createDefaultSettings();
        settings.carCapacity = 1;
        const analysis = VehicleEngine.assignVehicles({
          operatingRows: DataEngine.parseCsvRows([
            "vehicle_serial,city,register,vehicle_type,operating_status,transport_mode",
            "CAR-1,جدة,CR-JED,car,operational,public",
            "CAR-2,جدة,CR-JED,car,operational,public",
          ].join("\n")),
          updateRows: [],
          branchRows: [],
          riderRows: DataEngine.parseCsvRows([
            "user_id,rider_name,city,register,current_vehicle_serial,vehicle_type,dashboard_transport_mode",
            "R1,Ahmed,جدة,CR-JED,CAR-1,car,public",
            "R2,Bader,جدة,CR-JED,CAR-1,car,public",
            "R3,Saad,جدة,CR-JED,CAR-9,car,public",
          ].join("\n")),
          settings: settings,
        });
        assert(analysis.fullVehicles.length === 2, "Expected both cars to become full.");
        assert(analysis.availableVehicles.length === 0, "Expected no available cars.");
        assert(analysis.unassignedRiders.length === 1, "Expected one unassigned rider.");
        return "Full " + analysis.fullVehicles.length + ", unassigned " + analysis.unassignedRiders.length;
      });

      const summary = tests.reduce(function (memo, test) {
        memo.total += 1;
        if (test.passed) {
          memo.passed += 1;
        } else {
          memo.failed += 1;
        }
        return memo;
      }, { total: 0, passed: 0, failed: 0 });

      return {
        executedAt: new Date().toISOString(),
        results: tests,
        summary: summary,
      };
    },
  };

  return {
    Config: Config,
    SampleData: SampleData,
    Utils: Utils,
    SalaryEngine: SalaryEngine,
    ShiftEngine: ShiftEngine,
    DataEngine: DataEngine,
    VehicleEngine: VehicleEngine,
    ExcelEngine: ExcelEngine,
    ValidationEngine: ValidationEngine,
    TestEngine: TestEngine,
  };
});
