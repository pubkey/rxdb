import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect } from 'react';
import { ensureNotFalsy, lastOfArray } from '../../../';
import { AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY } from '../components/salaries';
import {
    LicensePeriod,
    PACKAGE_PRICE,
    PackageName,
    PriceCalculationInput,
    ProjectAmount,
    calculatePrice
} from '../components/price-calculator';
import { trigger } from '../components/trigger-event';
import { getDatabase, hasIndexedDB } from '../components/database';
import useIsBrowser from '@docusaurus/useIsBrowser';
import BrowserOnly from '@docusaurus/BrowserOnly';

export type FormValueDocData = {
    homeCountry?: string;
    companySize?: number;
    projectAmount?: ProjectAmount;
    licensePeriod?: LicensePeriod;
    packages?: PackageName[];
    price?: number;
    formSubmitted: boolean;
};
export const FORM_VALUE_DOCUMENT_ID = 'premium-price-form-value';

export default function Premium() {
    const { siteConfig } = useDocusaurusContext();
    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (isBrowser) {
            window.trigger('open_pricing_page', 1);
        }

        (async () => {
            if (!isBrowser || !hasIndexedDB()) {
                return;
            }

            // load previous form data
            const database = await getDatabase();
            const formValueDoc = await database.getLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID);
            if (formValueDoc) {
                console.log('formValueDoc:');
                console.dir(formValueDoc);

                setToInput('home-country', formValueDoc._data.data.homeCountry);
                setToInput('company-size', formValueDoc._data.data.companySize);
                setToInput('project-amount', formValueDoc._data.data.projectAmount);
                setToInput('license-period', formValueDoc._data.data.licensePeriod);

                Object.keys(PACKAGE_PRICE).forEach(packageName => {
                    setToInput('package-' + packageName, false);
                });
                formValueDoc._data.data.packages.forEach(packageName => {
                    setToInput('package-' + packageName, true);
                });

                // auto-submit form
                document.getElementById('price-calculator-submit').click();
            }
        })();
    });

    return (
        <>
            <Head>
                <body className="homepage" />
            </Head>

            <Layout
                title={`Premium Plugins - ${siteConfig.title}`}
                description="RxDB plugins for professionals. FAQ, pricing and license"
            >
                <main>
                    <div className="block first">
                        <div className="content centered">
                            <h2>
                                <b className="underline">RxDB</b> Premium Plugins
                            </h2>
                            <p style={{ width: '80%' }}>
                                RxDB's premium plugins offer advanced features and optimizations that enhance application <b>performance</b>{' '}
                                and are backed by dedicated support and regular updates. Using the premium plugins is recommended for users
                                that use RxDB in a professional context.
                            </p>
                            <div className="premium-blocks">
                                <a href="/rx-storage-indexeddb.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage IndexedDB</h4>
                                            <p>
                                                A storage for browsers based on <b>IndexedDB</b>. Has the best latency on writes and smallest build size.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/rx-storage-opfs.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage OPFS</h4>
                                            <p>
                                                Currently the RxStorage with best data throughput that can be used in the browser.
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
                                <a href="/rx-storage-memory-synced.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>RxStorage Memory Synced</h4>
                                            <p>
                                                A wrapper around any other storage that creates a synced
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
                                <a href="/logger.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>Logger</h4>
                                            <p>A logging plugin useful to debug performance problems and for monitoring with Application Performance Monitoring (APM) tools like Bugsnag, Datadog, Elastic, Sentry and others</p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="block dark" id="faq">
                        <div className="content centered premium-faq">
                            <h2>
                                F.A.Q. <b>(click to toggle)</b>
                            </h2>
                            <details>
                                <summary>Do I need the Premium Plugins?</summary>
                                RxDB Core is open source and many use cases can be implemented with the Open Core part of
                                RxDB. There are many{' '}
                                <a href="/rx-storage.html" target="_blank">
                                    RxStorage
                                </a>{' '}
                                options and all core plugins that are required for replication, schema
                                validation, encryption and so on, are totally free. As soon as your
                                application is more then a side project you can consider using the premium plugins as an easy way
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
                            <details>
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
                            </details>
                            <details>
                                <summary>Why is there no free trial period?</summary>
                                <ul>
                                    <li>
                                        RxDB is written in JavaScript and the code of the Premium Plugins
                                        does not contain any tracking or measurement code that would send
                                        information from your application to our servers in production mode.
                                        As soon as someone has the code on his computer, the maintainer has
                                        no chance to really ensure that after a free trial period the code
                                        is no longer used and deleted.
                                    </li>
                                    <li>
                                        Before you can use the Premium Plugins you have to debate and sign a
                                        license agreement with the maintainer. This is a sophisticated
                                        process that creates overhead which distracts the maintainer from
                                        writing RxDB code. So handling trial period users is just not
                                        manageable. For this reason there is also no monthly subscriptions.
                                        Premium access must be paid <b>per year</b>.
                                    </li>
                                </ul>
                            </details>
                            <details>
                                <summary>Why is it not cheaper?</summary>
                                The price of the Premium Plugins is chosen in way that ensures that
                                there can be always one person that develops RxDB <b>full time</b>.
                                Compared to other JavaScript frameworks and developer tools, RxDB
                                satisfies an edge use case for people that want to store data inside of
                                their application on the users device. Most web developers do not need
                                to do that and rely on the traditional client-server stack. So RxDB
                                cannot be sold to that many people which increases the price.
                            </details>
                            <details>
                                <summary>Can I install/build the premium plugins in my CI?</summary>
                                <b>Yes</b> you can safely install and use the Premium Plugins in your CI
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
                            <details>
                                <summary>Can I get a discount?</summary>
                                Discounts are provided for people that have made a significant
                                contribution to RxDB or one of RxDB's dependencies or to the Open Source
                                Community overall. Also for private personal projects there is the
                                option to solve one of the
                                <a
                                    href="https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md"
                                    target="_blank"
                                >
                                    Premium Tasks
                                </a>
                                to get 2 years access to the Premium Plugins.
                            </details>
                            <details>
                                <summary>
                                    Is there any tracking code inside of the premium plugins?
                                </summary>
                                No, the premium plugins themself do not contain any tracking code. When
                                you build your application with RxDB and deploy it to production, it
                                will not make requests from your users to any RxDB server.
                            </details>
                        </div>
                    </div>
                    <div className="block">
                        <div className="content centered">
                            <h2>
                                RxDB Premium <b className="underline">Price Calculator</b>
                            </h2>
                            <div className="price-calculator">
                                <div className="price-calculator-inner">
                                    <form id="price-calculator-form">
                                        <div className="field">
                                            <label htmlFor="home-country">Company Home Country:</label>
                                            <div className="input">
                                                <input
                                                    list="home-country"
                                                    name="home-country"
                                                    pattern="[A-Za-z \-\,]{2,}"
                                                    required={true}
                                                    style={{ width: '100%', maxWidth: 240 }}
                                                    autoComplete="off"
                                                    placeholder="Company Home Country"
                                                />
                                                <datalist id="home-country">
                                                    {
                                                        AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY
                                                            .sort((a, b) => a.name >= b.name ? 1 : -1)
                                                            .map((country, idx) => {
                                                                return <option key={idx} value={country.name} >{country.name}</option>;
                                                            })
                                                    }
                                                </datalist>
                                            </div>
                                        </div>
                                        <br />
                                        <div className="clear"></div>
                                        <div className="field">
                                            <label htmlFor="company-size">Company Size:</label>
                                            <div className="input">
                                                <input
                                                    type="number"
                                                    name="company-size"
                                                    min={1}
                                                    max={1000000}
                                                    required={true}
                                                    onKeyDown={() => {
                                                        const ev = ensureNotFalsy(event) as any;
                                                        return ev.keyCode !== 69 && ev.keyCode !== 189 && ev.keyCode !== 190;
                                                    }}
                                                    placeholder="Company Size"
                                                />
                                                <div className="suffix">employee(s)</div>
                                            </div>
                                        </div>
                                        {/* <div className="field">
                                            <label htmlFor="project-amount">Project Amount:</label>
                                            <div className="input">
                                                <select name="project-amount" id="project-amount" required={true}
                                                    defaultValue={1}
                                                >
                                                    <option value={1}>
                                                        1
                                                    </option>
                                                    <option value={2}>2</option>
                                                    <option value="infinity">Infinity</option>
                                                </select>
                                                <div className="suffix">project(s)</div>
                                            </div>
                                        </div> */}
                                        <div className="packages">
                                            <h3>Packages:</h3>
                                            <div className="package bg-gradient-left-top">
                                                <div className="package-inner">
                                                    <input
                                                        name="package-browser"
                                                        type="checkbox"
                                                        className="package-checkbox"
                                                        defaultChecked={true}
                                                    />
                                                    <h4>Browser Package</h4>
                                                    <ul>
                                                        <li>
                                                            <a href="/rx-storage-opfs.html" target="_blank">
                                                                RxStorage OPFS
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/rx-storage-indexeddb.html" target="_blank">
                                                                RxStorage IndexedDB
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/rx-storage-worker.html" target="_blank">
                                                                RxStorage Worker
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/encryption.html" target="_blank">
                                                                WebCrypto Encryption
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="package bg-gradient-left-top">
                                                <div className="package-inner">
                                                    <input
                                                        name="package-native"
                                                        type="checkbox"
                                                        className="package-checkbox"
                                                        defaultChecked={true}
                                                    />
                                                    <h4>Native Package</h4>
                                                    <ul>
                                                        <li>
                                                            <a href="/rx-storage-sqlite.html" target="_blank">
                                                                RxStorage SQLite
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a
                                                                href="/rx-storage-filesystem-node.html"
                                                                target="_blank"
                                                            >
                                                                RxStorage Filesystem Node
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="package bg-gradient-left-top">
                                                <div className="package-inner">
                                                    <input
                                                        name="package-performance"
                                                        type="checkbox"
                                                        className="package-checkbox"
                                                        defaultChecked={true}
                                                    />
                                                    <h4>Performance Package</h4>
                                                    <ul>
                                                        <li>
                                                            <a href="/rx-storage-sharding.html" target="_blank">
                                                                RxStorage Sharding
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/rx-storage-memory-synced.html" target="_blank">
                                                                RxStorage Memory Synced
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/query-optimizer.html" target="_blank">
                                                                Query Optimizer
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a
                                                                href="/rx-storage-localstorage-meta-optimizer.html"
                                                                target="_blank"
                                                            >
                                                                RxStorage Localstorage Meta Optimizer
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/rx-storage-shared-worker.html" target="_blank">
                                                                RxStorage Shared Worker
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="package bg-gradient-left-top">
                                                <div className="package-inner">
                                                    <input
                                                        name="package-utilities"
                                                        type="checkbox"
                                                        className="package-checkbox"
                                                        defaultChecked={true}
                                                        disabled={true}
                                                    />
                                                    <h4>
                                                        Utilities Package <b>always included</b>
                                                    </h4>
                                                    <ul>
                                                        <li>
                                                            <a href="/logger.html" target="_blank">
                                                                Logger
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="clear" />
                                            {/* <h3>Other Options:</h3> */}
                                            {/* <div className="package bg-gradient-left-top">
                                                <div className="package-inner">
                                                    <input
                                                        name="package-sourcecode"
                                                        type="checkbox"
                                                        className="package-checkbox"
                                                    />
                                                    <h4>Source Code access</h4>
                                                    <p>
                                                        Get read access to the unminified plain source code of all
                                                        purchased packages.
                                                        <br />
                                                    </p>
                                                </div>
                                            </div> */}
                                            {/* <div className="package bg-gradient-left-top">
                                                <div className="package-inner">
                                                    <input
                                                        name="package-perpetual"
                                                        type="checkbox"
                                                        className="package-checkbox"
                                                    />
                                                    <h4>Perpetual license</h4>
                                                    <p>
                                                        With the perpetual license option, you can still use the
                                                        plugins even after the license is expired. But you will no
                                                        longer get any updates from newer RxDB versions.
                                                        <br />
                                                    </p>
                                                </div>
                                            </div> */}
                                            {/* <div className="package bg-gradient-left-top">
                                                <div className="package-inner">
                                                    <h4>Increase license period</h4>
                                                    <p>
                                                        The default license period is one year. We can do a longer
                                                        license period to safe time on both sides by not having to
                                                        go through the licensing process each single year. By
                                                        choosing a license period of 2 years, you get a 10%
                                                        discount. With a 3 year license the discount is 20%.
                                                        <br />
                                                    </p>
                                                    <div className="field">
                                                        <div
                                                            className="input"
                                                            style={{ float: 'left', width: '100%' }}
                                                        >
                                                            <div className="prefix">License period </div>
                                                            <select
                                                                name="license-period"
                                                                id="license-period"
                                                                required={true}
                                                                defaultValue={1}
                                                            >
                                                                <option value={1}>
                                                                    1
                                                                </option>
                                                                <option value={2}>2 (10% discount)</option>
                                                                <option value={3}>3 (20% discount)</option>
                                                            </select>
                                                            <div className="suffix">year(s)</div>
                                                        </div>
                                                        <div className="clear" />
                                                    </div>
                                                    <p />
                                                </div>
                                            </div> */}
                                            <div className="clear" />
                                        </div>
                                        <div
                                            className="button"
                                            id="price-calculator-submit"
                                            onClick={async () => {
                                                trigger('calculate_premium_price', 3);
                                                const $priceCalculatorForm: HTMLFormElement = ensureNotFalsy(document.getElementById('price-calculator-form')) as any;
                                                const isValid = ($priceCalculatorForm as any).reportValidity();
                                                if (!isValid) {
                                                    console.log('form not valid');
                                                    return;
                                                }

                                                const formDataPlain = new FormData($priceCalculatorForm);
                                                const formData = Object.fromEntries((formDataPlain as any).entries());

                                                console.log('formData:');
                                                console.dir(formData);


                                                const homeCountry = AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY
                                                    .find(o => o.name.toLowerCase() === (formData['home-country'] as string).toLowerCase());
                                                if (!homeCountry) {
                                                    return;
                                                }

                                                const packageFields = Object.entries(formData)
                                                    .filter(([k, _v]) => k.startsWith('package-'));
                                                const packages: PackageName[] = packageFields
                                                    .map(([k]) => lastOfArray(k.split('-')) as any);

                                                const priceCalculationInput: PriceCalculationInput = {
                                                    companySize: parseInt(formData['company-size'] as any, 10),
                                                    teamSize: formData['developer-count'] as any,
                                                    projectAmount: '1', // formData['project-amount'] as any,
                                                    licensePeriod: 1, // parseInt(formData['license-period'] as any, 10) as any,
                                                    homeCountryCode: homeCountry.code,
                                                    packages
                                                };

                                                const priceResult = calculatePrice(priceCalculationInput);
                                                console.log('priceResult:');
                                                console.log(JSON.stringify(priceResult, null, 4));


                                                const $priceCalculatorResult = ensureNotFalsy(document.getElementById('price-calculator-result'));
                                                const $priceCalculatorResultPerMonth = ensureNotFalsy(document.getElementById('total-per-project-per-month'));
                                                // const $priceCalculatorResultPerYear = ensureNotFalsy(document.getElementById('total-per-year'));
                                                // const $priceCalculatorResultTotal = ensureNotFalsy(document.getElementById('total-price'));
                                                const setPrice = (element: typeof $priceCalculatorResultPerMonth, price: number) => {
                                                    console.log('setPrice:');
                                                    console.dir(price);
                                                    element.innerHTML = Math.ceil(price).toString();
                                                    // (element as any).href = getConverterUrl(Math.ceil(price));
                                                };
                                                const pricePerYear: number = (priceResult.totalPrice / priceCalculationInput.licensePeriod);
                                                if (priceCalculationInput.projectAmount !== 'infinity') {
                                                    setPrice($priceCalculatorResultPerMonth, pricePerYear / parseInt(priceCalculationInput.projectAmount, 10) / 12);
                                                } else {
                                                    setPrice($priceCalculatorResultPerMonth, 0);
                                                }
                                                // setPrice($priceCalculatorResultPerYear, pricePerYear);
                                                // setPrice($priceCalculatorResultTotal, priceResult.totalPrice);

                                                /**
                                                 * Save the input
                                                 * so we have to not re-insert manually on page reload.
                                                 */
                                                const database = await getDatabase();
                                                await database.upsertLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID, {
                                                    companySize: formData['company-size'] as any,
                                                    projectAmount: formData['project-amount'] as any,
                                                    licensePeriod: formData['license-period'] as any,
                                                    homeCountry: homeCountry.name,
                                                    packages,
                                                    price: priceResult.totalPrice,
                                                    formSubmitted: false
                                                });


                                                $priceCalculatorResult.style.display = 'block';
                                            }}
                                        >
                                            Estimate Price
                                        </div>
                                    </form>
                                </div>
                            </div>
                            <div className="price-calculator" style={{ marginBottom: 90 }}>
                                <div className="price-calculator-inner" id="price-calculator-result" style={{ display: 'none' }}>
                                    <h4>Estimated Price:</h4>

                                    <br />
                                    <div className="inner">

                                        <span className="price-label">&euro;</span>
                                        <span id="total-per-project-per-month">84</span>
                                        <span className="per-month">/month</span>
                                        <span className='clear'></span>
                                    </div>
                                    <br />
                                    <br />

                                    {/* <table>
                                        <tbody>
                                            <tr>
                                                <th>Price per Month</th>
                                                <td>
                                                    <a
                                                        id="total-per-project-per-month"
                                                        target="_blank"
                                                        rel="nofollow noopener noreferrer"
                                                        title="Click to convert to other currency"
                                                        href="#"
                                                    >
                                                        XX €
                                                    </a>
                                                </td>
                                            </tr>
                                            <tr>
                                                    <th>Total Price per Year</th>
                                                    <td>
                                                        <a
                                                            id="total-per-year"
                                                            target="_blank"
                                                            rel="nofollow noopener noreferrer"
                                                            title="Click to convert to other currency"
                                                            href="#"
                                                        >
                                                            XX €
                                                        </a>
                                                    </td>
                                                </tr>
                                            <tr>
                                                <th>Total Price</th>
                                                <td>
                                                    <a
                                                        id="total-price"
                                                        target="_blank"
                                                        rel="nofollow noopener noreferrer"
                                                        title="Click to convert to other currency"
                                                        href="#"
                                                    >
                                                        XX €
                                                    </a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table> */}
                                    <div className="proceed-hint">
                                        Fill out the <b>form below &darr;</b> to proceed.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="block dark" id="premium-request-form-block">
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
                        </div>
                    </div>
                </main>
            </Layout >
        </>
    );
}
// function getConverterUrl(price: number) {
//     return 'https://www.xe.com/en/currencyconverter/convert/?Amount=' + price + '&From=EUR&To=USD';
// }

function setToInput(name: string, value: any) {
    if (typeof value === 'undefined') {
        return;
    }
    const element = document.querySelector('[name=' + name + ']') as any;
    if (!element) {
        return;
    }


    if (element.type && element.type === 'checkbox') {
        element.checked = value;
        return;
    }

    (element as any).value = value;
}
