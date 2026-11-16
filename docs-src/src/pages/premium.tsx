import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { NON_PREMIUM_COLLECTION_LIMIT, PRICE_CORPORATE_YEARLY, PRICE_PRO_MONTHLY, PRICE_PRO_PLUS_MONTHLY } from '../constants';
import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal } from '../components/modal';
import { Button } from '../components/button';
import { IconChevronsRight } from '../components/icons/chevrons-right';
import { Faq, FaqItem } from '../components/faq';
import { CheckedList } from '../components/checked-list';
import { PartnerTrophy, SOCIAL_PROOF_VALUES, Trophy } from '../components/trophy';
import { ReviewsBlock } from '../components/review-block';
import { PERFORMANCE_BROWSER_DEXIE, PERFORMANCE_BROWSER_INDEXEDDB, PERFORMANCE_OPFS_WORKER } from '../components/performance-data';




/**
 * The Pro tiers show a monthly price but are only sold as annual licenses,
 * which the billingDuration of one year expresses.
 */
function monthlyBilledAnnually(price: number) {
    return {
        '@type': 'UnitPriceSpecification',
        'price': String(price),
        'priceCurrency': 'USD',
        'unitCode': 'MON',
        'referenceQuantity': {
            '@type': 'QuantitativeValue',
            'value': 1,
            'unitCode': 'MON',
        },
        'billingDuration': 'P1Y',
    };
}

/**
 * Product structured data for the premium plugins so search
 * engines can show price-annotated results for this page.
 * The prices come from the same constants as the visible
 * pricing tiers, so the markup cannot go out of sync.
 */
const PRODUCT_JSON_LD = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': 'RxDB Premium Plugins',
    'description': 'Commercial RxDB plugins with better performance, a smaller build size, flexible storage engines and secure encryption for production workloads.',
    'image': 'https://rxdb.info/files/logo/logo.svg',
    'url': 'https://rxdb.info/premium/',
    'brand': {
        '@type': 'Brand',
        'name': 'RxDB',
    },
    'offers': [
        {
            '@type': 'Offer',
            'name': 'Free',
            'description': 'Open-source core under the Apache 2.0 license. Includes the RxDB core, replication, schema validation and migration, the default storages and up to ' + NON_PREMIUM_COLLECTION_LIMIT + ' open collections in parallel. No signup, no key.',
            'price': '0',
            'priceCurrency': 'USD',
            'url': 'https://rxdb.info/premium/',
            'availability': 'https://schema.org/InStock',
        },
        {
            '@type': 'Offer',
            'name': 'Pro',
            'description': 'Starting price per month, billed annually. Unlimited developers. Everything in Free plus the OPFS, IndexedDB, SQLite and Filesystem storages, WebCrypto encryption and fulltext search.',
            'price': String(PRICE_PRO_MONTHLY),
            'priceCurrency': 'USD',
            'priceSpecification': monthlyBilledAnnually(PRICE_PRO_MONTHLY),
            'url': 'https://rxdb.info/premium/',
            'availability': 'https://schema.org/InStock',
        },
        {
            '@type': 'Offer',
            'name': 'Pro Plus',
            'description': 'Starting price per month, billed annually. Unlimited developers. Everything in Pro plus the Worker, SharedWorker, Sharding and Memory-Mapped storages, the localStorage meta optimizer, the query optimizer, RxServer adapters for Fastify and Koa, and the logger plugin.',
            'price': String(PRICE_PRO_PLUS_MONTHLY),
            'priceCurrency': 'USD',
            'priceSpecification': monthlyBilledAnnually(PRICE_PRO_PLUS_MONTHLY),
            'url': 'https://rxdb.info/premium/',
            'availability': 'https://schema.org/InStock',
        },
        {
            '@type': 'Offer',
            'name': 'Corporate',
            'description': 'Per year. Unlimited developers. Everything in Pro Plus plus consulting sessions, architecture review, a named engineer, source code access, a private support channel, code review, migration help and priority bug fixes.',
            'price': String(PRICE_CORPORATE_YEARLY),
            'priceCurrency': 'USD',
            'priceSpecification': {
                '@type': 'UnitPriceSpecification',
                'price': String(PRICE_CORPORATE_YEARLY),
                'priceCurrency': 'USD',
                'unitCode': 'ANN',
                'referenceQuantity': {
                    '@type': 'QuantitativeValue',
                    'value': 1,
                    'unitCode': 'ANN',
                },
            },
            'url': 'https://rxdb.info/premium/',
            'availability': 'https://schema.org/InStock',
        },
    ],
};

