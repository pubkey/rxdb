import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Ionic Apps',
            appName: 'Ionic',
            title: <>The easiest way to <b className="underline">store</b> and <b className="underline">sync</b> Data in Ionic</>,
            iconUrl: '/files/icons/ionic.svg'
        }
    });
}
