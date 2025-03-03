import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Svelte Apps',
            appName: 'Svelte',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Svelte</b> Apps</>,
            iconUrl: '/files/icons/svelte.svg'
        }
    });
}
