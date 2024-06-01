import Home from '..';

export default function Page() {
    return Home({
        metaTitle: 'The Open Source alternative for Firestore',
        title: <>The <b className="underline">Open Source</b> alternative for {' '}
            <b className="underline">Firestore</b></>,
        text: <>Store data inside the Browser to build high performance realtime applications that sync data from the backend and even work when offline.</>
    });
}
