import Home from '..';

export default function Page() {
    return Home({
        metaTitle: 'The NoSQL alternative for WatermelonDB',
        title: <>The <b className="underline">NoSQL</b> alternative for{' '}
            <b className="underline">WatermelonDB</b></>,
        text: <>Store data inside the Browser to build high performance realtime applications that sync data from the backend and even work when offline.</>
    });
}
