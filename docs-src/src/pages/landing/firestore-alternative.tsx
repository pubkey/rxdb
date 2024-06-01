import Home from '..';

export default function Page() {
    return Home({
        title: <>The <b className="underline">Open Source</b> alternative for {' '}
            <b className="underline">Firestore</b></>,
        text: <>Store data inside the Browser to build high performance realtime applications that sync data from the backend and even work when offline.</>
    });
}
