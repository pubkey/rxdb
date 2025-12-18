import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect } from 'react';
import { CollectionsOfDatabase, RxDatabase, RxLocalDocument, deepEqual, ensureNotFalsy } from '../../../plugins/core';
import {
    PackageName,
    calculatePriceFromFormValueDoc
} from '../components/price-calculator';
import useIsBrowser from '@docusaurus/useIsBrowser';
// import {
//     Select
// } from 'antd';
import { distinctUntilChanged, map } from 'rxjs';
import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal } from '../components/modal';
import { Button } from '../components/button';

export type FormValueDocData = {
    developers: number;
    homeCountry?: string;
    companySize?: number;
    packages: PackageName[];
    price?: number;
    formSubmitted: boolean;
};
export const FORM_VALUE_DOCUMENT_ID = 'premium-price-form';


export const TEAM_SIZES = [
    1,
    3,
    6,
    12,
    24,
    30
];

let formValueDocPromiseCache: Promise<RxLocalDocument<RxDatabase<CollectionsOfDatabase, any, any, any>, FormValueDocData>>;

function getFormValueDoc() {
    if (!formValueDocPromiseCache) {
        formValueDocPromiseCache = (async () => {
            const dbModule = await import('../components/database.module');
            const database = await dbModule.getDatabase();
            let formValueDoc = await database.getLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID);
            if (!formValueDoc) {
                formValueDoc = await database.upsertLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID, {
                    formSubmitted: false,
                    developers: TEAM_SIZES[1],
                    packages: [
                        'browser'
                    ]
                });
            }
            return formValueDoc;
        })();
    }
    return formValueDocPromiseCache;
}





function PackageCheckbox(props: {
    packageName: PackageName;
    formValue?: FormValueDocData;
    onToggle: () => void;
}) {
    return <input
        name={'package-' + props.packageName}
        type="checkbox"
        className="package-checkbox"
        checked={props.formValue?.packages.includes(props.packageName) ? true : false}
        readOnly
        onClick={() => {
            triggerTrackingEvent('calculate_premium_price', 3, 1);
            props.onToggle();
        }}
    />;
}


