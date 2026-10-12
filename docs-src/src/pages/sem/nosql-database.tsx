import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The NoSQL Database for JavaScript Applications',
            metaDescription: 'RxDB is a NoSQL database for JavaScript applications. JSON documents, MongoDB-style queries, reactive updates, offline support and sync.',
            title: <>The easiest way to <b >store</b> and <b >sync</b> NoSQL Data</>,
            text: <>Store NoSQL data inside your App to build high performance realtime applications that sync data with the backend and even work when offline.</>
        }
    });
}
