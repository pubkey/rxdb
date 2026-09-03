import { createRoot } from 'react-dom/client';
import { App } from './app.tsx';
import { DbViewerClient } from './client.ts';
import { ViewerStore } from './store.ts';

/**
 * Entry point of the page that is published at
 * https://rxdb.info/html/db-viewer.html and loaded into an iframe by
 * `rxdb/plugins/db-viewer`.
 */
const store = new ViewerStore();
const client = new DbViewerClient();

client.on('counts', counts => store.applyCounts(counts));
client.on('connection', connection => {
    store.connection = connection;
    store.emit();
});
client.on('navigate', navigation => store.navigate(navigation));
client.on('live', event => store.recordLive(event));
client.on('change', record => {
    store.recordChange(record);
});
client.on('replication', record => {
    store.recordReplication(record);
});
client.on('refresh', () => {
    void loadSnapshot();
});

async function loadSnapshot(): Promise<void> {
    try {
        store.applySnapshot(await client.call('snapshot', {}));
    } catch (error) {
        store.error = (error as Error).message;
        store.emit();
    }
}

/**
 * The live counters move constantly, but redrawing on every single event
 * would spend the whole frame budget on a map that is read at a glance.
 */
setInterval(() => store.emit(), 400);

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<App store={store} client={client} />);
}

client.hello();
void client.whenReady().then(loadSnapshot);
