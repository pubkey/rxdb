import { wrapRxStorageInstance } from "../../plugin-helpers.js";
import { deflate, inflate } from 'pako';
import { arrayBufferToBase64, base64ToArrayBuffer, ensureNotFalsy, flatClone } from "../utils/index.js";
export function compressBase64(_mode, base64String) {
  var arrayBuffer = base64ToArrayBuffer(base64String);
  var result = deflate(arrayBuffer, {});
  return arrayBufferToBase64(result);
}
export function decompressBase64(_mode, base64String) {
  var arrayBuffer = base64ToArrayBuffer(base64String);
  var result = inflate(arrayBuffer);
  return arrayBufferToBase64(result);
}

/**
 * A RxStorage wrapper that compresses attachment data on writes
 * and decompresses the data on reads.
 * This is currently using the 'pako' module
 * @link https://www.npmjs.com/package/pako
 *
 * In the future when firefox supports the CompressionStream API,
 * we should switch to using the native API in browsers and the zlib package in node.js
 * @link https://caniuse.com/?search=compressionstream
 */
export function wrappedAttachmentsCompressionStorage(args) {
  return Object.assign({}, args.storage, {
    async createStorageInstance(params) {
      if (!params.schema.attachments || !params.schema.attachments.compression) {
        return args.storage.createStorageInstance(params);
      }
      var mode = params.schema.attachments.compression;
      if (mode !== 'deflate') {
        throw new Error('unknown compression mode ' + mode);
      }
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
      var childSchema = flatClone(params.schema);
      childSchema.attachments = flatClone(childSchema.attachments);
      delete ensureNotFalsy(childSchema.attachments).compression;
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: childSchema
      }));
      return wrapRxStorageInstance(params.schema, instance, modifyToStorage, d => d, modifyAttachmentFromStorage);
    }
  });
}
//# sourceMappingURL=index.js.map