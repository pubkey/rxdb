import Home from '..';

export default function Page() {
    return Home({
        title: <>The local <b className="underline">Database</b> for{' '}
            <b className="underline">Electron</b> Applications</>,
        text: <>Store data inside your Electron.js Desktop App to build high performance realtime applications that sync data with the backend and even work when offline.</>
    });
}
