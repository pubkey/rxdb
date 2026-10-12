import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Expo',
            metaDescription: 'RxDB is a local database for Expo apps. Store data on the device, query it reactively, work offline and sync to the backend you choose.',
            appName: 'Expo',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Expo</>,
            iconUrl: '/files/icons/expo_white.svg'
        }
    });
}
