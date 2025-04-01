import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Node.js',
            appName: 'Node.js',
            title: <>The easiest way to <b className="underline">store</b> and <b className="underline">sync</b> Data in Node.js</>,
            text: <>Fast in-app database for Node.js. Build high performance realtime applications that sync data from the anywhere and even work when offline.</>
        }
    });
}
