import type {
    StoredMsg,
    Stream
} from 'nats';

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
