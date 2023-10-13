import type { StoredMsg, Stream } from 'nats';
export declare function getNatsServerDocumentState(natsStream: Stream, subjectPrefix: string, docId: string): Promise<StoredMsg | undefined>;
