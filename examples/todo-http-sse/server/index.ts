import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTodoServer } from './server.ts';

const port = parseInt(process.env.PORT || '3000', 10);
const dataFile = process.env.DATA_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), 'data.json');

const server = await startTodoServer({ port, dataFile });
console.log('RxDB todo sync server listening on ' + server.url);
console.log('Storing data in ' + dataFile);

async function shutdown() {
    await server.close();
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
