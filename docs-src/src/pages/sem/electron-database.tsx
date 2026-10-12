import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Electron</>,
            appName: 'Electron',
            iconUrl: '/files/icons/electron.svg',
            metaTitle: 'Local Electron Database',
            metaDescription: 'RxDB is a local database for Electron apps. Share data between main and renderer processes, query it reactively and sync it to any backend.'
        }
    });
}
