import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'electron-database',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Electron</b> Applications</>,
            appName: 'Electron',
            iconUrl: '/files/icons/electron.svg',
            metaTitle: 'Local Electron Database'
        }
    });
}
