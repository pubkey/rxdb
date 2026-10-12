import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Browsers',
            metaDescription: 'RxDB is a local NoSQL database that runs in the browser on IndexedDB or OPFS. Reactive queries, offline support and sync to any backend.',
            appName: 'Browser',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in a Browser</>,
        }
    });
}
