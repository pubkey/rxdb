import Home from '..';
import { ab } from '../../components/a-b-tests';

export default function Page() {
    return Home({
        sem: {
            /**
             * A unique id is required for per-page A/B testing and tracking.
             * Pages that share an id share the same variant bucket.
             */
            id: 'react-database',
            appName: 'React',
            iconUrl: '/files/icons/react.svg',
            metaTitle: ab(
                'The local Database for React Apps',
                'React Local-First Database'
            ),
            metaDescription: 'Store and sync data inside of your React app to build high performance realtime applications that work offline.',
            title: ab(
                <>The easiest way to <b>store</b> and <b>sync</b> Data in React</>,
                <>The Local-First <b>Database</b> for <b>React</b> Apps</>
            )
        }
    });
}
