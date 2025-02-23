import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'react-native-database',
            metaTitle: 'The local Database for React Native',
            appName: 'React Native',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">React Native</b></>,
            iconUrl: '/files/icons/react.svg'
        }
    });
}
