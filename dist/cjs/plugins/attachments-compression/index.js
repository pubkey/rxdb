"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compressBase64 = compressBase64;
exports.decompressBase64 = decompressBase64;
exports.wrappedAttachmentsCompressionStorage = wrappedAttachmentsCompressionStorage;
var _pluginHelpers = require("../../plugin-helpers.js");
var _index = require("../utils/index.js");
/**
 * @link https://github.com/WICG/compression/blob/main/explainer.md
 */
async function compressBase64(mode, base64String) {
  var arrayBuffer = (0, _index.base64ToArrayBuffer)(base64String);
  var stream = (0, _index.ensureNotFalsy)(new Response(arrayBuffer).body).pipeThrough(new CompressionStream(mode));
  var result = await new Response(stream).arrayBuffer();
  return (0, _index.arrayBufferToBase64)(result);
}
async function decompressBase64(mode, base64String) {
  var arrayBuffer = (0, _index.base64ToArrayBuffer)(base64String);
  var stream = (0, _index.ensureNotFalsy)(new Response(arrayBuffer).body).pipeThrough(new DecompressionStream(mode));
  var result = await new Response(stream).arrayBuffer();
  return (0, _index.arrayBufferToBase64)(result);
}

/**
 * A RxStorage wrapper that compresses attachment data on writes
 * and decompresses the data on reads.
 *
 * This is using the CompressionStream API,
 * @link https://caniuse.com/?search=compressionstream
 */
function wrappedAttachmentsCompressionStorage(args) {
  return Object.assign({}, args.storage, {
    async createStorageInstance(params) {
      if (!params.schema.attachments || !params.schema.attachments.compression) {
        return args.storage.createStorageInstance(params);
      }
      var mode = params.schema.attachments.compression;
      async function modifyToStorage(docData) {
        await Promise.all(Object.values(docData._attachments).map(async attachment => {
          if (!attachment.data) {
            return;
          }
          var attachmentWriteData = attachment;
          attachmentWriteData.data = await compressBase64(mode, attachmentWriteData.data);
        }));
        return docData;
      }
      function modifyAttachmentFromStorage(attachmentData) {
        return decompressBase64(mode, attachmentData);
      }

      /**
       * Because this wrapper resolves the attachments.compression,
       * we have to remove it before sending it to the underlying RxStorage.
       * which allows underlying storages to detect wrong configurations
       * like when compression is set to false but no attachment-compression module is used.
       */
      var childSchema = (0, _index.flatClone)(params.schema);
      childSchema.attachments = (0, _index.flatClone)(childSchema.attachments);
      delete (0, _index.ensureNotFalsy)(childSchema.attachments).compression;
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: childSchema
      }));
      return (0, _pluginHelpers.wrapRxStorageInstance)(params.schema, instance, modifyToStorage, d => d, modifyAttachmentFromStorage);
    }
  });
}
//# sourceMappingURL=index.js.map