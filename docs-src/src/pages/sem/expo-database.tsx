import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Expo',
            appName: 'Expo',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Expo</b> Apps</>,
            iconUrl: '/files/icons/expo_white.svg'
        }
    });
}
