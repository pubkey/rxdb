import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for React Native',
            metaDescription: 'RxDB is a local database for React Native. Store data on the device with SQLite, query it reactively, work offline and sync to any backend.',
            appName: 'React Native',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in React Native</>,
            iconUrl: '/files/icons/react.svg'
        }
    });
}
