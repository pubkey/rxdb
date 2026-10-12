import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Ionic Apps',
            metaDescription: 'RxDB is a local database for Ionic apps. Store data on the device, query it reactively, keep working offline and sync to any backend.',
            appName: 'Ionic',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Ionic</>,
            iconUrl: '/files/icons/ionic.svg'
        }
    });
}
