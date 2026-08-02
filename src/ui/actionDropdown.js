(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ActionDropdown = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ACTIVE_MENU = null;
  var ACTIVE_TRIGGER = null;
  var ROOT_ID = "uiActionDropdownRoot";
  var STYLES_ID = "uiActionDropdownStyles";

  function renderActionDropdown(options) {
    options = options || {};
    var dropdownId = options.dropdownId || ("dropdown_" + Math.random().toString(36).slice(2, 8));
    var label = options.label || "العمليات";
    var actions = normalizeActions(options.actions || []);
    return [
      '<div class="ui-action-dropdown" data-action-dropdown="' + escapeHtml(dropdownId) + '">',
      '  <button type="button" class="ui-action-dropdown__trigger" data-action-dropdown-trigger="' + escapeHtml(dropdownId) + '" data-action-dropdown-open="false" aria-haspopup="menu" aria-expanded="false">',
      "    <span>" + escapeHtml(label) + " ▾</span>",
      "  </button>",
      '  <template data-action-dropdown-template="' + escapeHtml(dropdownId) + '">',
      '    <div class="ui-action-dropdown__menu" role="menu" data-action-dropdown-menu="' + escapeHtml(dropdownId) + '" data-action-dropdown-menu-state="closed">',
      actions.map(function (action) {
        return renderActionItem(action, dropdownId, options.contextData || {});
      }).join(""),
      "    </div>",
      "  </template>",
      "</div>"
    ].join("");
  }

  function createGlobalController(doc) {
    doc = doc || (typeof document !== "undefined" ? document : null);
    if (!doc) {
      return {
        initialize: function () { return false; }
      };
    }
    ensureStyles(doc);
    ensureRoot(doc);

    return {
      closeMenu: function () {
        closeMenu(doc);
      },
      initialize: function () {
        if (doc.__keetaActionDropdownInitialized) {
          return false;
        }
        doc.__keetaActionDropdownInitialized = true;
        doc.addEventListener("click", function (event) {
          var item = closest(event.target, "[data-action-menu-item]");
          if (item && ACTIVE_MENU && ACTIVE_MENU.contains(item)) {
            if (item.disabled) {
              event.preventDefault();
              return;
            }
            dispatchSelectionEvent(doc, item);
            closeMenu(doc);
            return;
          }

          var trigger = closest(event.target, "[data-action-dropdown-trigger]");
          if (trigger) {
            event.preventDefault();
            toggleMenu(doc, trigger);
            return;
          }

          if (ACTIVE_MENU && !closest(event.target, ".ui-action-dropdown__menu")) {
            closeMenu(doc);
          }
        });
        doc.addEventListener("keydown", function (event) {
          if (event.key === "Escape") {
            closeMenu(doc);
          }
        });
        if (typeof window !== "undefined") {
          window.addEventListener("resize", function () {
            closeMenu(doc);
          });
          window.addEventListener("scroll", function (event) {
            if (ACTIVE_MENU && event && event.target && ACTIVE_MENU.contains && ACTIVE_MENU.contains(event.target)) {
              return;
            }
            closeMenu(doc);
          }, true);
        }
        return true;
      }
    };
  }

  function normalizeActions(actions) {
    return (actions || []).map(function (action) {
      return {
        actionId: action.actionId || action.id || "",
        danger: !!action.danger,
        disabled: !!action.disabled,
        label: action.label || action.actionId || action.id || "",
        reason: action.reason || "",
        tone: action.tone || (action.danger ? "danger" : "default"),
        itemData: mergeObjects({}, action.itemData || {})
      };
    }).filter(function (action) {
      return !!action.actionId;
    });
  }

  function renderActionItem(action, dropdownId, contextData) {
    var dataAttributes = mergeObjects({}, contextData || {}, action.itemData || {}, {
      "action-menu-item": action.actionId,
      "dropdown-id": dropdownId
    });
    return [
      '<button type="button" class="ui-action-dropdown__item' + (action.danger ? " is-danger" : "") + '"' +
        renderDataAttributes(dataAttributes) +
        (action.disabled ? ' disabled title="' + escapeHtml(action.reason || "غير متاح") + '"' : "") +
        ' role="menuitem">',
      "  <span>" + escapeHtml(action.label) + "</span>",
      action.disabled && action.reason
        ? '  <small>' + escapeHtml(action.reason) + "</small>"
        : "",
      "</button>"
    ].join("");
  }

  function toggleMenu(doc, trigger) {
    var dropdownId = trigger.getAttribute("data-action-dropdown-trigger");
    if (!dropdownId) {
      return;
    }
    if (ACTIVE_TRIGGER === trigger) {
      closeMenu(doc);
      return;
    }
    closeMenu(doc);
    openMenu(doc, trigger, dropdownId);
  }

  function openMenu(doc, trigger, dropdownId) {
    var host = ensureRoot(doc);
    var template = doc.querySelector('template[data-action-dropdown-template="' + dropdownId + '"]');
    if (!template) {
      return;
    }
    var fragment = template.content
      ? template.content.cloneNode(true)
      : htmlToFragment(doc, template.innerHTML);
    host.innerHTML = "";
    host.appendChild(fragment);
    ACTIVE_MENU = host.firstElementChild;
    ACTIVE_TRIGGER = trigger;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("data-action-dropdown-open", "true");
    host.setAttribute("data-action-dropdown-state", "open");
    host.setAttribute("data-open-dropdown-id", dropdownId);
    if (ACTIVE_MENU) {
      ACTIVE_MENU.setAttribute("data-action-dropdown-menu-state", "open");
    }
    positionMenu(ACTIVE_MENU, trigger);
  }

  function closeMenu(doc) {
    doc = doc || (typeof document !== "undefined" ? document : null);
    if (!doc) {
      return;
    }
    var host = ensureRoot(doc);
    host.innerHTML = "";
    if (ACTIVE_TRIGGER) {
      ACTIVE_TRIGGER.setAttribute("aria-expanded", "false");
      ACTIVE_TRIGGER.setAttribute("data-action-dropdown-open", "false");
    }
    host.setAttribute("data-action-dropdown-state", "closed");
    host.removeAttribute("data-open-dropdown-id");
    ACTIVE_MENU = null;
    ACTIVE_TRIGGER = null;
  }

  function positionMenu(menu, trigger) {
    if (!menu || !trigger || typeof window === "undefined") {
      return;
    }
    var rect = trigger.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.visibility = "hidden";
    menu.style.inset = "0 auto auto 0";
    menu.style.maxHeight = "";
    menu.style.overflowY = "";
    var menuRect = menu.getBoundingClientRect();
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    var left = rect.right - menuRect.width;
    if (left < 12) {
      left = 12;
    }
    if (left + menuRect.width > viewportWidth - 12) {
      left = viewportWidth - menuRect.width - 12;
    }
    var top = rect.bottom + 8;
    if (top + menuRect.height > viewportHeight - 12) {
      top = Math.max(12, rect.top - menuRect.height - 8);
    }
    var availableHeightBelow = Math.max(120, Math.floor(viewportHeight - rect.bottom - 20));
    var availableHeightAbove = Math.max(120, Math.floor(rect.top - 20));
    var availableHeight = top >= rect.bottom ? availableHeightBelow : availableHeightAbove;
    menu.style.maxHeight = String(Math.max(180, Math.min(availableHeight, viewportHeight - 24))) + "px";
    menu.style.overflowY = "auto";
    menu.style.left = String(Math.round(left)) + "px";
    menu.style.top = String(Math.round(top)) + "px";
    menu.style.visibility = "visible";
  }

  function dispatchSelectionEvent(doc, item) {
    var detail = {
      actionId: item.getAttribute("data-action-menu-item") || "",
      dataset: mergeObjects({}, item.dataset || {})
    };
    doc.dispatchEvent(new CustomEvent("keeta:action-dropdown-select", {
      detail: detail
    }));
  }

  function ensureRoot(doc) {
    var node = doc.getElementById(ROOT_ID);
    if (node) {
      return node;
    }
    node = doc.createElement("div");
    node.id = ROOT_ID;
    node.className = "ui-action-dropdown-root";
    node.setAttribute("data-action-dropdown-state", "closed");
    doc.body.appendChild(node);
    return node;
  }

  function ensureStyles(doc) {
    if (doc.getElementById(STYLES_ID)) {
      return;
    }
    var style = doc.createElement("style");
    style.id = STYLES_ID;
    style.textContent = [
      ".ui-action-dropdown{display:inline-flex;position:relative}",
      ".ui-action-dropdown-root{position:fixed;inset:0;pointer-events:none;z-index:var(--ui-layer-dropdown)}",
      ".ui-action-dropdown__trigger{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(15,23,42,.14);background:#fff;color:#0f172a;border-radius:12px;padding:8px 12px;font:inherit;cursor:pointer;box-shadow:0 8px 22px rgba(15,23,42,.08)}",
      ".ui-action-dropdown__trigger:hover{border-color:rgba(196,167,106,.7)}",
      ".ui-action-dropdown__menu{pointer-events:auto;display:grid;gap:4px;min-width:220px;max-width:min(280px,calc(100vw - 24px));padding:8px;border-radius:16px;background:#fff;border:1px solid rgba(15,23,42,.1);box-shadow:0 22px 48px rgba(15,23,42,.18);z-index:var(--ui-layer-dropdown)}",
      ".ui-action-dropdown__item{display:grid;gap:2px;width:100%;text-align:right;border:0;background:#fff;border-radius:12px;padding:10px 12px;font:inherit;cursor:pointer;color:#0f172a}",
      ".ui-action-dropdown__item:hover{background:#f8fafc}",
      ".ui-action-dropdown__item small{color:#64748b;font-size:11px}",
      ".ui-action-dropdown__item.is-danger{color:#b91c1c;background:#fff7f7}",
      ".ui-action-dropdown__item.is-danger:hover{background:#fee2e2}",
      ".ui-action-dropdown__item:disabled{cursor:not-allowed;opacity:.68;background:#f8fafc}"
    ].join("");
    doc.head.appendChild(style);
  }

  function renderDataAttributes(attributes) {
    return Object.keys(attributes || {}).map(function (key) {
      var value = attributes[key];
      if (value == null || value === "") {
        return "";
      }
      return ' data-' + escapeHtml(key) + '="' + escapeHtml(value) + '"';
    }).join("");
  }

  function htmlToFragment(doc, html) {
    var template = doc.createElement("template");
    template.innerHTML = html;
    return template.content.cloneNode(true);
  }

  function closest(node, selector) {
    while (node) {
      if (node.matches && node.matches(selector)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
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
    createGlobalController: createGlobalController,
    normalizeActions: normalizeActions,
    renderActionDropdown: renderActionDropdown
  };
});
