import {
    Server as HTTPServer
} from 'http';

export type GraphQLServerOptions = {
    path: string;
    port: number;
    cors?: boolean;
    checkpointFields: string[];
    deletedField?: string;
};


export type GraphQLServerState = {
    server: HTTPServer;
    close: () => Promise<void>;
    url: string;
}
