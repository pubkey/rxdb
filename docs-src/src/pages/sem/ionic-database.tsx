import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Ionic Apps',
            appName: 'Ionic',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Ionic</b> Apps</>,
            iconUrl: '/files/icons/ionic.svg'
        }
    });
}
