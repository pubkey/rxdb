import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'indexeddb-database',
            metaTitle: 'The best Database on top of IndexedDB',
            title: <>The best <b className="underline">Database</b> on top of{' '}
                <b className="underline">IndexedDB</b></>,
            appName: 'Browser',
            text: <>Store data inside the Browsers IndexedDB to build high performance realtime applications that sync data from the backend and even work when offline.</>

        }
    });
}
