import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Capacitor</b> Apps</>,
            appName: 'Capacitor',
            iconUrl: '/files/icons/capacitor.svg',
            metaTitle: 'Capacitor Database'
        }
    });
}
