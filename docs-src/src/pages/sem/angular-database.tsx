import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Angular Apps',
            appName: 'Angular',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Angular</b> Apps</>,
            iconUrl: '/files/icons/angular.svg'
        }
    });
}
