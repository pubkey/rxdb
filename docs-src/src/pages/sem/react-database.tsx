import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for React Apps',
            metaDescription: 'RxDB is a local database for React apps. Reactive queries re-render your components when data changes, work offline and sync to any backend.',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in React</>,
            appName: 'React',
            iconUrl: '/files/icons/react.svg'
        }
    });
}
