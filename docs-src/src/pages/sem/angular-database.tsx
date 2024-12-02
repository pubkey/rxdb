import Home from '..';

export default function Page() {
    return Home({
        sem: {
            metaTitle: 'The local Database for Angular Apps',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Angular</b> Apps</>,
            text: <>Store data inside of your angular app to build high performance realtime applications that sync data from the backend and even work when offline.</>,
            iconUrl: '/files/icons/angular.svg'
        }
    });
}
