(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DetailFields = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeField(field) {
    field = field || {};
    return {
      label: field.label || "",
      ltr: !!field.ltr,
      tone: field.tone || "",
      value: normalizeValue(field.value),
      valueHtml: field.valueHtml || ""
    };
  }

  function renderDetailField(field) {
    field = normalizeField(field);
    return [
      '<div class="ui-detail-field' + (field.tone ? " is-" + escapeHtml(field.tone) : "") + '">',
      '  <span class="ui-detail-field__label">' + escapeHtml(field.label || "-") + "</span>",
      '  <div class="ui-detail-field__value' + (field.ltr ? " is-ltr" : "") + '">' + (field.valueHtml || escapeHtml(field.value)) + "</div>",
      "</div>"
    ].join("");
  }

  function renderFieldsGrid(fields) {
    return '<div class="ui-detail-grid">' + (fields || []).map(renderDetailField).join("") + "</div>";
  }

  function normalizeValue(value) {
    if (value == null || value === "") {
      return "-";
    }
    if (Array.isArray(value)) {
      return value.length ? value.join(" | ") : "-";
    }
    return String(value);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    normalizeField: normalizeField,
    normalizeValue: normalizeValue,
    renderDetailField: renderDetailField,
    renderFieldsGrid: renderFieldsGrid
  };
});
