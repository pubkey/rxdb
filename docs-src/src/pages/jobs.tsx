import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';

const FILE_EVENT_ID = 'jobs-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal } from '../components/modal';
import { Button } from '../components/button';

/**
 * Pipedrive webform for job applications.
 * TODO replace with the real form url once the form exists in Pipedrive,
 * the required fields are listed in the pull request that added this page.
 */
const JOBS_FORM_IFRAME_URL = 'https://webforms.pipedrive.com/f/REPLACE_ME';

const TASKS = [
    {
        title: 'Build the demo apps',
        text: 'Every RxDB feature needs a running example. You build small applications in TypeScript that show RxDB inside React, Angular, Vue and React Native, and you keep the existing examples working against the latest release.'
    },
    {
        title: 'Write the page that goes with it',
        text: 'A demo nobody can find does not help anyone. Each example gets a documentation or blog page that explains what it does and why it is built that way.'
    },
    {
        title: 'Answer developers',
        text: 'RxDB questions come in through GitHub Discussions, Discord and Stack Overflow. You answer the ones you can and you escalate the ones you cannot.'
    },
    {
        title: 'Keep the examples honest',
        text: 'When a release changes an API, the examples break. You find that before our users do.'
    }
];

const CUSTOMERS = [
    { name: 'Readwise', country: 'USA' },
    { name: 'Nutrien', country: 'Canada' },
    { name: 'SafeEx', country: 'Denmark' },
    { name: 'MoreApp', country: 'Germany' },
    { name: 'myAgro', country: 'Africa' },
    { name: 'WooCommerce POS', country: 'Australia' },
    { name: 'atroo GmbH', country: 'Germany' },
    { name: 'WebWare', country: 'Italy' },
    { name: 'ALTGRAS', country: 'Guinea' }
];

export default function Jobs() {
    useEffect(() => {
        (() => {
            triggerTrackingEvent(FILE_EVENT_ID, 0.5);
        })();
    });

    const [openForm, setOpenForm] = useState(false);

    const openApplicationForm = () => {
        setOpenForm(true);
        triggerTrackingEvent('jobs_form_open', 0.5);
    };

    return (
        <>
            <Head>
                <body className="homepage jobs-page" />
                <link rel="canonical" href="/jobs/" />
            </Head>
            <Layout
                title={'Jobs'}
                description="Open positions at RxDB. We are hiring a working student for developer content in Stuttgart, Germany, remote friendly."
            >
                <main>

                    <div className="block first centered">
                        <div className="content">
                            <h1 style={{ textAlign: 'center' }}>
                                Work on <b>RxDB</b>
                            </h1>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    RxDB is a local-first database for JavaScript applications.
                                    It runs inside the browser, on mobile and on the server, it keeps
                                    working when the network does not, and it synchronizes once the
                                    connection comes back. Companies build their field apps, their
                                    offline tools and their products on top of it.
                                </p>
                                <p className="centered-mobile-p">
                                    We have one open position.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>
                                Working Student <b>Developer Content</b>
                            </h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    <b>20 € per hour</b>, 10 to 20 hours per week, flexible around your
                                    lecture schedule. Mostly remote with occasional days in Stuttgart,
                                    Germany. Start whenever you are ready, the middle of a semester is fine.
                                </p>
                                <p className="centered-mobile-p">
                                    This is a Werkstudent position, so you have to be enrolled at a
                                    university. Computer science, software engineering, media informatics
                                    or something close to it.
                                </p>
                                <div className="text-center-mobile">
                                    <Button primary onClick={openApplicationForm}>Apply now</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="block">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>What you will <b>do</b></h2>
                            <div className="inner" style={{ flexWrap: 'wrap' }}>
                                {
                                    TASKS.map((task, i) => {
                                        return <div
                                            key={'task-' + i}
                                            style={{
                                                // the plain .block background is
                                                // var(--bg-color), so a card has to
                                                // use the darker tone to be visible
                                                backgroundColor: 'var(--bg-color-dark)',
                                                borderRadius: 10,
                                                padding: 24,
                                                margin: 8,
                                                flex: '1 1 380px'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 16,
                                                fontWeight: 700,
                                                lineHeight: '25px',
                                                marginBottom: 12
                                            }}>{task.title}</div>
                                            <div style={{
                                                fontSize: 14,
                                                fontWeight: 500,
                                                lineHeight: '21px'
                                            }}>{task.text}</div>
                                        </div>;
                                    })
                                }
                            </div>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>What you <b>bring</b></h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <ul style={{ maxWidth: 720, lineHeight: '28px' }}>
                                    <li>You are comfortable in TypeScript.</li>
                                    <li>
                                        You have published something of your own, a side project, a library,
                                        an app or a pull request to somebody else's repository.
                                        A GitHub profile tells us more than a cover letter, so send that.
                                    </li>
                                    <li>
                                        You can explain a technical thing in writing. Half of this job is
                                        code and the other half is the text next to it.
                                    </li>
                                    <li>English is enough. German is welcome and not required.</li>
                                </ul>
                                <p className="centered-mobile-p">
                                    You do not need to know RxDB yet. Nobody does before they start.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>Who <b>uses</b> what you build</h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    RxDB runs in production at companies on four continents. The examples
                                    you write are the first thing their developers read.
                                </p>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    maxWidth: 860
                                }}>
                                    {
                                        CUSTOMERS.map((customer, i) => {
                                            return <div
                                                key={'customer-' + i}
                                                style={{
                                                    backgroundColor: 'var(--bg-color-dark)',
                                                    borderRadius: 10,
                                                    padding: '12px 20px',
                                                    margin: 6,
                                                    fontSize: 15,
                                                    fontWeight: 600
                                                }}
                                            >
                                                {customer.name}
                                                <span style={{
                                                    fontWeight: 400,
                                                    opacity: 0.7,
                                                    marginLeft: 8
                                                }}>{customer.country}</span>
                                            </div>;
                                        })
                                    }
                                </div>
                                <p className="centered-mobile-p" style={{ marginTop: 24 }}>
                                    MongoDB and Supabase are official RxDB partners. What the companies
                                    above say about RxDB is on the <a href="/#reviews">customer section</a> of
                                    the homepage.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>What we <b>offer</b></h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <ul style={{ maxWidth: 720, lineHeight: '28px' }}>
                                    <li>20 € per hour.</li>
                                    <li>10 to 20 hours per week, planned around your lectures and your exams.</li>
                                    <li>Mostly remote, with occasional days together in Stuttgart.</li>
                                    <li>
                                        Your work is public and carries your name. RxDB is open source under
                                        the Apache License 2.0, so every example and every page you write
                                        stays visible after you leave.
                                    </li>
                                    <li>
                                        Short decisions. You talk to the people who build the product,
                                        because that is everyone here.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="block centered" style={{ paddingBottom: 124 }}>
                        <div className="content">
                            <h2 style={{ textAlign: 'center' }}>How to <b>apply</b></h2>
                            <div className="inner centered" style={{ flexDirection: 'column' }}>
                                <p className="centered-mobile-p">
                                    Send a link to your GitHub profile and two sentences about what you
                                    built there. No cover letter, no photo, no grades.
                                    We answer every application.
                                </p>
                                <Button primary onClick={openApplicationForm}>Apply now</Button>
                            </div>
                        </div>
                    </div>

                    <IframeFormModal
                        iframeUrl={JOBS_FORM_IFRAME_URL}
                        open={openForm}
                        onClose={() => setOpenForm(false)}
                        eventId='jobs_form'
                        focusEventType='jobs_form_focus'
                    />
                </main>
            </Layout>
        </>
    );
}
