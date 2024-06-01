import Home from '..';

export default function Page() {
    return Home({
        title: <>The local <b className="underline">Database</b> for{' '}
            <b className="underline">Browsers</b></>,
        text: <>Store data inside the Browser to build high performance realtime applications that sync data from the backend and even work when offline.</>
    });
}
