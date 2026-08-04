import { newRxError } from '../../rx-error.ts';

/**
 * A minimal websocket client that reconnects with an
 * exponential backoff when the connection is lost.
 * Messages that are sent while the client is not connected,
 * are queued and flushed as soon as the connection is open again.
 *
 * This replaces the unmaintained 'reconnecting-websocket' npm module
 * which was the only dependency of the websocket replication.
 */

export type ReconnectingWebSocketOptions = {
    /**
     * The WebSocket implementation to use.
     * (optional, default: the global WebSocket)
     */
    WebSocket?: any;
    /**
     * Time in milliseconds to wait before the first reconnect attempt.
     * (optional, [default=1000])
     */
    minReconnectionDelay?: number;
    /**
     * Maximum time in milliseconds to wait between two reconnect attempts.
     * (optional, [default=10000])
     */
    maxReconnectionDelay?: number;
    /**
     * Factor the reconnection delay grows with on each failed attempt.
     * (optional, [default=1.3])
     */
    reconnectionDelayGrowFactor?: number;
    /**
     * Time in milliseconds a connection attempt has to open the connection.
     * When it takes longer, the attempt is aborted and retried.
     * (optional, [default=4000])
     */
    connectionTimeout?: number;
    /**
     * Time in milliseconds a connection has to stay open
     * before the retry counter is reset.
     * (optional, [default=5000])
     */
    minUptime?: number;
    /**
     * How many times the client tries to reconnect before it gives up.
     * (optional, [default=Infinity])
     */
    maxRetries?: number;
};

const DEFAULT_OPTIONS = {
    minReconnectionDelay: 1000,
    maxReconnectionDelay: 10000,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 4000,
    minUptime: 5000,
    maxRetries: Infinity
};

export class ReconnectingWebSocket {
    public onopen: ((event: any) => void) | null = null;
    public onclose: ((event: any) => void) | null = null;
    public onerror: ((event: any) => void) | null = null;
    public onmessage: ((event: any) => void) | null = null;

    private socket: any = null;
    /**
     * Amount of connection attempts that were started
     * since the last working connection.
     * Is -1 before the first attempt so that the
     * initial connect does not have to wait.
     */
    private retryCount = -1;
    private shouldReconnect = true;
    private isConnecting = false;
    private messageQueue: any[] = [];
    private connectionTimeoutId: any;
    private uptimeTimeoutId: any;
    private reconnectTimeoutId: any;

    constructor(
        public readonly url: string,
        public readonly protocols: string | string[] = [],
        public readonly options: ReconnectingWebSocketOptions = {}
    ) {
        this.connect();
    }

    get readyState(): number {
        return this.socket ? this.socket.readyState : 0;
    }

    /**
     * Sends the data to the server.
     * When the client is not connected, the data is queued
     * and sent as soon as the connection is open again.
     */
    send(data: any) {
        if (this.socket && this.socket.readyState === 1) {
            this.socket.send(data);
        } else {
            this.messageQueue.push(data);
        }
    }

    /**
     * Closes the connection and stops reconnecting.
     */
    close(code: number = 1000, reason?: string) {
        this.shouldReconnect = false;
        this.clearTimeouts();
        const socket = this.socket;
        if (!socket) {
            return;
        }
        this.removeHandlers(socket);
        this.socket = null;
        try {
            socket.close(code, reason);
        } catch (err) {
            // the socket was not open, ignore
        }
    }

    private getOption<K extends keyof typeof DEFAULT_OPTIONS>(key: K): number {
        const value = (this.options as any)[key];
        return typeof value === 'number' ? value : DEFAULT_OPTIONS[key];
    }

    private getNextDelay(): number {
        if (this.retryCount < 1) {
            return 0;
        }
        const delay = this.getOption('minReconnectionDelay') *
            Math.pow(this.getOption('reconnectionDelayGrowFactor'), this.retryCount - 1);
        return Math.min(delay, this.getOption('maxReconnectionDelay'));
    }

    private connect() {
        if (
            this.isConnecting ||
            !this.shouldReconnect ||
            this.retryCount >= this.getOption('maxRetries')
        ) {
            return;
        }
        this.isConnecting = true;
        this.retryCount = this.retryCount + 1;

        this.reconnectTimeoutId = setTimeout(() => {
            if (!this.shouldReconnect) {
                this.isConnecting = false;
                return;
            }
            const WebSocketCtor = this.options.WebSocket
                ? this.options.WebSocket
                : (typeof WebSocket !== 'undefined' ? WebSocket : undefined);
            const socket = new WebSocketCtor(this.url, this.protocols);
            this.socket = socket;
            this.isConnecting = false;

            socket.onopen = (event: any) => this.handleOpen(socket, event);
            socket.onmessage = (event: any) => {
                if (this.onmessage) {
                    this.onmessage(event);
                }
            };
            socket.onerror = (event: any) => this.handleError(event);
            socket.onclose = (event: any) => this.handleClose(event);

            this.connectionTimeoutId = setTimeout(
                () => this.handleError({
                    type: 'error',
                    message: 'TIMEOUT',
                    error: newRxError('RC_WEBSOCKET_TIMEOUT', {
                        url: this.url,
                        args: {
                            connectionTimeout: this.getOption('connectionTimeout')
                        }
                    }),
                    target: this
                }),
                this.getOption('connectionTimeout')
            );
        }, this.getNextDelay());
    }

    private handleOpen(socket: any, event: any) {
        clearTimeout(this.connectionTimeoutId);
        /**
         * Only reset the retry counter when the connection
         * stayed open long enough. Otherwise a server that accepts and
         * instantly drops connections would cause a reconnect loop
         * without any delay.
         */
        this.uptimeTimeoutId = setTimeout(() => {
            this.retryCount = 0;
        }, this.getOption('minUptime'));

        const queue = this.messageQueue;
        this.messageQueue = [];
        queue.forEach(message => socket.send(message));

        if (this.onopen) {
            this.onopen(event);
        }
    }

    private handleError(event: any) {
        /**
         * An error always breaks the current connection,
         * so the socket is thrown away and a new one is created.
         */
        const socket = this.socket;
        this.clearTimeouts();
        if (socket) {
            this.removeHandlers(socket);
            this.socket = null;
            try {
                socket.close();
            } catch (err) {
                // the socket was not open, ignore
            }
        }
        if (this.onclose) {
            this.onclose({
                type: 'close',
                code: 1000,
                reason: '',
                wasClean: false,
                target: this
            });
        }
        if (this.onerror) {
            this.onerror(event);
        }
        this.connect();
    }

    private handleClose(event: any) {
        this.clearTimeouts();
        if (this.socket) {
            this.removeHandlers(this.socket);
            this.socket = null;
        }
        if (this.onclose) {
            this.onclose(event);
        }
        this.connect();
    }

    private removeHandlers(socket: any) {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
    }

    private clearTimeouts() {
        clearTimeout(this.connectionTimeoutId);
        clearTimeout(this.uptimeTimeoutId);
        clearTimeout(this.reconnectTimeoutId);
    }
}
