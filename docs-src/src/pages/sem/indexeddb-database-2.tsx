import { SOCIAL_PROOF_VALUES, Trophy } from '@site/src/components/trophy';
import Home from '..';
import { triggerTrackingEvent } from '@site/src/components/trigger-event';


const styles = {
    table: {
        borderCollapse: 'collapse'
    }
} as any;

export default function Page() {
    return Home({
        sem: {
            id: 'indexeddb-database-2',
            /**
             * @link https://chatgpt.com/c/67950d3a-2558-8005-9c08-27999c51318e
             * @link https://chatgpt.com/c/6794f6c2-052c-8005-9a18-4a049bf97cc1
             */
            metaTitle: 'The best Database on top of IndexedDB',
            // title: <>The best <b className="underline">Database</b> on top of{' '}
            //     <b className="underline">IndexedDB</b></>,
            title: <>
                RxDB: Blazing-Fast <b className="underline">Browser Storage</b>
            </>,
            appName: 'Browser',
            // text: <>Store data inside the Browsers IndexedDB to build high performance realtime applications that sync data from the backend and even work when offline.</>,
            text: <>Upgrade from traditional IndexedDB. RxDB uses advanced optimizations, queries, and real-time updates for a lightning-fast, reliable data layer.</>,
            blocks: [
                <>
                    <Trophy
                        href="/code/"
                        title="GitHub"
                        subTitle='Open Source on'
                        value={SOCIAL_PROOF_VALUES.github}
                        imgUrl="/files/icons/github-star-with-logo.svg"
                        valueTitle='stars'
                    />

                    <div className="block">
                        <div className='content centered'>
                            <h2>Why <b className="underline">RxDB is Superior</b> to IndexedDB</h2>

                            <br />
                            <br />
                            <br />
                            <table border={0} cellPadding="8" style={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        <th>IndexedDB</th>
                                        <th>RxDB</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Performance</strong></td>
                                        <td>Tends to be slow and requires manual optimizations.</td>
                                        <td>Utilizes <a href="/slow-indexeddb.html" target="_blank">performance hacks</a> and caching for up to 10x faster speed.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Async/Await</strong></td>
                                        <td>Outdated callback-based API, painful to use.</td>
                                        <td>Embraces async/await with full promise support for cleaner code.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Complex Queries</strong></td>
                                        <td>Only iterates on indexes, limiting query power.</td>
                                        <td>Supports advanced filtering and <a href="/rx-query.html" target="_blank">complex queries</a> like a modern database.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Observable State</strong></td>
                                        <td>Lacks built-in reactivity; must implement manually.</td>
                                        <td>Built-in observables for real-time documents and query results.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Cross-Tab Events</strong></td>
                                        <td>No direct cross-tab sync or event notifications.</td>
                                        <td>Automatic cross-tab events keep data consistent across tabs.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>TypeScript Support</strong></td>
                                        <td>Requires custom types without fixed definitions for documents.</td>
                                        <td>Offers <a href="/tutorials/typescript.html" target="_blank">official TypeScript</a> definitions for strongly typed development.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Encryption Support</strong></td>
                                        <td>Must be implemented manually; no native solution.</td>
                                        <td>Provides built-in <a href="/encryption.html" target="_blank">encryption plugins</a> for data security.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Compression Support</strong></td>
                                        <td>No native compression features available.</td>
                                        <td>Plugin-based <a href="/key-compression.html" target="_blank">compression</a> to reduce storage usage and boost performance.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Data Sync</strong></td>
                                        <td>Needs manual sync logic for external databases.</td>
                                        <td>Supports <a href="/replication.html" target="_blank">real-time replication</a> with all kinds of backends (e.g., CouchDB, REST, GraphQL, HTTP) to enable distributed apps with minimal effort.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Integration with Frameworks</strong></td>
                                        <td>Limited official support; mostly custom solutions.</td>
                                        <td>Seamlessly integrates with React, Angular, Vue, and more.</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Cross Runtimes</strong></td>
                                        <td>Restricted to browser environments</td>
                                        <td>Use the <a href="/rx-storage.html" target="_blank">same database</a> code for browsers, hybrid apps, native apps, and servers.</td>
                                    </tr>
                                </tbody>
                            </table>

                            <br />
                            <br />

                            <a
                                href="/quickstart.html"
                                rel="noopener"
                                target="_blank"
                                onClick={() => triggerTrackingEvent('start_now_main_bottom', 0.40, false)}
                            >
                                <div
                                    className="button get-premium"
                                >
                                    Get Started For Free ➤
                                </div>
                            </a>

                        </div>

                    </div>
                </>
            ]
        },
    });
}


/**
- Performance is slow on IndexedDB while RxDB uses many performance hack to achieve up to 10x speed
- async/await with Promises instead of callbacks
- RxDB supports Complex queries while IndexedDB can only iterate on indexes
- Observable state, documents and query results
- Cross-Tab Events
- TypeScript Support
- Encryption Support
- Compression Support
- Data sync
- Integration with Frameworks
- RxDB supports other runtimes with different storages so you can use the same database code for your browser app but also for hybrid or native apps or on the server.
*/
