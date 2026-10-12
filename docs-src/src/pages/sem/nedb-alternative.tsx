import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The modern alternative for NeDB',
            metaDescription: 'RxDB is a modern alternative to NeDB for Node.js, Electron and the browser: schema validation, MongoDB-style queries, reactive results and sync.',
            title: <>The <b >modern</b> alternative for{' '}
                <b >NeDB</b></>,
            appName: 'Browser',
        }
    });
}
