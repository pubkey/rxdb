import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'nedb-alternative',
            metaTitle: 'The modern alternative for NeDB',
            title: <>The <b className="underline">modern</b> alternative for{' '}
                <b className="underline">NeDB</b></>,
            appName: 'Browser',
        }
    });
}
