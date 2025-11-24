import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Svelte Apps',
            appName: 'Svelte',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in Svelte</>,
            iconUrl: '/files/icons/svelte.svg'
        }
    });
}
