import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Angular Apps',
            appName: 'Angular',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Angular</>,
            iconUrl: '/files/icons/angular.svg'
        }
    });
}
