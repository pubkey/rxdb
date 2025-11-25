import { MutableRefObject } from 'react';
import { SemPage, getAppName } from '../pages';

export function RuntimesSection(props: {
    dark: boolean;
    sem?: SemPage;
    order?: number;
    runtimesRef: MutableRefObject<HTMLDivElement>;
}) {
    return <div className={'block frameworks ' + (props.dark ? 'dark' : '')} id="runtimes" ref={props.runtimesRef} style={{ order: props.order }}>
        <div className="content">
            <a
                href="https://github.com/pubkey/rxdb/tree/master/examples/angular"
                target="_blank"
            >
                <div
                    className="neumorphism-circle-m circle centered enlarge-on-mouse"
                    style={{ top: '-10%', left: '10%' }}
                >
                    <img loading="lazy" src="/files/icons/angular.svg" alt="angular database" />
                    Angular
                </div>
            </a>
            <a
                href="https://rxdb.info/capacitor-database.html#rxdb"
                target="_blank"
            >
                <div
                    className="neumorphism-circle-m circle centered enlarge-on-mouse"
                    style={{ top: '10%', left: '58%' }}
                >
                    <img loading="lazy" src="/files/icons/capacitor.svg" alt="capacitor database" />
                    Capacitor
                </div>
            </a>
            <a
                href="https://rxdb.info/rx-storage-denokv.html"
                target="_blank"
            >
                <div
                    className="neumorphism-circle-s circle centered enlarge-on-mouse"
                    style={{ top: '-4%', left: '44%' }}
                >
                    <img loading="lazy" src="/files/icons/deno.svg" alt="deno database" />
                    Deno
                </div>
            </a>
            <a
                href="https://github.com/pubkey/rxdb/tree/master/examples/node"
                target="_blank"
            >
                <div
                    className="neumorphism-circle-m circle centered enlarge-on-mouse"
                    style={{ top: '-5%', left: '85%' }}
                >
                    <img loading="lazy" src="/files/icons/nodejs.svg" alt="Node.js database" />
                    Node.js
                </div>
            </a>
            <a
                href="https://github.com/pubkey/rxdb/tree/master/examples/react"
                target="_blank"
            >
                <div
                    className="neumorphism-circle-m circle centered enlarge-on-mouse"
                    style={{ top: '4%', left: '26%' }}
                >
                    <img loading="lazy" src="/files/icons/react.svg" alt="React database" />
                    React
                </div>
            </a>
            <a
                href="https://github.com/pubkey/rxdb/tree/master/examples/svelte"
                target="_blank"
            >
                <div
                    className="neumorphism-circle-s circle centered enlarge-on-mouse"
                    style={{ top: '15%', left: '90%', marginLeft: '-35px' }}
                >
                    <img loading="lazy" src="/files/icons/svelte.svg" alt="Svelte database" />
                    Svelte
                </div>
            </a>
            <br />
            <br />
            <br />
            <br />
            <br />
            <h2>
                Runs in <b className="underline">Any JavaScript Runtime</b>
            </h2>


            <p>
                RxDB's modular storage architecture adapts to any JavaScript runtime — <a href="/rx-storage-indexeddb.html" target="_blank">Browsers</a>
                , <a
                    href="/rx-storage-sqlite.html"
                    target="_blank"
                >React Native</a>, <a href="/rx-storage-filesystem-node.html" target="_blank">Node.js</a>, <a
                    href="/electron.html"
                    target="_blank"
                >Electron</a>, and beyond.
                Simply switch the storage plugin to reuse the same database and replication logic across all your {getAppName(props)} apps, saving time and ensuring consistency.
            </p>
            <div className="below-text">
                <a
                    href="/electron-database.html#rxdb"
                    target="_blank"
                >
                    <div
                        className="neumorphism-circle-s circle centered enlarge-on-mouse"
                        style={{ top: '2%', left: '18%' }}
                    >
                        <img loading="lazy" src="/files/icons/electron.svg" alt="electron database" />
                        Electron
                    </div>
                </a>
                <a
                    href="/articles/vue-database.html"
                    target="_blank"
                >
                    <div
                        className="neumorphism-circle-s circle centered enlarge-on-mouse"
                        style={{ top: '3%', left: '45%' }}
                    >
                        <img loading="lazy" src="/files/icons/vuejs.svg" alt="Vue.js database" />
                        Vue.js
                    </div>
                </a>
                <a
                    href="/articles/ionic-storage.html"
                    target="_blank"
                >
                    <div
                        className="neumorphism-circle-s circle centered enlarge-on-mouse"
                        style={{ top: '2%', left: '71%' }}
                    >
                        <img loading="lazy" src="/files/icons/ionic.svg" alt="ionic database" />
                        Ionic
                    </div>
                </a>
                <a
                    href="https://github.com/herefishyfish/rxdb-nativescript"
                    target="_blank"
                >
                    <div
                        className="neumorphism-circle-m circle centered enlarge-on-mouse"
                        style={{ top: '46%', left: '11%' }}
                    >
                        <img loading="lazy" src="/files/icons/nativescript.svg" alt="NativeScript database" />
                        NativeScript
                    </div>
                </a>
                <a
                    href="/react-native-database.html#rxdb"
                    target="_blank"
                >
                    <div
                        className="neumorphism-circle-m circle centered enlarge-on-mouse"
                        style={{ top: '45%', left: '35%' }}
                    >
                        <img loading="lazy" src="/files/icons/react.svg" alt="React Native database" />
                        React Native
                    </div>
                </a>
                <div
                    className="neumorphism-circle-m circle centered enlarge-on-mouse"
                    style={{ top: '45%', left: '62%' }}
                >
                    <img loading="lazy" src="/files/icons/nextjs.svg" alt="Next.js database" />
                    Next.js
                </div>
                <a
                    href="https://github.com/pubkey/rxdb/tree/master/examples/flutter"
                    target="_blank"
                >
                    <div
                        className="neumorphism-circle-s circle centered enlarge-on-mouse"
                        style={{ top: '40%', left: '86%' }}
                    >
                        <img loading="lazy" src="/files/icons/flutter.svg" alt="Flutter database" />
                        Flutter
                    </div>
                </a>
            </div>
        </div>
    </div>;
}
