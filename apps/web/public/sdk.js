(function () {
  "use strict";
  var baseUrl = typeof window !== "undefined" && window.PAYKIT_BASE_URL ? window.PAYKIT_BASE_URL : "https://paykit.io";
  function checkout(options) {
    var sessionId = options && options.sessionId;
    if (!sessionId) {
      console.error("PayKit.checkout: sessionId is required. Create a checkout session via API first.");
      return;
    }
    var url = baseUrl.replace(/\/$/, "") + "/checkout/" + sessionId;
    if (options && options.openInNewTab) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
  }
  window.PayKit = window.PayKit || {};
  window.PayKit.checkout = checkout;
})();
