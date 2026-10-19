import http from 'node:http';
import fs from 'node:fs';
import { deepEqual } from 'rxdb/plugins/utils';
import type { WithDeleted } from 'rxdb';
import type {
    PullResponse,
    PullStreamEvent,
    PushRow,
    TodoCheckpoint,
    TodoDocType
} from '../src/shared/schema.ts';

type StoredTodo = {
    seq: number;
    doc: WithDeleted<TodoDocType>;
};

export type TodoServerOptions = {
    port: number;
    /**
     * When set, the server state is loaded from and saved to this JSON file.
     * Without it, all data lives in memory only.
     */
    dataFile?: string;
};

export type TodoServer = {
    url: string;
    close(): Promise<void>;
};

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_BATCH_SIZE = 500;
const SSE_HEARTBEAT_MS = 15000;

/**
 * A minimal replication backend for the RxDB HTTP replication.
 * It uses only the Node.js standard library and stores the documents in memory.
 *
 * Endpoints:
 * - GET  /api/todos/pull?seq=<number>&batchSize=<number>
 * - POST /api/todos/push
 * - GET  /api/todos/pullStream  (Server-Sent Events)
 */
export async function startTodoServer(options: TodoServerOptions): Promise<TodoServer> {
    const docsById = new Map<string, StoredTodo>();
    let lastSeq = 0;

    if (options.dataFile && fs.existsSync(options.dataFile)) {
        const stored: StoredTodo[] = JSON.parse(fs.readFileSync(options.dataFile, 'utf-8'));
        for (const entry of stored) {
            docsById.set(entry.doc.id, entry);
            lastSeq = Math.max(lastSeq, entry.seq);
        }
    }

    let saveQueue: Promise<void> = Promise.resolve();
    function persist() {
        const dataFile = options.dataFile;
        if (!dataFile) {
            return;
        }
        const json = JSON.stringify(Array.from(docsById.values()));
        saveQueue = saveQueue.then(() => fs.promises.writeFile(dataFile, json));
    }

    const sseClients = new Set<http.ServerResponse>();
    function emitToPullStream(event: PullStreamEvent) {
        const message = 'data: ' + JSON.stringify(event) + '\n\n';
        for (const client of sseClients) {
            client.write(message);
        }
    }

    function handlePull(url: URL): PullResponse {
        const sinceSeq = parseInt(url.searchParams.get('seq') || '0', 10) || 0;
        const batchSize = Math.min(
            parseInt(url.searchParams.get('batchSize') || '100', 10) || 100,
            MAX_BATCH_SIZE
        );
        /**
         * A real database would use an index on 'seq' here.
         * Sorting the whole map is fine for an example.
         */
        const entries = Array.from(docsById.values())
            .filter(entry => entry.seq > sinceSeq)
            .sort((a, b) => a.seq - b.seq)
            .slice(0, batchSize);
        const checkpoint: TodoCheckpoint = {
            seq: entries.length > 0 ? entries[entries.length - 1].seq : sinceSeq
        };
        return {
            documents: entries.map(entry => entry.doc),
            checkpoint
        };
    }

    /**
     * Writes the rows and returns the conflicts.
     * A row is in conflict when the state the client assumes to be on the server
     * is not the state that is really stored on the server.
     * For conflicting rows nothing is written. Instead the real server state is
     * returned so that the client can run its conflict handler and push again.
     *
     * This function is synchronous on purpose: Node.js runs it without
     * interruption, so no other request can modify a document between
     * the conflict check and the write.
     * With a real database you have to run this inside of a transaction.
     */
    function handlePush(rows: PushRow[]): WithDeleted<TodoDocType>[] {
        const conflicts: WithDeleted<TodoDocType>[] = [];
        const written: WithDeleted<TodoDocType>[] = [];
        for (const row of rows) {
            const newDoc = row.newDocumentState;
            const current = docsById.get(newDoc.id);
            const isConflict = current
                ? !row.assumedMasterState || !deepEqual(current.doc, row.assumedMasterState)
                : false;
            if (isConflict) {
                conflicts.push((current as StoredTodo).doc);
                continue;
            }
            lastSeq = lastSeq + 1;
            docsById.set(newDoc.id, { seq: lastSeq, doc: newDoc });
            written.push(newDoc);
        }
        if (written.length > 0) {
            persist();
            emitToPullStream({
                documents: written,
                checkpoint: { seq: lastSeq }
            });
        }
        return conflicts;
    }

    function handlePullStream(req: http.IncomingMessage, res: http.ServerResponse) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        // tells the EventSource to reconnect after 2 seconds when the connection drops
        res.write('retry: 2000\n\n');
        sseClients.add(res);
        // comment lines keep proxies from closing an idle connection
        const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), SSE_HEARTBEAT_MS);
        req.on('close', () => {
            clearInterval(heartbeat);
            sseClients.delete(res);
        });
    }

    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        if (req.method === 'OPTIONS') {
            res.writeHead(204).end();
            return;
        }

        const url = new URL(req.url || '/', 'http://localhost');
        try {
            if (req.method === 'GET' && url.pathname === '/api/todos/pull') {
                sendJson(res, 200, handlePull(url));
            } else if (req.method === 'POST' && url.pathname === '/api/todos/push') {
                const rows = parsePushRows(await readBody(req));
                sendJson(res, 200, handlePush(rows));
            } else if (req.method === 'GET' && url.pathname === '/api/todos/pullStream') {
                handlePullStream(req, res);
            } else {
                sendJson(res, 404, { error: 'not found' });
            }
        } catch (err) {
            sendJson(res, 400, { error: (err as Error).message });
        }
    });

    await new Promise<void>(resolve => server.listen(options.port, resolve));
    const address = server.address() as { port: number; };

    return {
        url: 'http://localhost:' + address.port,
        async close() {
            for (const client of sseClients) {
                client.end();
            }
            sseClients.clear();
            await new Promise<void>(resolve => server.close(() => resolve()));
            await saveQueue;
        }
    };
}

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}

/**
 * The server must never trust the client input.
 * This checks the minimum that the push handler relies on.
 */
function parsePushRows(body: string): PushRow[] {
    const rows = JSON.parse(body);
    if (!Array.isArray(rows)) {
        throw new Error('push body must be an array');
    }
    for (const row of rows) {
        const doc = row && row.newDocumentState;
        if (
            !doc ||
            typeof doc.id !== 'string' ||
            typeof doc.title !== 'string' ||
            typeof doc.done !== 'boolean' ||
            typeof doc.updatedAt !== 'number' ||
            typeof doc._deleted !== 'boolean'
        ) {
            throw new Error('invalid push row');
        }
    }
    return rows;
}
