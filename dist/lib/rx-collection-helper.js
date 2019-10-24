"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._handleToPouch = _handleToPouch;
exports._handleFromPouch = _handleFromPouch;

var _util = require("./util");

/**
 * wrappers for Pouch.put/get to handle keycompression etc
 */
function _handleToPouch(col, docData) {
  var data = (0, _util.clone)(docData);
  data = col._crypter.encrypt(data);
  data = col.schema.swapPrimaryToId(data);
  if (col.schema.doKeyCompression()) data = col._keyCompressor.compress(data);
  return data;
}

function _handleFromPouch(col, docData) {
  var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var data = (0, _util.clone)(docData);
  data = col.schema.swapIdToPrimary(data);
  if (col.schema.doKeyCompression()) data = col._keyCompressor.decompress(data);
  if (noDecrypt) return data;
  data = col._crypter.decrypt(data);
  return data;
}

//# sourceMappingURL=rx-collection-helper.js.map