export default function Premium() {
    const { siteConfig } = useDocusaurusContext();
    const isBrowser = useIsBrowser();
    // const [homeCountry, setHomeCountry] = React.useState<string | null>(null);
    // const [homeCountryInitial, setHomeCountryInitial] = React.useState<string | null>(null);

    const [initDone, setInitDone] = React.useState<boolean>(false);
    const [formValue, setFormValue] = React.useState<FormValueDocData>(null);




    useEffect(() => {
        if (!isBrowser) {
            return;
        }


        if (initDone) {
            return;
        }
        setInitDone(true);
        if (isBrowser) {
            triggerTrackingEvent('open_pricing_page', 1);
        }

        (async () => {
            // load previous form data
            const formValueDoc = await getFormValueDoc();


            formValueDoc.$.pipe(
                map((d: RxLocalDocument<RxDatabase<CollectionsOfDatabase, any, any, any>, FormValueDocData>) => d._data.data),
                distinctUntilChanged(deepEqual)
            ).subscribe((data: FormValueDocData) => {
                console.log('XXX new data:');
                console.dir(data);

                setFormValue(data);

                // setHomeCountryInitial(formValueDoc._data.data.homeCountry);
                // setHomeCountry(formValueDoc._data.data.homeCountry);
                // setToInput('company-size', formValueDoc._data.data.companySize);
                // // setToInput('project-amount', formValueDoc._data.data.projectAmount);
                // // setToInput('license-period', formValueDoc._data.data.licensePeriod);

                // console.log('################# setDevelopers() ' + formValueDoc._data.data.developers);
                // setDevelopers(formValueDoc._data.data.developers);
                // setToInput('developer-count', formValueDoc._data.data.developers);


                // Object.keys(PACKAGE_PRICE).forEach(packageName => {
                //     setToInput('package-' + packageName, formValueDoc._data.data.packages.includes(packageName as any));
                // });

                // auto-submit form
                // submitCalculator(false);
                recalculatePrice();

            });
        })();
    });

    // for dialog
    const [open, setOpen] = React.useState(false);
    const handleOpenDialog = () => {
        triggerTrackingEvent('open_premium_submit_popup', 20, 1);
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };


    async function recalculatePrice() {
        const formValueDoc = await getFormValueDoc();
        const priceResult = calculatePriceFromFormValueDoc(formValueDoc);
        console.log('priceResult:');
        console.log(JSON.stringify(priceResult, null, 4));


        const $priceCalculatorResult = ensureNotFalsy(document.getElementById('price-calculator-result'));
        const $priceCalculatorResultPerMonth = ensureNotFalsy(document.getElementById('total-per-project-per-month'));
        const $priceCalculatorResultPerYear = ensureNotFalsy(document.getElementById('total-per-project-per-year'));
        // const $priceCalculatorResultPerYear = ensureNotFalsy(document.getElementById('total-per-year'));
        // const $priceCalculatorResultTotal = ensureNotFalsy(document.getElementById('total-price'));
        const setPrice = (pricePerYear: number) => {
            console.log('setPrice:');
            console.dir(pricePerYear);
            $priceCalculatorResultPerMonth.innerHTML = Math.ceil(pricePerYear / 12).toString();
            $priceCalculatorResultPerYear.innerHTML = Math.ceil(pricePerYear).toString();
            // (element as any).href = getConverterUrl(Math.ceil(price));
        };
        // const pricePerYear: number = (priceResult.totalPrice / priceCalculationInput.licensePeriod);
        setPrice(priceResult.totalPrice);
        // if (priceCalculationInput.projectAmount !== 'infinity') {
        //     setPrice($priceCalculatorResultPerMonth, pricePerYear / parseInt(priceCalculationInput.projectAmount, 10) / 12);
        // } else {
        //     setPrice($priceCalculatorResultPerMonth, 0);
        // }
        // setPrice($priceCalculatorResultPerYear, pricePerYear);
        // setPrice($priceCalculatorResultTotal, priceResult.totalPrice);

        /**
         * Save the input
         * so we have to not re-insert manually on page reload.
         */

        // const database = await getDatabase();
        // console.log('uipsert local developers: ' + developers);
        // await database.upsertLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID, {
        //     developers: developers,
        //     companySize: formData['company-size'] as any,
        //     // projectAmount: formData['project-amount'] as any,
        //     // licensePeriod: formData['license-period'] as any,
        //     // homeCountry: homeCountryObject.name,
        //     packages,
        //     price: priceResult.totalPrice,
        //     formSubmitted: false
        // });


        $priceCalculatorResult.style.display = 'block';
    }


    function togglePackage(name: PackageName) {
        return getFormValueDoc().then(doc => doc.incrementalModify(d => {
            if (d.packages.includes(name)) {
                d.packages = d.packages.filter(p => p !== name);
            } else {
                d.packages.push(name);
            }
            return d;
        }));
    }

    return (
        <>
            <Head>
                <body className="homepage" />
                <link rel="canonical" href="/premium/" />
            </Head>

            <Layout
                title={`Premium Plugins - ${siteConfig.title}`}
                description="RxDB plugins for professionals. FAQ, pricing and license"
            >
                <main>
                    <div className="block first">
                        <div className="content centered">

                            <h2>
                                RxDB <b>Premium</b>
                            </h2>

                            <p style={{ width: '80%' }}>
                                RxDB's Premium plugins offer advanced features and performance improvements designed for businesses and professionals.
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

                    <div className="block dark" id="price-calculator-block">
                        <div className="content centered">
                            <h2>
                                Price Calculator
                            </h2>
                            <div className="price-calculator">
                                <div className="price-calculator-inner">
                                    <form id="price-calculator-form">
                                        {/*
                                        <div className="field">
                                            <label htmlFor="home-country">Company Home Country:</label>
                                            <div className="input">
                                                <Select
                                                    id="home-country"
                                                    style={{ width: '100%' }}
                                                    popupMatchSelectWidth
                                                    optionFilterProp="value"
                                                    showSearch={true}
                                                    placeholder="Company Home Country"
                                                    value={homeCountry ? homeCountry : homeCountryInitial}
                                                    onChange={(value) => {
                                                        if (value !== homeCountry) {
                                                            setHomeCountry(value);
                                                        }
                                                    }}
                                                >
                                                    {
                                                        AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY
                                                            .sort((a, b) => a.name >= b.name ? 1 : -1)
                                                            .map((country, idx) => {
                                                                return <Select.Option key={idx} value={country.name}>{country.name}</Select.Option>;
                                                            })
                                                    }
                                                </Select>
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
                                        */}
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
                                        {/* <div className="field">
                                            <label
                                                htmlFor="developer-count"
                                            >Team Size:</label>
                                            <div className="input">
                                                <Select
                                                    id="developer-count"
                                                    style={{ width: '100%' }}
                                                    popupMatchSelectWidth
                                                    optionFilterProp="value"
                                                    value={formValue?.developers ? formValue?.developers : 1}
                                                    onChange={(value) => {
                                                        getFormValueDoc().then(doc => doc.incrementalModify(d => {
                                                            d.developers = value;
                                                            return d;
                                                        }));
                                                    }}
                                                >
                                                    {
                                                        TEAM_SIZES
                                                            .map((nr, idx) => {
                                                                return <Select.Option key={idx} value={nr}>up to {nr} developer{nr === 1 ? '' : 's'}</Select.Option>;
                                                            })
                                                    }
                                                </Select>
                                                <div className="clear"></div>
                                                <br />
                                                <span>&#9432; As a developer, we count everyone who stores the <b>rxdb-premium</b> npm package on their device, not only the ones who directly develop with RxDB.</span>
                                            </div>
                                        </div> */}
                                        <div className="packages">
                                            <h3>Choose your Packages</h3>
                                            <div className="package">
                                                <div className="package-inner">
                                                    <PackageCheckbox packageName='browser' onToggle={() => togglePackage('browser')} formValue={formValue} />
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
                                            <div className="package">
                                                <div className="package-inner">
                                                    <PackageCheckbox packageName='native' onToggle={() => togglePackage('native')} formValue={formValue} />
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
                                            <div className="package">
                                                <div className="package-inner">
                                                    <PackageCheckbox packageName='performance' onToggle={() => togglePackage('performance')} formValue={formValue} />
                                                    <h4>Performance Package</h4>
                                                    <ul>
                                                        <li>
                                                            <a href="/rx-storage-sharding.html" target="_blank">
                                                                RxStorage Sharding
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/rx-storage-memory-mapped.html" target="_blank">
                                                                RxStorage Memory Mapped
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
                                            <div className="package">
                                                <div className="package-inner">
                                                    <PackageCheckbox packageName='server' onToggle={() => togglePackage('server')} formValue={formValue} />
                                                    <h4>Server Package</h4>
                                                    <ul>
                                                        <li>
                                                            <a href="/rx-server.html" target="_blank">
                                                                RxServer Adapter Fastify
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/rx-server.html" target="_blank">
                                                                RxServer Adapter Koa
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="package">
                                                <div className="package-inner">
                                                    <input
                                                        name="package-utilities"
                                                        type="checkbox"
                                                        className="package-checkbox"
                                                        defaultChecked={true}
                                                        disabled={true}
                                                    />
                                                    <h4>
                                                        Utilities Package <b>(always included)</b>
                                                    </h4>
                                                    <ul>
                                                        <li>
                                                            <a href="/logger.html" target="_blank">
                                                                Logger
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/fulltext-search.html" target="_blank">
                                                                Fulltext Search
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/reactivity.html" target="_blank">
                                                                Reactivity Vue
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="/reactivity.html" target="_blank">
                                                                Reactivity Preact Signals
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
                                        {/* <div
                                            className="button"
                                            id="price-calculator-submit"
                                            style={{
                                            }}
                                            onClick={() => recalculatePrice(true)}
                                        >
                                            Calculate Price
                                        </div> */}
                                    </form>
                                </div>
                            </div>
                            <div className="price-calculator" id="price-calculator-result" style={{ marginBottom: 90, display: 'none' }}>
                                <div className="price-calculator-inner">
                                    <h4>Calculated Price:</h4>
                                    <div className="inner">
                                        <span className="price-label">&euro;</span>
                                        <span id="total-per-project-per-month">XX</span>
                                        <span className="per-month">/month</span>
                                        <span className='clear'></span>
                                    </div>
                                    <div className="inner">
                                        (billed yearly: <span id="total-per-project-per-year"></span> &euro;)
                                    </div>
                                    <br />
                                    <div className='clear'></div>
                                    <Button
                                        primary
                                        style={{
                                            width: '100%'
                                        }}
                                        onClick={handleOpenDialog}
                                    >Buy Now »</Button>
                                    <div style={{
                                        fontSize: '70%',
                                        textAlign: 'center',
                                        marginTop: 16
                                    }}>If you have any questions, see the FAQ below or fill out the <b
                                        style={{
                                            color: 'white',
                                            textDecoration: 'underline',
                                            cursor: 'pointer'
                                        }}
                                        onClick={handleOpenDialog}
                                    >Buy-Now Form</b> to get in contact.</div>
                                    {/* <div className="button" onClick={handleOpenDialog}>Ask questions</div> */}
                                    <div className='clear'></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="block" id="faq">
                        <div className="content centered premium-faq">
                            <h2>
                                F.A.Q. <b>(click to toggle)</b>
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
                                    <li>Fill out the <b
                                        style={{
                                            color: 'white',
                                            textDecoration: 'underline',
                                            cursor: 'pointer'
                                        }}
                                        onClick={handleOpenDialog}
                                    >Buy now form</b>.</li>
                                    <li>You will get a license agreement that you can sign online.</li>
                                    <li>You will get an invoice via stripe.com.</li>
                                    <li>After payment you get the access token that you can use to add the Premium plugins to your project with <a href="https://www.npmjs.com/package/rxdb-premium" target="_blank">these instructions</a>.</li>
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
                                    Can I add more Premium Packages later if I've already purchased some?
                                </summary>
                                Yes! You can upgrade or add additional Premium Packages at any time.
                                When you decide to purchase more, we'll calculate a fair upgrade price,
                                meaning you only pay the difference between your existing purchase and the new package total.
                                <br />
                                Your previous payments are fully credited, so you never pay twice for the same plugins.
                            </details>
                            <details>
                                <summary>Can I get a discount?</summary>
                                There are multiple ways to get a discount:
                                <ul>
                                    <li>
                                        <h5>Contribute to the RxDB github repository</h5>
                                        <p>If you have made significant contributions to the RxDB github repository, you can apply for a discount depending on your contribution.</p>
                                    </li>
                                    <li>
                                        <h5>Get 25% off by writing about how you use RxDB</h5>
                                        <p>
                                            On your company/project website, publish an article/blogpost about how you use RxDB in your project.
                                            Include how your setup looks like,
                                            how you use RxDB in that setup and what problems you had and how did you overcome them.
                                            You also need to link to the RxDB website or documentation pages.
                                        </p>
                                    </li>
                                    <li>
                                        <h5>Be active in the RxDB community</h5>
                                        <p>If you are active in the RxDB community and discord channel by helping others out or creating educational content like videos and tutorials, feel free to apply for a discount.</p>
                                    </li>
                                    <li>
                                        <h5>Solve one of the free-premium-tasks</h5>
                                        <p>
                                            For private personal projects there is the
                                            option to solve one of the
                                            {' '}<a
                                                href="https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md"
                                                target="_blank"
                                            >
                                                Premium Tasks
                                            </a>{' '}
                                            to get a free 2 years access to the Premium Plugins.
                                        </p>
                                    </li>
                                </ul>
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
                                <a href="/reactivity.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-left-top">
                                        <div className="premium-block-inner">
                                            <h4>Reactivity Vue</h4>
                                            <p>
                                                An extension for Vue.js to get vue shallow-ref objects to observe RxDB state instead of rxjs observables.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                                <a href="/reactivity.html" target="_blank">
                                    <div className="premium-block hover-shadow-middle bg-gradient-right-top">
                                        <div className="premium-block-inner">
                                            <h4>Reactivity Preact Signals</h4>
                                            <p>
                                                An extension for react/preact to get preact signals to observe RxDB state instead of rxjs observables.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                    <BuyFormDialog open={open} onClose={handleClose} />
                </main>
            </Layout >
        </>
    );
}
// function getConverterUrl(price: number) {
//     return 'https://www.xe.com/en/currencyconverter/convert/?Amount=' + price + '&From=EUR&To=USD';
// }


// components
function BuyFormDialog({ onClose, open }) {
    return <IframeFormModal
        onClose={onClose}
        open={open}
        iframeUrl='https://webforms.pipedrive.com/f/ccHQ5wi8dHxdFgcxEnRfXaXv2uTGnLNwP4tPAGO3hgSFan8xa5j7Kr3LH5OXzWQo2T'
    />;
}
