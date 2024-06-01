import Home from '..';

export default function Page() {
    return Home({
        metaTitle: 'The modern alternative for NeDB',
        title: <>The <b className="underline">modern</b> alternative for{' '}
            <b className="underline">NeDB</b></>,
        text: <>Store data inside the Browser to build high performance realtime applications that sync data from the backend and even work when offline.</>
    });
}
