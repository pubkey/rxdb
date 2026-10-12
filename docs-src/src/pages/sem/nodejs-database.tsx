import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Node.js',
            metaDescription: 'RxDB is a local NoSQL database for Node.js. Store data on disk, query it with MongoDB-style queries and replicate it to any backend.',
            appName: 'Node.js',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Node.js</>,
            text: <>Fast in-app database for Node.js. Build high performance realtime applications that sync data from the anywhere and even work when offline.</>
        }
    });
}
