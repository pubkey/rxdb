import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Angular Apps',
            metaDescription: 'RxDB is a local NoSQL database for Angular apps. Reactive queries update your components, data stays available offline and syncs to any backend.',
            appName: 'Angular',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Angular</>,
            iconUrl: '/files/icons/angular.svg'
        }
    });
}
