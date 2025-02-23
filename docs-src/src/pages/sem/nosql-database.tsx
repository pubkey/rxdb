import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'nosql-database',
            metaTitle: 'The NoSQL Database for JavaScript Applications',
            title: <>The NoSQL <b className="underline">Database</b> for{' '}
                <b className="underline">JavaScript</b> Applications</>,
            text: <>Store NoSQL data inside your App to build high performance realtime applications that sync data with the backend and even work when offline.</>
        }
    });
}
