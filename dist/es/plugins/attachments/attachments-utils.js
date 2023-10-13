import { newRxError } from "../../rx-error.js";
import { ensureNotFalsy } from "../utils/index.js";
export function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonSchema;
  if (!schemaJson.attachments) {
    throw newRxError('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}
export function assignMethodsToAttachment(attachment) {
  Object.entries(attachment.doc.collection.attachments).forEach(([funName, fun]) => {
    Object.defineProperty(attachment, funName, {
      get: () => fun.bind(attachment)
    });
  });
}

/**
 * Fill up the missing attachment.data of the newDocument
 * so that the new document can be send to somewhere else
 * which could then receive all required attachments data
 * that it did not have before.
 */
export async function fillWriteDataForAttachmentsChange(primaryPath, storageInstance, newDocument, originalDocument) {
  if (!newDocument._attachments || originalDocument && !originalDocument._attachments) {
    throw new Error('_attachments missing');
  }
  var docId = newDocument[primaryPath];
  var originalAttachmentsIds = new Set(originalDocument && originalDocument._attachments ? Object.keys(originalDocument._attachments) : []);
  await Promise.all(Object.entries(newDocument._attachments).map(async ([key, value]) => {
    if ((!originalAttachmentsIds.has(key) || originalDocument && ensureNotFalsy(originalDocument._attachments)[key].digest !== value.digest) && !value.data) {
      var attachmentDataString = await storageInstance.getAttachmentData(docId, key, value.digest);
      value.data = attachmentDataString;
    }
  }));
  return newDocument;
}
//# sourceMappingURL=attachments-utils.js.map