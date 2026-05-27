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
            title: <>The Local-First <b>Database</b> for <b>JavaScript</b> Apps</>
            // title: <>The easiest way to <b>store</b> and <b>sync</b> Data inside of your App</>,
        }
    });
}
