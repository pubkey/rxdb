import Home from '..';

export default function Page() {
    return Home({
        sem: {
            metaTitle: 'The local Database for Svelte Apps',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Svelte</b> Apps</>,
            text: <>Store data inside of your Svelte app to build high performance realtime applications that sync data from the backend and even work when offline.</>,
            iconUrl: '/files/icons/svelte.svg'
        }
    });
}
