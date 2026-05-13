import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal } from '../components/modal';
import { Button } from '../components/button';




export default function Premium() {
    const { siteConfig } = useDocusaurusContext();
    const isBrowser = useIsBrowser();
    const [initDone, setInitDone] = React.useState<boolean>(false);

    useEffect(() => {
        if (!isBrowser) {
            return;
        }

        if (initDone) {
            return;
        }
        setInitDone(true);
        triggerTrackingEvent('open_pricing_page', 1);
    }, [isBrowser, initDone]);

    // for dialog
    const [openConsulting, setOpenConsulting] = React.useState(false);
    const handleOpenConsultingDialog = () => {
        triggerTrackingEvent('consulting_form_open', 0.4);
        setOpenConsulting(true);
    };
    const handleCloseConsulting = () => {
        setOpenConsulting(false);
    };


    return (
        <>
            <Head>
                <body className="homepage" />
                <link rel="canonical" href="/premium/" />
            </Head>

            <Layout
                title={`RxDB Pricing - ${siteConfig.title}`}
                description="RxDB plugins for professionals. FAQ, pricing and license"
            >
                <main>
                    <div className="block first">
                        <div className="content centered">

                            <h2>
                                RxDB <b>Pricing</b>
                            </h2>

                            <p style={{ width: '80%', textAlign: 'center' }}>
                                RxDB's payd plugins offer advanced features and performance improvements designed for businesses and professionals.
                                They are ideal for commercial or critical projects, providing <a href="/rx-storage-performance.html" target="_blank">better performance</a>, a smaller build size, flexible storage engines, secure encryption and other features.
                            </p>
                            {/* <p style={{ width: '80%' }}>
                                While most of RxDB is <b>open source</b>, RxDB's Premium plugins offer advanced features and performance improvements designed for businesses and professionals.
                                They are ideal for commercial or critical projects, providing <a href="/rx-storage-performance.html" target="_blank">better performance</a>, flexible storage engines,
                                {' '}<a href="https://rxdb.info/encryption.html" target="_blank">secure encryption</a> and other features.
                            </p>
                            <p style={{ width: '80%' }}>
                                By purchasing these plugins, you get powerful tools while supporting RxDB's long-term development.
                            </p> */}
                        </div>
                    </div>

                    <div className="block dark" id="pricing">
                        <div className="content centered">
                            <h2>Four tiers. <b>Annual licenses.</b></h2>
                            <p style={{ width: '80%', textAlign: 'center' }}>Free is the open-source core. Pro and Pro Plus add commercial plugins for production workloads. Enterprise adds the contract terms larger companies need.</p>
                            <div className="pricing-tiers">
                                {/* FREE TIER */}
                                <div className="pricing-tier">
                                    <div className="tier-top" style={{ minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                                        <h3>Free</h3>
                                        <p className="tier-desc">Open-source core. Everything you need to ship a side project or evaluate RxDB.</p>
                                        <span className="tier-price-prefix">&nbsp;</span>
                                        <div className="tier-price">€0<span>/ forever</span></div>
                                        <div className="tier-license">Open Source license</div>
                                    </div>

                                    <div className="tier-includes-title">INCLUDES</div>
                                    <ul className="tier-features">
                                        <li>RxDB core (schemas, queries, hooks)</li>
                                        <li>Replication & realtime sync</li>
                                        <li>Default RxStorage (Dexie, Memory, LokiJS)</li>
                                        <li>Schema validation & migration</li>
                                        <li>Community support on GitHub & Discord</li>
                                        <li className="strikethrough">Premium storages (OPFS, SQLite, Filesystem)</li>
                                        <li className="strikethrough">Performance plugins (Sharding, Memory Mapped)</li>
                                    </ul>

                                    <Button href="/quickstart.html" style={{ width: '100%', marginBottom: 15 }} icon={<span>&#8594;</span>}>Read the docs</Button>
                                    <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column' }}>
                                        <a href="https://github.com/pubkey/rxdb/blob/master/LICENSE.txt" className="tier-agreement" target="_blank">Apache 2.0 License</a>
                                        <span className="tier-note">// no signup, no key</span>
                                    </div>
                                </div>

                                {/* PRO TIER */}
                                <div className="pricing-tier pro-tier">
                                    <div className="tier-top" style={{ minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                                        <div className="badge-recommended">RECOMMENDED</div>
                                        <h3>Pro</h3>
                                        <p className="tier-desc">Production-grade storage engines for browser & native. The pragmatic upgrade.</p>
                                        <span className="tier-price-prefix">From</span>
                                        <div className="tier-price">€1,300<span>/ year</span></div>
                                        <div className="tier-license">annual, flat fee</div>
                                    </div>

                                    <div className="tier-includes-title">INCLUDES</div>
                                    <ul className="tier-features">
                                        <li>Everything in Free</li>
                                        <li>RxStorage OPFS - newest browser storage</li>
                                        <li>RxStorage IndexedDB - most reliable browser storage</li>
                                        <li>RxStorage SQLite - Electron, React-Native, Capacitor</li>
                                        <li>RxStorage Filesystem (Node + Expo)</li>
                                        <li>WebCrypto Encryption</li>
                                        <li>Fulltext Search</li>
                                    </ul>

                                    <Button primary href="https://buy.stripe.com/eVq00k3fx1TbaIV0c1bbG05" target="_blank" style={{ width: '100%', marginBottom: 15 }} icon={<span>&#8594;</span>}>Buy Pro</Button>
                                    <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column' }}>
                                        <a href="/license-preview/" className="tier-agreement" target="_blank">Preview License Agreement</a>
                                        <span className="tier-note">// most teams start here</span>
                                    </div>
                                </div>

                                {/* PRO PLUS TIER */}
                                <div className="pricing-tier">
                                    <div className="tier-top" style={{ minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                                        <h3>Pro Plus</h3>
                                        <p className="tier-desc">Squeeze more out of every device - performance plugins & server adapters.</p>
                                        <span className="tier-price-prefix">From</span>
                                        <div className="tier-price">€2,000<span>/ year</span></div>
                                        <div className="tier-license">annual, flat fee</div>
                                    </div>

                                    <div className="tier-includes-title">INCLUDES</div>
                                    <ul className="tier-features">
                                        <li>Everything in Pro</li>
                                        <li>RxStorage Worker - main-thread offload</li>
                                        <li>RxStorage Shared Worker</li>
                                        <li>RxStorage Sharding</li>
                                        <li>RxStorage Memory-Mapped</li>
                                        <li>Localstorage Meta Optimizer</li>
                                        <li>Query Optimizer</li>
                                        <li>RxServer adapters: Fastify, Koa</li>
                                        <li>Logger plugin (Compatible with Sentry)</li>
                                    </ul>

                                    <Button href="https://buy.stripe.com/3cIcN6aHZcxP6sF5wlbbG06" target="_blank" style={{ width: '100%', marginBottom: 15 }} icon={<span>&#8594;</span>}>Buy Pro Plus</Button>
                                    <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column' }}>
                                        <a href="/license-preview/" className="tier-agreement" target="_blank">Preview License Agreement</a>
                                        <span className="tier-note">// for high-throughput apps</span>
                                    </div>
                                </div>

                                {/* ENTERPRISE TIER */}
                                <div className="pricing-tier">
                                    <div className="tier-top" style={{ minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                                        <h3>Enterprise</h3>
                                        <p className="tier-desc">SLA, dedicated engineers, custom commercial terms.</p>
                                        <span className="tier-price-prefix">&nbsp;</span>
                                        <div className="tier-price">Custom</div>
                                        <div className="tier-license">talk to us</div>
                                    </div>

                                    <div className="tier-includes-title">INCLUDES</div>
                                    <ul className="tier-features">
                                        <li>Everything in Pro Plus</li>
                                        <li>Custom commercial license & MSA</li>
                                        <li>Named engineer</li>
                                        <li>Support SLA, 24-hour first response</li>
                                        <li>Architecture review & onboarding</li>
                                        <li>Priority bug fixes & feature requests</li>
                                        <li>Source Code Access</li>
                                        <li>Volume seats & multi-product licensing</li>
                                    </ul>

                                    <Button onClick={(e) => {
                                        e.preventDefault(); handleOpenConsultingDialog();
                                    }} style={{ width: '100%', marginBottom: 15 }} icon={<span>&#8594;</span>}>Request Quote</Button>
                                    <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column' }}>
                                        <span className="tier-agreement" style={{ visibility: 'hidden' }}>Preview License Agreement</span>
                                        <span className="tier-note">// custom agreements & SLA</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="block" id="faq">
                        <div className="content centered premium-faq">
                            <h2>
                                F.A.Q.
                            </h2>
                            {
                                /**
                                 * IMPORTANT: It is a bad practice to "justify" for the price. We sell a B2B
                                 * tool and of course it is more expensive than a consumer netflix abo.
                                 */
                            }
                            <details>
                                <summary>What is the process for making a purchase?</summary>
                                <ul>
                                    <li>Pay on Stripe by clicking one of the purchase buttons above.</li>
                                    <li>You will be sent a license agreement to sign online.</li>
                                    <li>Once signed, you will receive an access token to add the Premium plugins to your project following <a href="https://www.npmjs.com/package/rxdb-premium" target="_blank">these instructions</a>.</li>
                                </ul>
                            </details>

                            <details>
                                <summary>Do I need the Premium Plugins?</summary>
                                RxDB Core is open source and many use cases can be implemented with the Open Core part of
                                RxDB. There are many{' '}
                                <a href="/rx-storage.html" target="_blank">
                                    RxStorage
                                </a>{' '}
                                options and all core plugins that are required for replication, schema
                                validation, encryption and so on, are totally free. As soon as your
                                application is more than a side project you can consider using the premium plugins as an easy way
                                to improve your applications performance and reduce the build size.
                                <br />
                                The main benefit of the Premium Plugins is <b>performance</b>. The
                                Premium RxStorage implementations have a better performance so reading
                                and writing data is much faster especially on low-end devices. You can
                                find a performance comparison{' '}
                                <a href="/rx-storage-performance.html" target="_blank">
                                    here
                                </a>
                                . Also there are additional Premium Plugins that can be used to further
                                optimize the performance of your application like the{' '}
                                <a href="/query-optimizer.html" target="_blank">
                                    Query Optimizer
                                </a>{' '}
                                or the{' '}
                                <a href="/rx-storage-sharding.html" target="_blank">
                                    Sharding
                                </a>{' '}
                                plugin.
                            </details>
                            {/* <details>
                                <summary>Why is it not for free?</summary>
                                The development of RxDB started in 2016 and after all these years it
                                became clear that big implementation and improvement steps will not be
                                done by the RxDB community. While the community submits valuable pull
                                requests, they are mostly small improvements or bugfixes for specific
                                edge case. Big rewrites and optimizations that require a big effort have
                                only be done by the RxDB maintainer.
                                <br />
                                Selling RxDB Premium ensures that there will be always an incentive for
                                someone to add features, keep everything up to date and to further
                                improve and optimize the codebase. This gives the user the confidence
                                that RxDB is a <b>future proof</b> tech stack to build on which lets
                                RxDB stand out compared to similar technologies.
                            </details> */}
                            <details>
                                <summary>Can I get a free trial period?</summary>
                                <ul>
                                    <li>
                                        We do not currently offer a free trial. Instead, we encourage you to
                                        explore RxDB's open-source core to evaluate the technology before
                                        purchasing the Premium Plugins.
                                    </li>
                                    <li>
                                        Access to the Premium Plugins requires a signed licensing agreement,
                                        which safeguards both parties but also adds administrative overhead.
                                        For this reason, we cannot offer free trials or monthly subscriptions;
                                        Premium licenses are provided on an <b>annual basis</b>.
                                    </li>
                                </ul>
                            </details>
                            {/* <details>
                                <summary>Why is it not cheaper?</summary>
                                The price of the Premium Plugins is chosen in way that ensures that
                                there can be always one person that develops RxDB <b>full time</b>.
                                Compared to other JavaScript frameworks and developer tools, RxDB
                                satisfies an edge use case for people that want to store data inside of
                                their application on the users device. Most web developers do not need
                                to do that and rely on the traditional client-server stack. So RxDB
                                cannot be sold to that many people which increases the price.
                            </details> */}
                            <details>
                                <summary>Can I install/build the premium plugins in my CI?</summary>
                                Yes, you can safely install and use the Premium Plugins in your CI
                                without additional payment.
                            </details>
                            <details>
                                <summary>Which payment methods are accepted?</summary>
                                <b>Stripe.com</b> is used as payment processor so most known payment
                                options like credit card, PayPal, SEPA transfer and others are
                                available. A list of all options can be found{' '}
                                <a
                                    href="https://stripe.com/docs/payments/payment-methods/overview"
                                    title="stripe payment options"
                                    target="_blank"
                                >
                                    here
                                </a>
                                .
                            </details>
                            {/* <details>
                                <summary>Can I get a discount?</summary>
                                Discounts are provided for people that have made a significant
                                contribution to RxDB or one of RxDB's dependencies or to the Open Source
                                Community overall. Also for private personal projects there is the
                                option to solve one of the
                                {' '}<a
                                    href="https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md"
                                    target="_blank"
                                >
                                    Premium Tasks
                                </a>{' '}
                                to get 2 years access to the Premium Plugins.
                            </details> */}
                            <details>
                                <summary>
                                    Is there any tracking code inside of the premium plugins?
                                </summary>
                                No, the premium plugins themself do not contain any tracking code. When
                                you build your application with RxDB and deploy it to production, it
                                will not make requests from your users to any RxDB server.
                            </details>
                            <details>
                                <summary>
                                    Can I upgrade to a higher tier later?
                                </summary>
                                Yes! You can upgrade to a higher tier at any time.
                                When you decide to upgrade, we'll calculate a fair upgrade price,
                                meaning you only pay the difference between your existing tier and the new tier.
                                <br />
                                Your previous payments are fully credited towards the new license.
                            </details>
                            <details>
                                <summary>Can I get a discount?</summary>
                                We only offer discounts to developers who publicly speak about RxDB or are technical influencers.
                                If you give talks at conferences, create educational content for a large audience, or can otherwise help spread the word about RxDB, please reach out to discuss a potential discount.
                            </details>
                            <details>
                                <summary>Why do I have to pay taxes?</summary>
                                Taxation depends on your country and entity type. We recommend that you add a correct address and, importantly, your Tax ID when ordering on the Stripe page.
                            </details>
                        </div>
                    </div>

                    {/* <div className="block dark" id="premium-request-form-block">
                        <div className="content centered premium-request">
                            <h2>
                                Request Premium <b className="underline">Form</b>
                            </h2>
                            <p></p>
                            <BrowserOnly fallback={<span>Loading form iframe...</span>}>
                                {() => <iframe
                                    id="request-premium-form"
                                    src="https://webforms.pipedrive.com/f/c5cAfYVe373ccihUfJkyxdU2zg5Iz2liQB09nU6jOQCyRXOJy6W7qPdQdmomvugRj5"
                                >
                                    Your browser doesn't support iframes, <a
                                        href="https://webforms.pipedrive.com/f/c5cAfYVe373ccihUfJkyxdU2zg5Iz2liQB09nU6jOQCyRXOJy6W7qPdQdmomvugRj5"
                                        target="_blank"
                                        rel="nofollow">go here</a>
                                </iframe>
                                }
                            </BrowserOnly>
                        </div>
                    </div> */}
                    <div className="block dark">
                        <div className="content centered">
                            <h2>
                                RxDB Premium Plugins <b>Overview</b>
                            </h2>
                            {/* <p style={{ width: '80%' }}>
                                RxDB's premium plugins offer advanced features and optimizations that enhance application <b>performance</b>{' '}
                                and are backed by dedicated support and regular updates. Using the premium plugins is recommended for users
                                that use RxDB in a professional context.
                            </p> */}
                            <div className="premium-blocks">
                                <a href="/rx-storage-indexeddb.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage IndexedDB</h4>
                                            <p>
                                                A storage for browsers based on <b>IndexedDB</b>. It is the most reliable browser storage and has the smallest build size.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-opfs.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage OPFS</h4>
                                            <p>
                                                Currently the RxStorage with the best data throughput that can be used in the browser.
                                                Based on the <b>OPFS File System Access API</b>.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-sqlite.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage SQLite</h4>
                                            <p>
                                                A fast storage based on <b>SQLite</b> for Servers and Hybrid Apps. Can be used with{' '}
                                                <b>Node.js</b>, <b>Electron</b>, <b>React Native</b>, <b>Capacitor</b>.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-shared-worker.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage SharedWorker</h4>
                                            <p>
                                                A RxStorage wrapper to run the storage inside of a SharedWorker
                                                which improves the performance by taking CPU load away from the
                                                main process. Used in <b>browsers</b>.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-worker.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage Worker</h4>
                                            <p>
                                                A RxStorage wrapper to run the storage inside of a Worker which
                                                improves the performance by taking CPU load away from the main
                                                process.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-sharding.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage Sharding</h4>
                                            <p>
                                                A wrapper around any other storage that improves performance by
                                                applying the sharding technique.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-memory-mapped.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage Memory Mapped</h4>
                                            <p>
                                                A wrapper around any other storage that creates a mapped
                                                in-memory copy which improves performance for the initial page
                                                load time and write &amp; read operations.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/query-optimizer.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>Query Optimizer</h4>
                                            <p>
                                                A tool to find the best index for a given query. You can use
                                                this during build time to find the best index and then use that
                                                index during runtime.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-localstorage-meta-optimizer.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage Localstorage Meta Optimizer</h4>
                                            <p>
                                                A wrapper around any other storage which optimizes the initial
                                                page load one by using localstorage for meta key-value document.
                                                Only works in <b>browsers</b>.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/encryption.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>WebCrypto Encryption</h4>
                                            <p>
                                                A faster and more secure encryption plugin based on the Web
                                                Crypto API.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-filesystem-node.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage Filesystem Node</h4>
                                            <p>
                                                A fast RxStorage based on the <b>Node.js</b> Filesystem.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-filesystem-expo.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage Filesystem Expo</h4>
                                            <p>
                                                A high-performance RxStorage for <b>React Native</b> and <b>Expo</b> apps based on the Expo Filesystem.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/logger.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>Logger</h4>
                                            <p>A logging plugin useful to debug performance problems and for monitoring with Application Performance Monitoring (APM) tools like Bugsnag, Datadog, Elastic, Sentry and others</p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-server.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxServer Fastify Adapter</h4>
                                            <p>
                                                An adapter to use the RxServer with fastify instead of express. Used to have better performance when serving requests.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/logger.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>RxServer Koa Adapter</h4>
                                            <p>
                                                An adapter to use the RxServer with Koa instead of express. Used to have better performance when serving requests.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/fulltext-search.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>FlexSearch</h4>
                                            <p>
                                                A plugin to efficiently run local fulltext search indexing and queries.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                    <ConsultingFormDialog open={openConsulting} onClose={handleCloseConsulting} />
                </main>
            </Layout >
        </>
    );
}
// function getConverterUrl(price: number) {
//     return 'https://www.xe.com/en/currencyconverter/convert/?Amount=' + price + '&From=EUR&To=USD';
// }


function ConsultingFormDialog({ onClose, open }) {
    return <IframeFormModal
        onClose={onClose}
        open={open}
        iframeUrl='https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F'
        eventId='consulting_form'
    />;
}
