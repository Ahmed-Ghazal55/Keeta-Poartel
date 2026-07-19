(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.NotificationNavigation = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var NAVIGATION_EVENT = "keeta:notification-navigation";

  function createNotificationNavigator(options) {
    options = options || {};
    var getUiShell = typeof options.getUiShell === "function"
      ? options.getUiShell
      : function () {
          return typeof window !== "undefined" && window.KeetaPortal ? window.KeetaPortal.UIShell || null : null;
        };
    var dispatchEvent = typeof options.dispatchEvent === "function"
      ? options.dispatchEvent
      : defaultDispatchEvent;

    function navigate(notification, actionOptions) {
      var request = buildNavigationRequest(notification, actionOptions);
      var uiShell = getUiShell();
      if (uiShell && typeof uiShell.openPage === "function" && request.linkedPage) {
        uiShell.openPage(stripPagePrefix(request.linkedPage), {
          page: request.linkedPage,
          subPage: request.linkedSubPage || ""
        });
      }
      dispatchEvent(NAVIGATION_EVENT, request);
      return request;
    }

    return {
      navigate: navigate
    };
  }

  function buildNavigationRequest(notification, actionOptions) {
    notification = notification || {};
    actionOptions = actionOptions || {};
    return {
      actionLabel: normalizeText(notification.actionLabel),
      actualRiderIqama: normalizeText(notification.actualRiderIqama),
      assignmentId: normalizeText(notification.assignmentId),
      courierId: normalizeText(notification.courierId),
      entityId: normalizeText(notification.entityId || notification.sourceEntityId),
      entityType: normalizeText(notification.entityType || notification.sourceEntity),
      explicitDrawer: !!actionOptions.openDrawer,
      importBatchId: normalizeText(notification.importBatchId),
      linkedDrawer: !!actionOptions.openDrawer ? normalizeText(notification.linkedDrawer) : "",
      linkedFilters: cloneValue(notification.linkedFilters || {}),
      linkedPage: normalizeText(notification.linkedPage || notification.actionPage),
      linkedSubPage: normalizeText(notification.linkedSubPage),
      notificationId: normalizeText(notification.id),
      ownerIqama: normalizeText(notification.ownerIqama),
      sourceModule: normalizeText(notification.sourceModule || notification.source),
      sourceType: normalizeText(notification.sourceType),
      suggestedAction: normalizeText(notification.suggestedAction)
    };
  }

  function stripPagePrefix(page) {
    page = normalizeText(page);
    return page.indexOf("page-") === 0 ? page.slice(5) : page;
  }

  function defaultDispatchEvent(eventName, detail) {
    if (typeof document === "undefined" || typeof window === "undefined" || typeof window.CustomEvent !== "function") {
      return false;
    }
    document.dispatchEvent(new window.CustomEvent(eventName, {
      detail: detail
    }));
    return true;
  }

  function cloneValue(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  return {
    NAVIGATION_EVENT: NAVIGATION_EVENT,
    buildNavigationRequest: buildNavigationRequest,
    createNotificationNavigator: createNotificationNavigator
  };
});
