import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Expo',
            appName: 'Expo',
            title: <>The easiest way to <b className="underline">store</b> and <b className="underline">sync</b> Data in Expo</>,
            iconUrl: '/files/icons/expo_white.svg'
        }
    });
}
