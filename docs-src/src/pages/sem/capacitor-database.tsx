import Home from '..';

export default function Page() {
    return Home({
        sem: {
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Capacitor</b> Apps</>,
            text: <>Store data inside your Capacitor Hybrid App to build high performance realtime applications that sync data with the backend and even work when offline.</>,
            iconUrl: '/files/icons/capacitor.svg',
            metaTitle: 'Capacitor Database'
        }
    });
}
