import Home from '..';

export default function Page() {
    return Home({
        sem: {
            id: 'reddit',
            metaTitle: 'The local Database for JavaScript Apps',
            metaDescription: 'RxDB is a local NoSQL database for JavaScript apps. Queries run on the device, the app works offline and data syncs to any backend.',
            title: <>The Local-First <b>Database</b> for <b>JavaScript</b> Apps</>
        }
    });
}
