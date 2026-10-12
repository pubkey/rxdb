import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Svelte Apps',
            metaDescription: 'RxDB is a local database for Svelte apps. Reactive queries update your components, data stays available offline and syncs to any backend.',
            appName: 'Svelte',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Svelte</>,
            iconUrl: '/files/icons/svelte.svg'
        }
    });
}
