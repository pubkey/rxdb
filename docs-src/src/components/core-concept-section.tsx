import { SemPage } from '../pages';
import CodeBlock from '../theme/CodeBlock';
import { Tabs } from './tabs';

const items = [
    {
        key: 'schema-language',
        label: 'Schema',
        children: (
            <>
                <p>
                    RxDB uses <a target="_blank" href="/rx-schema.html">JSON Schema</a>, a format widely recognized by developers through tools like OpenAPI or Swagger. Because JSON Schema is so well-established, it integrates seamlessly with existing validators, editors, and development tooling, making schema design both simple and highly flexible.
                </p>
                <p>
                    A minimal RxDB schema might define fields, data types, and indexes in a fully declarative way. For example:
                </p>
                <CodeBlock
                    language='js'
                >{
                        `const heroSchema = {
  title: 'hero schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
        type: 'string',
        maxLength: 100
    },
    name: {
        type: 'string'
    },
    power: {
        type: 'string'
    },
    age: {
        type: 'number'
    }
  },
  required: ['id', 'name']
};`}</CodeBlock>
            </>
        ),
    },
    {
        key: 'storages',
        label: 'Storages',
        children: <>
            <p>RxDB provides custom <a target="_blank" href="/rx-storage.html">storage plugins</a> optimized for each JavaScript runtime environment. Instead of relying on generic WebAssembly-SQLite solutions, which introduces slow startup times and heavy bundle sizes, RxDB offers purpose-built storage engines that are lightweight, fast, and tuned for their specific platform.</p>
            <p>For example, RxDB includes a fully indexed query engine running directly on <a target="_blank" href="/rx-storage-opfs.html">OPFS</a>, enabling high-performance persistence inside modern browsers. On mobile applications, it can use the native SQLite libraries shipped with Android and iOS, achieving maximum speed and stability.</p>
            <p>Beyond these, RxDB supports many storage options such as <a target="_blank" href="/rx-storage-indexeddb.html">IndexedDB</a> for web apps, Memory for testing, and even storages like <a target="_blank" href="/rx-storage-foundationdb.html">FoundationDB</a> for heavy cloud deployments. Allowing developers to choose the engine that best matches their performance and deployment needs.</p>

        </>
    },
    {
        key: 'queries',
        label: 'Queries',
        children: <>
            <p>RxDB uses the familiar <a target="_blank" href="/rx-query.html">Mango query syntax</a>, a standard in NoSQL systems like MongoDB and CouchDB. This makes querying intuitive for developers with NoSQL experience and provides a flexible way to filter, sort, and paginate documents.</p>
            <p>A simple RxDB query might look like this:</p>
            <CodeBlock>{`const result = await myCollection.find({
  selector: {
    name: { $regex: '^A' },
    age: { $gt: 21 }
  },
  sort: [{ age: 'asc' }],
  limit: 10,
  skip: 5
}).exec();`}

            </CodeBlock>
        </>
    },
    {
        key: 'reactivity',
        label: 'Reactivity',
        children: <>
            <p>In RxDB, all data, events, and queries are reactive, enabling real-time responsive applications. Every query result can emit new values automatically as underlying documents change, creating a seamless bridge between data and UI.</p>
            <p>RxDB supports RxJS Observables as well as <a target="_blank" href="/reactivity.html">signals</a> from modern frameworks such as Angular, React, Vue, Solid, and others. Changes propagate across browser tabs or windows, ensuring consistent application state even in multi-context environments.</p>
            <p>Here is an example of observing a query using RxJS:</p>
            <CodeBlock>{`myCollection.find().$.subscribe(result => {
  console.log('updated heroes:', result);
});`}</CodeBlock>
            <p>And the same query consumed as an Angular signal:</p>
            <CodeBlock>{'const mySignal = myCollection.find().$$;'}</CodeBlock>
        </>,
    },
    {
        key: 'type-safety', label: 'TypeScript', children: <>
            <p>RxDB offers full <a target="_blank" href="/tutorials/typescript.html">TypeScript support</a>, giving developers strong typing across schemas, documents, collections, and queries. Types are derived automatically from the schema, eliminating the need for any separate build steps or code generation.</p>
            <p>This results in a natural, frictionless development workflow where your schema remains the single source of truth, and your IDE provides instant, precise type safety.</p>
        </>
    },
    {
        key: 'business', label: 'Business Model', children: <>
            <p>RxDB follows a proven, sustainable business model centered around its <a target="_blank" href="/premium/">Premium Packages</a> rather than relying on VC funding. This independence ensures long-term stability and removes the risk of the project collapsing when investment dries up.</p>
            <p>There is no cloud service and no vendor lock-in; developers remain free to sync RxDB with any backend of their choice. Unlike many open-source projects that disappear when maintainers can no longer work for free, RxDB has operated as a healthy business for nearly a decade and is built to continue far into the future.</p>
        </>
    },
];


export function CoreConceptSection(props: {
    dark: boolean;
    sem?: SemPage;
}) {
    return <div className={'block features trophy-before trophy-after' + (props.dark ? ' dark ' : '')}>
        <div className="content">
            <h2 style={{ textAlign: 'center' }}>
                <b>Core</b> Concepts
            </h2>
            <div style={{
                margin: '35px auto 0px',
                padding: 30,
            }}>
                <Tabs
                    dark={props.dark}
                    items={items}
                    defaultActiveKey="schema-language"
                />
            </div>
        </div>
    </div>
        ;
}
