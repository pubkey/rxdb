import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The NoSQL alternative for WatermelonDB',
            metaDescription: 'RxDB is a NoSQL alternative to WatermelonDB for React Native and the web, with ready-made replication to HTTP, GraphQL, CouchDB and more.',
            title: <>The <b >NoSQL</b> alternative for{' '}
                <b >WatermelonDB</b></>
        }
    });
}
