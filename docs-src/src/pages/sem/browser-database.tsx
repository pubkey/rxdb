import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Browsers',
            appName: 'Browser',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">Browsers</b></>,
        }
    });
}
