"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.blobBufferUtil = void 0;
var _utilsBase = require("./utils-base64");
/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
var blobBufferUtil = {
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  createBlobBuffer(data, type) {
    var blobBuffer = new Blob([data], {
      type
    });
    return blobBuffer;
  },
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  async createBlobBufferFromBase64(base64String, type) {
    var base64Response = await fetch("data:" + type + ";base64," + base64String);
    var blob = await base64Response.blob();
    return blob;
  },
  isBlobBuffer(data) {
    if (data instanceof Blob || typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      return true;
    } else {
      return false;
    }
  },
  toString(blobBuffer) {
    /**
     * in the electron-renderer we have a typed array insteaf of a blob
     * so we have to transform it.
     * @link https://github.com/pubkey/rxdb/issues/1371
     */
    var blobBufferType = Object.prototype.toString.call(blobBuffer);
    if (blobBufferType === '[object Uint8Array]') {
      blobBuffer = new Blob([blobBuffer]);
    }
    if (typeof blobBuffer === 'string') {
      return Promise.resolve(blobBuffer);
    }
    return blobBuffer.text();
  },
  async toBase64String(blobBuffer) {
    if (typeof blobBuffer === 'string') {
      return blobBuffer;
    }

    /**
     * in the electron-renderer we have a typed array insteaf of a blob
     * so we have to transform it.
     * @link https://github.com/pubkey/rxdb/issues/1371
     */
    var blobBufferType = Object.prototype.toString.call(blobBuffer);
    if (blobBufferType === '[object Uint8Array]') {
      blobBuffer = new Blob([blobBuffer]);
    }
    var arrayBuffer = await fetch(URL.createObjectURL(blobBuffer)).then(res => res.arrayBuffer());
    return (0, _utilsBase.arrayBufferToBase64)(arrayBuffer);
  },
  size(blobBuffer) {
    return blobBuffer.size;
  }
};
exports.blobBufferUtil = blobBufferUtil;
//# sourceMappingURL=utils-blob-buffer.js.map