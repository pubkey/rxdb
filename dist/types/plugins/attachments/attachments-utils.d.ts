import type { RxStorageInstance, WithDeletedAndAttachments } from '../../types/index.d.ts';
export declare function ensureSchemaSupportsAttachments(doc: any): void;
export declare function assignMethodsToAttachment(attachment: any): void;
/**
 * Fill up the missing attachment.data of the newDocument
 * so that the new document can be send to somewhere else
 * which could then receive all required attachments data
 * that it did not have before.
 */
export declare function fillWriteDataForAttachmentsChange<RxDocType>(primaryPath: string, storageInstance: RxStorageInstance<RxDocType, any, any, any>, newDocument: WithDeletedAndAttachments<RxDocType>, originalDocument?: WithDeletedAndAttachments<RxDocType>): Promise<WithDeletedAndAttachments<RxDocType>>;
