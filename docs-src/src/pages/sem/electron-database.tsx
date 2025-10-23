import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Electron</>,
            appName: 'Electron',
            iconUrl: '/files/icons/electron.svg',
            metaTitle: 'Local Electron Database'
        }
    });
}
