import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'reddit',
            metaTitle: 'The local Database for Angular Apps',
            appName: 'Angular',
            title: <>The local <b className="underline">Database</b> for{' '}
                <b className="underline">JavaScript</b> Applications</>
        }
    });
}