type PricingTierId = 'free' | 'pro' | 'pro-plus' | 'corporate';
type PricingTier = {
    id: PricingTierId;
    note: string;
    name: string;
    description: string;
    pricePrefix?: string;
    price: number;
    per: string;
    priceSub: React.ReactNode;
    features: React.ReactNode[];
    notIncluded?: string[];
    cta: string;
    /**
     * Tiers without a href open their request form in a dialog.
     */
    href?: string;
    recommended?: boolean;
};

const PRICING_TIERS: PricingTier[] = [
    {
        id: 'free',
        note: '// no signup, no key',
        name: 'Free',
        description: 'Open-source core. Get started for free.',
        price: 0,
        per: 'forever',
        priceSub: <a href="https://github.com/pubkey/rxdb/blob/master/LICENSE.txt" target="_blank">Apache 2.0 License</a>,
        features: [
            'RxDB core (schemas, queries, hooks)',
            'Replication & realtime sync',
            'Default RxStorage (Dexie, Memory, LokiJS)',
            'Schema validation & migration',
            <>Up to <a href="/rx-collection.html#faq">{NON_PREMIUM_COLLECTION_LIMIT} open collections</a> in parallel.</>,
            'Community support on GitHub & Discord',
        ],
        notIncluded: [
            'Premium storages (OPFS, SQLite, Filesystem)',
            'Performance plugins (Sharding, Memory Mapped)',
        ],
        cta: 'Get started',
        href: '/quickstart.html',
    },
    {
        id: 'pro',
        note: '// most teams start here',
        name: 'Pro',
        description: 'Production-grade storage engines.',
        pricePrefix: 'From',
        price: PRICE_PRO_MONTHLY,
        per: 'month',
        priceSub: 'billed annually, unlimited developers',
        features: [
            'Everything in Free',
            <><a href="/rx-storage-opfs.html" target="_blank">RxStorage OPFS</a> - newest browser storage</>,
            <><a href="/rx-storage-indexeddb.html" target="_blank">RxStorage IndexedDB</a> - most reliable browser storage</>,
            <><a href="/rx-storage-sqlite.html" target="_blank">RxStorage SQLite</a> - Electron, React-Native, Capacitor</>,
            <><a href="/rx-storage-filesystem-node.html" target="_blank">RxStorage Filesystem</a> (<a href="/rx-storage-filesystem-node.html" target="_blank">Node</a> + <a href="/rx-storage-filesystem-expo.html" target="_blank">Expo</a>)</>,
            <a href="/encryption.html" target="_blank">WebCrypto Encryption</a>,
            <a href="/fulltext-search.html" target="_blank">Fulltext Search</a>,
        ],
        cta: 'Get Pro',
        recommended: true,
    },
    {
        id: 'pro-plus',
        note: '// for high-throughput apps',
        name: 'Pro Plus',
        description: 'Performance plugins & server adapters.',
        pricePrefix: 'From',
        price: PRICE_PRO_PLUS_MONTHLY,
        per: 'month',
        priceSub: 'billed annually, unlimited developers',
        features: [
            'Everything in Pro',
            <><a href="/rx-storage-worker.html" target="_blank">RxStorage Worker</a> - main-thread offload</>,
            <a href="/rx-storage-shared-worker.html" target="_blank">RxStorage Shared Worker</a>,
            <a href="/rx-storage-sharding.html" target="_blank">RxStorage Sharding</a>,
            <a href="/rx-storage-memory-mapped.html" target="_blank">RxStorage Memory-Mapped</a>,
            <a href="/rx-storage-localstorage-meta-optimizer.html" target="_blank">Localstorage Meta Optimizer</a>,
            <a href="/query-optimizer.html" target="_blank">Query Optimizer</a>,
            <a href="/rx-server.html" target="_blank">RxServer adapters: Fastify, Koa</a>,
            <><a href="/logger.html" target="_blank">Logger plugin</a> (Compatible with Sentry)</>,
        ],
        cta: 'Get Pro Plus',
    },
    {
        id: 'corporate',
        note: '// consulting included',
        name: 'Corporate',
        description: 'Pro Plus with consulting sessions.',
        price: PRICE_CORPORATE_YEARLY,
        per: 'year',
        priceSub: 'unlimited developers',
        features: [
            'Everything in Pro Plus',
            <a href="/consulting/" target="_blank">Consulting sessions</a>,
            'Architecture review & onboarding',
            'Named engineer',
            'Source code access',
            'Private support channel',
            'Code review of your RxDB integration',
            'Migration help',
            'Priority bug fixes & feature requests',
        ],
        cta: 'Get Corporate',
    },
];

