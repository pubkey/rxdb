import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for React Native',
            appName: 'React Native',
            title: <>The easiest way to <b >store</b> and <b >sync</b> Data in React Native</>,
            iconUrl: '/files/icons/react.svg'
        }
    });
}
