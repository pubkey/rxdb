import Home from '..';


/**
 * Generic landingpage for all youtube ads
 * which do not have another specific landingpage.
 */
export default function Page() {
    return Home({
        sem: {
            id: 'ytube',
            metaTitle: 'The local Database for Apps',
            metaDescription: 'RxDB is a local-first NoSQL database for JavaScript apps. Queries run on the device, the app works offline and data syncs to any backend.',
            title: <>The Local-First <b>Database</b> for <b>JavaScript</b> Apps</>
            // title: <>The easiest way to <b>store</b> and <b>sync</b> Data inside of your App</>,
        }
    });
}
