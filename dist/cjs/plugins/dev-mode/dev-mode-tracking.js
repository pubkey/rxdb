"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addDevModeTrackingIframe = addDevModeTrackingIframe;
var _index = require("../utils/index.js");
var iframeShown = false;

/**
 * Adds an iframe to track the results of marketing efforts.
 */
async function addDevModeTrackingIframe(db) {
  /**
   * Only run this in browser AND localhost AND dev-mode.
   * Make sure this is never used in production by someone.
   */
  if (iframeShown || typeof window === 'undefined' || typeof location === 'undefined'
  // !isLocalHost()
  ) {
    return;
  }

  // do not show if premium flag is set.
  if (_index.RXDB_UTILS_GLOBAL.premium && typeof _index.RXDB_UTILS_GLOBAL.premium === 'string' && (await (0, _index.defaultHashSha256)(_index.RXDB_UTILS_GLOBAL.premium)) === _index.PREMIUM_FLAG_HASH) {
    return;
  }
  iframeShown = true;
  var iframe = document.createElement('iframe');
  /**
   * Do not use display:none
   * @link https://medium.com/@zachcaceres/dont-use-display-none-to-hide-iframes-in-safari-b51715eb22c4
   */
  iframe.style.visibility = 'hidden';
  iframe.width = '1px';
  iframe.height = '1px';
  iframe.style.opacity = '0.1';
  iframe.src = 'https://rxdb.info/html/dev-mode-iframe.html?version=' + _index.RXDB_VERSION;
  document.body.appendChild(iframe);
}
function isLocalHost() {
  return location.hostname === 'localhost' || location.hostname.includes('localhost') || location.hostname === '127.0.0.1' || location.hostname === '0.0.0.0' || location.hostname === '[::1]' // IPv6
  ;
}
//# sourceMappingURL=dev-mode-tracking.js.map