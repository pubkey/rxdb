import Home from '..';


/**
 * Generic landingpage for all google-ads
 * which do not have another specific landingpage.
 */
export default function Page() {
    return Home({
        sem: {
            id: 'gads',
            metaTitle: 'The local Database for Apps',
            title: <>The easiest way to <b>store</b> and <b>sync</b> Data inside of your App</>,
        }
    });
}
