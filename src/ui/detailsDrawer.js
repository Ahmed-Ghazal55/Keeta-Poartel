(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./detailFields.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DetailsDrawer = factory(root.KeetaPortal.DetailFields);
})(typeof globalThis !== "undefined" ? globalThis : this, function (DetailFields) {
  "use strict";

  var STYLES_ID = "uiDetailsDrawerStyles";

  if (typeof document !== "undefined") {
    ensureStyles(document);
  }

  function renderDetailsDrawer(config) {
    config = config || {};
    return [
      '<div class="ui-details-drawer">',
      config.summary ? '<section class="ui-details-section ui-details-section--summary">' + renderSummary(config.summary) + "</section>" : "",
      (config.sections || []).map(renderSection).join(""),
      "</div>"
    ].join("");
  }

  function renderSummary(summary) {
    return [
      '<div class="ui-details-summary">',
      summary.title ? '<strong class="ui-details-summary__title">' + escapeHtml(summary.title) + "</strong>" : "",
      summary.subtitle ? '<div class="ui-details-summary__subtitle">' + escapeHtml(summary.subtitle) + "</div>" : "",
      summary.badges && summary.badges.length
        ? '<div class="ui-details-summary__badges">' + summary.badges.map(function (badge) {
            return '<span class="ui-details-badge' + (badge.tone ? " is-" + escapeHtml(badge.tone) : "") + '">' + escapeHtml(badge.label || badge.value || "-") + "</span>";
          }).join("") + "</div>"
        : "",
      "</div>"
    ].join("");
  }

  function renderSection(section) {
    section = section || {};
    return [
      '<section class="ui-details-section">',
      '  <div class="ui-details-section__head">',
      '    <h4 class="ui-details-section__title">' + escapeHtml(section.title || "Section") + "</h4>",
      section.note ? '    <span class="ui-details-section__note">' + escapeHtml(section.note) + "</span>" : "",
      "  </div>",
      section.fields && section.fields.length
        ? DetailFields.renderFieldsGrid(section.fields)
        : (section.contentHtml || '<div class="ui-details-empty">-</div>'),
      "</section>"
    ].join("");
  }

  function ensureStyles(doc) {
    if (!doc || doc.getElementById(STYLES_ID)) {
      return;
    }
    var style = doc.createElement("style");
    style.id = STYLES_ID;
    style.textContent = [
      ".ui-details-drawer{display:grid;gap:16px}",
      ".ui-details-summary{display:grid;gap:10px;padding:18px;border-radius:18px;background:linear-gradient(145deg,#fff7ed,#fff);border:1px solid rgba(196,167,106,.28)}",
      ".ui-details-summary__title{font-size:18px;color:#0f172a}",
      ".ui-details-summary__subtitle{color:#475569;line-height:1.7}",
      ".ui-details-summary__badges{display:flex;flex-wrap:wrap;gap:8px}",
      ".ui-details-badge{display:inline-flex;align-items:center;border-radius:999px;padding:6px 10px;background:#eef2ff;color:#1e293b;font-size:12px;font-weight:700}",
      ".ui-details-badge.is-danger{background:#fee2e2;color:#991b1b}",
      ".ui-details-badge.is-warning{background:#fef3c7;color:#92400e}",
      ".ui-details-badge.is-success{background:#dcfce7;color:#166534}",
      ".ui-details-section{display:grid;gap:12px;padding:18px;border-radius:18px;background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 18px 34px rgba(15,23,42,.06)}",
      ".ui-details-section__head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}",
      ".ui-details-section__title{margin:0;color:#0f172a;font-size:16px}",
      ".ui-details-section__note{color:#64748b;font-size:12px}",
      ".ui-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
      ".ui-detail-field{display:grid;gap:6px;padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid rgba(148,163,184,.16)}",
      ".ui-detail-field__label{font-size:12px;color:#64748b;font-weight:700}",
      ".ui-detail-field__value{color:#0f172a;line-height:1.7;overflow-wrap:anywhere}",
      ".ui-detail-field__value.is-ltr{direction:ltr;text-align:left;font-family:Consolas,'Courier New',monospace}",
      ".ui-details-empty{color:#94a3b8}",
      "@media (max-width: 900px){.ui-detail-grid{grid-template-columns:1fr}}"
    ].join("");
    doc.head.appendChild(style);
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
    ensureStyles: ensureStyles,
    renderDetailsDrawer: renderDetailsDrawer
  };
});
