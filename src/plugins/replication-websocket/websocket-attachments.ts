import {
    deserializeDocAttachments,
    serializeDocAttachments
} from '../../replication-protocol/helper.ts';
import type {
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow,
    WithDeletedAndAttachments
} from '../../types/index.d.ts';

/**
 * The websocket messages are sent as JSON strings
 * which cannot contain the Blob data of attachments.
 * Therefore the attachment data is sent as base64 strings
 * and transformed back into Blobs on the receiving side.
 */
export function serializeAttachmentsOfDocs<RxDocType>(
    docs: WithDeletedAndAttachments<RxDocType>[]
): Promise<WithDeletedAndAttachments<RxDocType>[]> {
    return Promise.all(docs.map(doc => serializeDocAttachments(doc, true)));
}

export async function deserializeAttachmentsOfDocs<RxDocType>(
    docs: WithDeletedAndAttachments<RxDocType>[]
): Promise<WithDeletedAndAttachments<RxDocType>[]> {
    await Promise.all(docs.map(doc => deserializeDocAttachments(doc)));
    return docs;
}

export async function serializeAttachmentsOfPullResult<RxDocType, CheckpointType>(
    result: RxReplicationPullStreamItem<RxDocType, CheckpointType>
): Promise<RxReplicationPullStreamItem<RxDocType, CheckpointType>> {
    if (result === 'RESYNC') {
        return result;
    }
    return {
        ...result,
        documents: await serializeAttachmentsOfDocs(result.documents)
    };
}

export async function deserializeAttachmentsOfPullResult<RxDocType, CheckpointType>(
    result: RxReplicationPullStreamItem<RxDocType, CheckpointType>
): Promise<RxReplicationPullStreamItem<RxDocType, CheckpointType>> {
    if (result !== 'RESYNC') {
        await deserializeAttachmentsOfDocs(result.documents);
    }
    return result;
}

export function serializeAttachmentsOfWriteRows<RxDocType>(
    rows: RxReplicationWriteToMasterRow<RxDocType>[]
): Promise<RxReplicationWriteToMasterRow<RxDocType>[]> {
    return Promise.all(rows.map(async (row) => {
        const serialized: RxReplicationWriteToMasterRow<RxDocType> = {
            newDocumentState: await serializeDocAttachments(row.newDocumentState, true)
        };
        if (row.assumedMasterState) {
            serialized.assumedMasterState = await serializeDocAttachments(row.assumedMasterState, true);
        }
        return serialized;
    }));
}

export async function deserializeAttachmentsOfWriteRows<RxDocType>(
    rows: RxReplicationWriteToMasterRow<RxDocType>[]
): Promise<RxReplicationWriteToMasterRow<RxDocType>[]> {
    await Promise.all(rows.map(async (row) => {
        await deserializeDocAttachments(row.newDocumentState);
        if (row.assumedMasterState) {
            await deserializeDocAttachments(row.assumedMasterState);
        }
    }));
    return rows;
}
