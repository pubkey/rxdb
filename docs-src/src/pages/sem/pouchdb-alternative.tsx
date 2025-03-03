import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The NoSQL alternative for PouchDB',
            title: <>The <b className="underline">modern</b> alternative for{' '}
                <b className="underline">PouchDB</b></>,
            text: <>Store data inside the Browser to build high performance realtime applications that sync data from the backend and even work when offline.</>
        }
    });
}
