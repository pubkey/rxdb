import type {
    StoredMsg,
    Stream
} from 'nats';

export const NATS_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'nats';

export async function getNatsServerDocumentState(
    natsStream: Stream,
    subjectPrefix: string,
    docId: string
): Promise<StoredMsg | undefined> {
    const remoteDocState = await natsStream.getMessage({
        last_by_subj: subjectPrefix + '.' + docId
    });
    return remoteDocState;
}
