import {
    DB_VIEWER_CHANNEL,
    DB_VIEWER_PROTOCOL_VERSION,
    isDbViewerMessage
} from '../../src/plugins/db-viewer/protocol.ts';
import type {
    DbViewerMethodName,
    DbViewerMethods,
    DbViewerPushChannel,
    DbViewerPushes,
    DbViewerResponseMessage
} from '../../src/plugins/db-viewer/protocol.ts';

type Pending = {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
};

/**
 * Talks to the RxDatabase that lives in the page which embedded this viewer.
 *
 * The viewer never holds a database. Every number on the screen was asked for
 * with `call()` or arrived on one of the pushed streams.
 */
export class DbViewerClient {
    private nextId = 1;
    private pending = new Map<number, Pending>();
    private listeners = new Map<DbViewerPushChannel, Set<(payload: any) => void>>();
    /**
     * The origin of the app that embedded us. Unknown until the host answers
     * the hello, and pinned from then on so that no message of this viewer
     * can be delivered to a different origin.
     */
    private hostOrigin: string | null = null;
    private readyResolvers: (() => void)[] = [];

    constructor(private readonly host: Window = window.parent) {
        window.addEventListener('message', event => this.receive(event));
    }

    /**
     * Announces the viewer to the host. This is the only message that must go
     * to `*`, so it deliberately carries nothing.
     */
    public hello(): void {
        this.host.postMessage({
            channel: DB_VIEWER_CHANNEL,
            version: DB_VIEWER_PROTOCOL_VERSION,
            kind: 'hello'
        }, '*');
    }

    public whenReady(): Promise<void> {
        if (this.hostOrigin !== null) {
            return Promise.resolve();
        }
        return new Promise<void>(resolve => this.readyResolvers.push(resolve));
    }

    public call<K extends DbViewerMethodName>(
        method: K,
        params: DbViewerMethods[K]['params']
    ): Promise<DbViewerMethods[K]['result']> {
        if (this.hostOrigin === null) {
            return Promise.reject(new Error('the database viewer is not connected to a host yet'));
        }
        const id = this.nextId++;
        const promise = new Promise<DbViewerMethods[K]['result']>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
        });
        this.host.postMessage({
            channel: DB_VIEWER_CHANNEL,
            version: DB_VIEWER_PROTOCOL_VERSION,
            kind: 'request',
            id,
            method,
            params
        }, this.hostOrigin);
        return promise;
    }

    public on<C extends DbViewerPushChannel>(
        stream: C,
        handler: (payload: DbViewerPushes[C]) => void
    ): () => void {
        let set = this.listeners.get(stream);
        if (!set) {
            set = new Set();
            this.listeners.set(stream, set);
        }
        set.add(handler as (payload: any) => void);
        return () => {
            set.delete(handler as (payload: any) => void);
        };
    }

    private receive(event: MessageEvent): void {
        if (event.source !== this.host) {
            return;
        }
        if (!isDbViewerMessage(event.data)) {
            return;
        }
        /**
         * Once an origin is pinned, a message from any other origin is
         * dropped even when it claims to come from the parent window.
         */
        if (this.hostOrigin !== null && event.origin !== this.hostOrigin) {
            return;
        }
        const data: any = event.data;
        if (data.kind === 'welcome') {
            this.hostOrigin = event.origin;
            this.readyResolvers.forEach(resolve => resolve());
            this.readyResolvers = [];
            return;
        }
        if (data.kind === 'response') {
            const response = data as DbViewerResponseMessage;
            const pending = this.pending.get(response.id);
            if (!pending) {
                return;
            }
            this.pending.delete(response.id);
            if (response.ok) {
                pending.resolve(response.result);
            } else {
                pending.reject(new Error(response.error));
            }
            return;
        }
        if (data.kind === 'push') {
            const handlers = this.listeners.get(data.stream as DbViewerPushChannel);
            if (handlers) {
                handlers.forEach(handler => handler(data.payload));
            }
        }
    }
}