const BENCHMARK_METRICS = [
    { title: 'Insert 500 documents (bulk)', key: 'insert-documents-500' },
    { title: 'Find 3000 documents by query', key: 'find-by-query' },
] as const;

const BENCHMARK_STORAGES = [
    { label: 'Dexie.js (free)', data: PERFORMANCE_BROWSER_DEXIE, premium: false },
    { label: 'IndexedDB (Pro)', data: PERFORMANCE_BROWSER_INDEXEDDB, premium: true },
    { label: 'OPFS (Pro)', data: PERFORMANCE_OPFS_WORKER, premium: true },
];

/**
 * Compares the free Dexie.js storage with the premium browser storages.
 * Uses the same measurements as the charts on the storage performance page.
 */
function PremiumBenchmark() {
    return <div className="premium-bench">
        <div className="bench-title">Browser storage performance</div>
        <div className="bench-sub">time in milliseconds (lower is better)</div>
        {BENCHMARK_METRICS.map(metric => {
            const max = Math.max(...BENCHMARK_STORAGES.map(storage => storage.data[metric.key]));
            return <div key={metric.key}>
                <div className="bench-group">{metric.title}</div>
                {BENCHMARK_STORAGES.map(storage => (
                    <div key={storage.label} className={'bench-row' + (storage.premium ? ' premium' : '')}>
                        <span className="label">{storage.label}</span>
                        <span><div className="bar" style={{ width: Math.max(2, (storage.data[metric.key] / max) * 100) + '%' }} /></span>
                        <span className="ms">{storage.data[metric.key]} ms</span>
                    </div>
                ))}
            </div>;
        })}
        <div className="bench-foot"><a href="/rx-storage-performance.html" target="_blank">See all storage benchmarks</a></div>
    </div>;
}

