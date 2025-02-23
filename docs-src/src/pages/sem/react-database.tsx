import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'react-database',
            metaTitle: 'The local Database for React Apps',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">React</b> Apps</>,
            appName: 'React',
            iconUrl: '/files/icons/react.svg'
        }
    });
}
