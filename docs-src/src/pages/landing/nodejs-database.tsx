import Home from '..';

export default function Page() {
    return Home({
        title: <>The local <b className="underline">Database</b> for{' '}
            <b className="underline">Node.js</b></>,
        text: <>Fast in-app database for Node.js. Build high performance realtime applications that sync data from the anywhere and even work when offline.</>
    });
}
