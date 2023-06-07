import type { StoredMsg, Stream } from 'nats';
export declare const NATS_REPLICATION_PLUGIN_IDENTITY_PREFIX = "nats";
export declare function getNatsServerDocumentState(natsStream: Stream, subjectPrefix: string, docId: string): Promise<StoredMsg | undefined>;