export default function Premium() {
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
    const [openCorporate, setOpenCorporate] = React.useState(false);
    const handleOpenCorporateDialog = () => {
        triggerTrackingEvent('corporate_form_open', 0.4);
        setOpenCorporate(true);
    };
    const handleCloseCorporate = () => {
        setOpenCorporate(false);
    };

    const [openPro, setOpenPro] = React.useState(false);
    const handleOpenProDialog = () => {
        triggerTrackingEvent('pro_form_open', 0.4);
        setOpenPro(true);
    };
    const handleClosePro = () => {
        setOpenPro(false);
    };

    const [openProPlus, setOpenProPlus] = React.useState(false);
    const handleOpenProPlusDialog = () => {
        triggerTrackingEvent('pro_plus_form_open', 0.4);
        setOpenProPlus(true);
    };
    const handleCloseProPlus = () => {
        setOpenProPlus(false);
    };

    const openDialogByTier: Record<PricingTierId, () => void> = {
        'free': () => { },
        'pro': handleOpenProDialog,
        'pro-plus': handleOpenProPlusDialog,
        'corporate': handleOpenCorporateDialog,
    };


    return (
        <>
            <Head>
                <body className="homepage" />
                <link rel="canonical" href="/premium/" />
                <script type="application/ld+json">
                    {JSON.stringify(PRODUCT_JSON_LD)}
                </script>
            </Head>

            <Layout
                title={'RxDB for Professionals'}
                description="RxDB plugins for professionals. FAQ, pricing and license"
            >
                <main>
                    <div className="block first hero dark" style={{
                        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.8), #05060a)',
                        paddingBottom: 90
                    }}>
                        <div className="content">
                            <h1 style={{ textAlign: 'center' }}>
                                RxDB for <b>Professionals</b>
                            </h1>
                            <div className="inner">
                                <div className="half left">
                                    <p style={{ marginTop: 0, marginBottom: 0 }} className='centered-mobile-p'>
                                        The core of RxDB is free and open-source.
                                        The Pro and Pro Plus tiers add commercial plugins with <a href="/rx-storage-performance.html" target="_blank">better performance</a>, a smaller build size, flexible storage engines, and secure encryption for production workloads.
                                        The Corporate tier adds consulting sessions with the RxDB maintainer.
                                    </p>
                                    <CheckedList className='centered-mobile padding-right-20-0' style={{
                                        paddingTop: 35,
                                        paddingLeft: 0,
                                        paddingBottom: 0,
                                        maxWidth: 400
                                    }}>
                                        <>Faster <b>Storages</b> for every runtime</>
                                        <>Smaller <b>build size</b></>
                                        <>WebCrypto <b>Encryption</b></>
                                        <>Unlimited <b>developers</b> per license</>
                                    </CheckedList>
                                    <div style={{
                                        marginTop: 44,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 10,
                                        maxWidth: 500,
                                    }} className='hero-action-buttons centered-smaller-mobile'>
                                        <Button className="hero-action" href="/rx-storage-performance.html" target="_blank">Compare Performance</Button>
                                        <Button primary className="hero-action" href="#pricing">See Pricing</Button>
                                    </div>
                                </div>
                                <div className="half right premium-bench-half">
                                    <PremiumBenchmark />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Trophy
                        href="/code/"
                        title="GitHub"
                        subTitle='Open Source'
                        value={SOCIAL_PROOF_VALUES.github}
                        icon="/files/icons/github-star-with-logo.svg"
                        valueTitle='stars'
                    />

                    <div className="block trophy-before trophy-after" id="pricing">
                        <div className="content centered">
                            <h2 style={{ textAlign: 'center' }}>
                                Pick your <b>Plan</b>
                            </h2>
                            <div className="pricing-tiers">
                                {PRICING_TIERS.map(tier => (
                                    <div key={tier.id} className={'pricing-tier' + (tier.recommended ? ' pro-tier' : '')}>
                                        <span className="tier-note">{tier.note}</span>
                                        {tier.recommended ? <div className="badge-recommended">RECOMMENDED</div> : null}
                                        <h3>{tier.name}</h3>
                                        <p className="tier-desc">{tier.description}</p>
                                        <span className="tier-price-prefix">{tier.pricePrefix ? tier.pricePrefix : <>&nbsp;</>}</span>
                                        <div className="tier-price">${tier.price}<span>/ {tier.per}</span></div>
                                        <div className="tier-price-sub">{tier.priceSub}</div>
                                        <div className="tier-cta">
                                            {
                                                tier.href
                                                    ? <Button href={tier.href} style={{ width: '100%' }} icon={<IconChevronsRight />}>{tier.cta}</Button>
                                                    : <Button primary={tier.recommended} onClick={(e) => {
                                                        e.preventDefault();
                                                        openDialogByTier[tier.id]();
                                                    }} style={{ width: '100%', whiteSpace: 'nowrap' }} icon={<IconChevronsRight />}>{tier.cta}</Button>
                                            }
                                        </div>
                                        <div className="tier-includes-title">INCLUDES</div>
                                        <ul className="tier-features">
                                            {tier.features.map((feature, i) => <li key={i}>{feature}</li>)}
                                            {(tier.notIncluded || []).map((feature, i) => <li key={'not-' + i} className="strikethrough">{feature}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <PartnerTrophy
                        href="https://www.mongodb.com/company/blog/innovation/from-local-global-scalable-edge-apps-rxdb"
                        title="MongoDB"
                        imgUrl="/files/icons/mongodb-icon.svg"
                    />

                    <div className="block reviews dark trophy-before trophy-after" id="reviews">
                        <div className="content centered">
                            <h2>
                                Used by <b>Thousands Worldwide</b>
                            </h2>
                            <div className="inner">
                                <ReviewsBlock></ReviewsBlock>
                            </div>
                        </div>
                    </div>

                    <Trophy
                        href="/chat/"
                        title="Discord"
                        subTitle='Chat on'
                        value={SOCIAL_PROOF_VALUES.discord}
                        icon="/files/icons/discord.svg"
                        valueTitle='members'
                        black={true}
                    />

                    <div className="block trophy-before trophy-after" id="faq">
                        <div className="content centered premium-faq">
                            <h2 style={{ textAlign: 'center' }}>
                                Frequently Asked <b>Questions</b>
                            </h2>
                            <Faq>
                            {
                                /**
                                 * IMPORTANT: It is a bad practice to "justify" for the price. We sell a B2B
                                 * tool and of course it is more expensive than a consumer netflix abo.
                                 */
                            }
                            <FaqItem question="What is the process for making a purchase?">
                                <ul>
                                    <li>Fill out the form by clicking one of the buttons above.</li>
                                    <li>You will receive a license agreement to sign via email.</li>
                                    <li>You will receive an invoice to pay.</li>
                                    <li>You will receive an access token to add the Premium plugins to your project following <a href="https://www.npmjs.com/package/rxdb-premium" target="_blank">these instructions</a>.</li>
                                </ul>
                            </FaqItem>
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
                            <FaqItem question="Can I get a free trial period?">
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
                            </FaqItem>
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
                            <FaqItem question="Can I install/build the premium plugins in my CI?">
                                Yes, you can safely install and use the Premium Plugins in your CI
                                without additional payment.
                            </FaqItem>
                            <FaqItem question="Which payment methods are accepted?">
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
                            </FaqItem>
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
                            <FaqItem question="Is there any tracking code inside of the premium plugins?">
                                No, the premium plugins themself do not contain any tracking code. When
                                you build your application with RxDB and deploy it to production, it
                                will not make requests from your users to any RxDB server.
                            </FaqItem>
                            <FaqItem question="Can I upgrade to a higher tier later?">
                                Yes! You can upgrade to a higher tier at any time.
                                When you decide to upgrade, we'll calculate a fair upgrade price,
                                meaning you only pay the difference between your existing tier and the new tier.
                                <br />
                                Your previous payments are fully credited towards the new license.
                            </FaqItem>
                            <FaqItem question="Can I get a discount?">
                                We only offer discounts to developers who publicly speak about RxDB or are technical influencers.
                                If you give talks at conferences, create educational content for a large audience, or can otherwise help spread the word about RxDB, please reach out to discuss a potential discount.
                            </FaqItem>
                            <FaqItem question="Why do I have to pay taxes?">
                                Taxation depends on your country and entity type. We recommend that you add a correct address and, importantly, your Tax ID when filling out the form.
                            </FaqItem>
                            </Faq>
                        </div>
                    </div>

                    <PartnerTrophy
                        href="https://supabase.com/partners/integrations/rxdb"
                        title="Supabase"
                        imgUrl="/files/icons/supabase.svg"
                    />

                    <div className="block dark trophy-before" style={{ paddingBottom: 90 }}>
                        <div className="content centered">
                            <h2 style={{ textAlign: 'center' }}>
                                Get <b>RxDB Premium</b> today
                            </h2>
                            <div className="premium-closing-buttons">
                                <Button primary onClick={(e) => {
                                    e.preventDefault(); handleOpenProDialog();
                                }} icon={<IconChevronsRight />}>Get Pro</Button>
                                <Button href="/consulting/">Talk to the Maintainer</Button>
                                <Button href="/rx-storage-performance.html" target="_blank">Compare Performance</Button>
                            </div>
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
                    {/* Commented out: the "RxDB Premium Plugins Overview" section was confusing for users.
                    <div className="block dark">
                        <div className="content centered">
                            <h2>
                                RxDB Premium Plugins <b>Overview</b>
                            </h2>
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
                    */}
                    <CorporateFormDialog open={openCorporate} onClose={handleCloseCorporate} />
                    <ProFormDialog open={openPro} onClose={handleClosePro} />
                    <ProPlusFormDialog open={openProPlus} onClose={handleCloseProPlus} />
                </main>
            </Layout >
        </>
    );
}
// function getConverterUrl(price: number) {
//     return 'https://www.xe.com/en/currencyconverter/convert/?Amount=' + price + '&From=EUR&To=USD';
// }


function CorporateFormDialog({ onClose, open }) {
    return <IframeFormModal
        onClose={onClose}
        open={open}
        iframeUrl='https://webforms.pipedrive.com/f/63f2Y0mNbp1veI9X0QPYMmLKq4xeHmvN4OgxfmUyvIzLDQeAsTOFC3yLEP17TQWGNt'
        eventId='custom_package_form'
        focusEventType='premium_form_focus_x_sec'
    />;
}

function ProFormDialog({ onClose, open }) {
    return <IframeFormModal
        onClose={onClose}
        open={open}
        iframeUrl='https://webforms.pipedrive.com/f/6NclWCnYX2vvtF69NxoNKttBklqjCFyxArtY3ir4YZfLRDCIrBnCu3iewgluQcx5K3'
        eventId='pro_form'
        focusEventType='premium_form_focus_x_sec'
    />;
}

function ProPlusFormDialog({ onClose, open }) {
    return <IframeFormModal
        onClose={onClose}
        open={open}
        iframeUrl='https://webforms.pipedrive.com/f/ce8xmRLPWF5wdMuU49wkdta9IFUGbsVGfQpZZnnJUwJHhwztGs6jsqCnOaLFHaHhPJ'
        eventId='pro_plus_form'
        focusEventType='premium_form_focus_x_sec'
    />;
}
