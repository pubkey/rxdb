import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Capacitor</>,
            appName: 'Capacitor',
            iconUrl: '/files/icons/capacitor.svg',
            metaTitle: 'Capacitor Database',
            metaDescription: 'RxDB is a local database for Capacitor apps. Store data on the device with SQLite or IndexedDB, query it reactively and sync it to any backend.'
        }
    });
}
