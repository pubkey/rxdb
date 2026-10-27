import CodeBlock from '../theme/CodeBlock';

/**
 * Explains what a local database is, with a short reactive query example.
 * Shown right below the hero on the local-first SEM landingpages.
 */
export function LocalDatabaseSection() {
    return (
        <div className="block">
            <div className="content">
                <h2>
                    What is a <b>Local Database</b>
                </h2>
                <p className='font-16-14'>
                    A local database stores its data on the user's device instead of a remote server. Reads and writes do not wait for the network, so queries return in milliseconds and the app keeps working offline.
                    {' '}<a href="/rx-database.html">RxDB</a> is a local database for JavaScript: it stores JSON documents in <a href="/rx-storage-indexeddb.html">IndexedDB</a>, <a href="/rx-storage-opfs.html">OPFS</a> or <a href="/rx-storage-sqlite.html">SQLite</a> and <a href="/replication.html">replicates</a> them to your backend when the device is online.
                </p>
                <p className='font-16-14'>
                    Every query is observable. When a local write or a replicated change touches the result, the query emits again and your UI updates.
                </p>
                <CodeBlock>{`const openTodos$ = myDatabase.todos.find({
  selector: { done: false },
  sort: [{ priority: 'desc' }]
}).$;

openTodos$.subscribe(todos => {
  // runs on every change, also when the device is offline
  console.log('open todos:', todos.length);
});`}</CodeBlock>
                <p className='font-16-14'>
                    Start with the <a href="/quickstart.html">quickstart</a> or read how <a href="/offline-first.html">offline-first</a> apps work.
                </p>
            </div>
        </div>
    );
}
