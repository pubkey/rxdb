import Home from '..';

export default function Page() {
    return Home({
        sem: {
            metaTitle: 'The local Database for Ionic Apps',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Ionic</b> Apps</>,
            text: <>Store data inside of your Ionic app to build high performance realtime applications that sync data from the backend and even work when offline.</>,
            iconUrl: '/files/icons/ionic.svg'
        }
    });
}
