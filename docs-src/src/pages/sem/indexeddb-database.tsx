import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The best Database on top of IndexedDB',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in IndexedDB</>,
            appName: 'Browser',
            text: <>Store data inside the Browsers IndexedDB to build high performance realtime applications that sync data from the backend and even work when offline.</>

        }
    });
}
