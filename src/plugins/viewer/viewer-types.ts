import type { Subscription } from 'rxjs';

export type ViewerConnectionParams = {
    topic: string;
    signalingServerUrl: string;
    databaseName: string;
};

export type ViewerServerOptions = {
    signalingServerUrl?: string;
    topic?: string;
    webSocketConstructor?: { new(url: string): WebSocket; };
};

export type ViewerState = {
    connectionParams: ViewerConnectionParams;
    close: () => Promise<void>;
};

export type ViewerMethod =
    | 'getDbInfo'
    | 'getCollectionInfo'
    | 'query'
    | 'count'
    | 'exportCollection'
    | 'observeQuery'
    | 'unobserveQuery'
    | 'writeDocument'
    | 'deleteDocument';

export type ViewerRequest = {
    id: string;
    method: ViewerMethod;
    params?: any;
};

export type ViewerResponse = {
    id: string;
    result?: any;
    error?: string;
};

export type ViewerPushMessage = {
    type: 'observeResult';
    observeId: string;
    data: any;
};

export type ViewerDbInfo = {
    databaseName: string;
    collections: ViewerCollectionInfo[];
};

export type ViewerCollectionInfo = {
    name: string;
    schema: any;
    docCount: number;
    primaryKey?: string;
};

export type ViewerSignalingMessage =
    | { type: 'init'; yourPeerId: string; }
    | { type: 'join'; room: string; }
    | { type: 'joined'; otherPeerIds: string[]; }
    | { type: 'signal'; room: string; senderPeerId: string; receiverPeerId: string; data: any; }
    | { type: 'ping'; };

export type ViewerPeerState = {
    peerId: string;
    observeSubscriptions: Map<string, Subscription>;
};
