import type {
    ServerOptions,
    ClientOptions
} from 'isomorphic-ws';
import type {
    RxCollection,
    RxDatabase,
    RxReplicationHandler,
    StringKeys
} from '../../types';

export type WebsocketServerOptions = {
    database: RxDatabase;
} & ServerOptions;


export type WebsocketClientOptions<RxDocType> = {
    collection: RxCollection<RxDocType>;
    url: string;
    batchSize?: number;
} & ClientOptions;


export type WebsocketMessageType = {
    id: string;
    collection: string;
    method: StringKeys<RxReplicationHandler<any, any>>;
    params: any[];
}

export type WebsocketMessageResponseType = {
    id: string;
    collection: string;
    result: any;
}
