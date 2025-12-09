import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect, useState } from 'react';

const FILE_EVENT_ID = 'consulting-link-clicked';

import { triggerTrackingEvent } from '../components/trigger-event';
import { IframeFormModal } from '../components/modal';
import { Button } from '../components/button';

export default function Consulting() {
    const { siteConfig } = useDocusaurusContext();
    useEffect(() => {
        (() => {
            triggerTrackingEvent(FILE_EVENT_ID, 2);
        })();
    });

    const [openForm, setOpenForm] = useState(false);
    const [openPartnerForm, setOpenPartnerForm] = useState(false);

    return (
        <>
            <Head>
                <body className="homepage consulting-page" />
                <link rel="canonical" href="/consulting/" />
            </Head>
            <Layout
                title={`${siteConfig.title}`}
                description="RxDB is a fast, local-first NoSQL-database for JavaScript Applications like Websites, hybrid Apps, Electron-Apps, Progressive Web Apps and Node.js"
            >
                <main>

                    <div className="block">
                        <div className="content">
                            <h2 style={{
                                textAlign: 'center'
                            }}>You've got <b>questions</b>?</h2>
                            <div className="inner">
                                <div className="half left" style={{}}>
                                    <p className='centered-mobile-p'>
                                        The RxDB core maintainer has the answers.
                                        Schedule a compact consultancy session for quick fixes and
                                        suggestions on how you should use RxDB or related technologies.
                                    </p>
                                    <p style={{
                                        fontSize: 20,
                                        fontWeight: 700
                                    }}>180€ / 1 hour session</p>
                                    <div className="text-center-mobile" style={{
                                    }}>
                                        <Button
                                            primary
                                            style={{
                                            }}
                                            href='https://buy.stripe.com/14kdU1dN05SAfMA4gg'
                                            target='_blank'

                                        >Schedule a call</Button>
                                    </div>
                                </div>
                                <div
                                    className="half right justify-center-mobile grid-2-mobile grid-3"
                                >
                                    <div style={{
                                        width: 330,
                                        marginLeft: 'auto',
                                        marginRight: 'auto',
                                        marginTop: 22,
                                        marginBottom: 60
                                    }}>
                                        <div>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="176" height="176" viewBox="0 0 176 176" fill="none">
                                                <path d="M15.9335 122.733C17.1098 125.7 17.3717 128.951 16.6855 132.069L8.16553 158.388C7.891 159.723 7.96198 161.106 8.37173 162.406C8.78148 163.705 9.51642 164.879 10.5068 165.815C11.4973 166.751 12.7104 167.418 14.0311 167.754C15.3518 168.089 16.7364 168.082 18.0535 167.732L45.3572 159.748C48.299 159.165 51.3454 159.42 54.1492 160.484C71.2321 168.462 90.5838 170.15 108.79 165.25C126.996 160.35 142.887 149.178 153.658 133.704C164.429 118.229 169.389 99.4481 167.663 80.6734C165.936 61.8987 157.634 44.337 144.221 31.0869C130.808 17.8369 113.146 9.74985 94.3519 8.25272C75.5575 6.7556 56.8382 11.9446 41.4968 22.9041C26.1554 33.8637 15.1777 49.8896 10.5007 68.1542C5.82359 86.4188 7.74768 105.748 15.9335 122.733Z" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
                                                <path d="M64.7188 63.9966C66.5996 58.65 70.3119 54.1416 75.1983 51.2698C80.0847 48.398 85.8298 47.3483 91.416 48.3064C97.0022 49.2646 102.069 52.1689 105.719 56.5049C109.369 60.8409 111.367 66.3288 111.358 71.9966C111.358 87.9964 87.3586 95.9964 87.3586 95.9964" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
                                                <path d="M87.998 127.995H88.078" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </div>
                                        <div style={{
                                            position: 'absolute',
                                            marginLeft: 191,
                                            marginTop: -90
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="132" height="132" viewBox="0 0 132 132" fill="none">
                                                <path d="M53.9979 47.9966L35.998 65.9964L53.9979 83.9963" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
                                                <path d="M77.998 83.9963L95.9979 65.9964L77.998 47.9966" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
                                                <path d="M120.049 92.0495C119.167 94.275 118.97 96.7135 119.485 99.0515L125.875 118.791C126.081 119.792 126.028 120.829 125.72 121.804C125.413 122.779 124.862 123.659 124.119 124.361C123.376 125.063 122.466 125.563 121.476 125.815C120.485 126.067 119.447 126.061 118.459 125.799L97.9811 119.811C95.7748 119.374 93.49 119.565 91.3871 120.363C78.5749 126.347 64.0611 127.612 50.4065 123.938C36.7519 120.263 24.834 111.883 16.7555 100.278C8.67699 88.672 4.95705 74.5861 6.252 60.505C7.54694 46.424 13.7735 33.2528 23.8332 23.3152C33.893 13.3776 47.1393 7.31238 61.2351 6.18954C75.3309 5.0667 89.3703 8.95843 100.876 17.1781C112.382 25.3978 120.616 37.4172 124.124 51.1156C127.631 64.8141 126.188 79.3113 120.049 92.0495Z" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="block dark">
                        <div className="content">
                            <h2 style={{
                                textAlign: 'center'
                            }}>Need someone that <b>builds for you</b>?</h2>
                            <div className="inner">
                                <div className="half left" style={{}}>
                                    <p className='centered-mobile-p margin-top-125-0'>
                                        Our trusted partners handle the full
                                        development and implementation
                                        of your local JavaScript database solution. You can relax while they
                                        bring your vision to life.
                                    </p>
                                    <div className="text-center-mobile" style={{
                                    }}>
                                        <Button primary onClick={() => {
                                            setOpenForm(true);
                                            triggerTrackingEvent('consulting_form_open', 0.4);
                                        }}>Get started</Button>
                                    </div>
                                </div>
                                <div
                                    className="half right justify-center-mobile grid-2-mobile grid-3 centered-mobile-p"
                                >
                                    {
                                        [
                                            {
                                                title: 'Share your project',
                                                text: 'Tell us what you\'re aiming to achieve and what technical details matter most, so we can get a clear picture of your requirements.'
                                            },
                                            {
                                                title: 'Get paired',
                                                text: 'We\'ll match you with a reliable RxDB expert or partner whose skills fit your project\'s needs.'
                                            },
                                            {
                                                title: 'Build and collaborate',
                                                text: 'Your partner will team up with you to create, refine, and deliver the solution you’re looking for.'
                                            }
                                        ].map((row, i) => {
                                            return <>
                                                <div style={{
                                                    backgroundColor: '#20293C',
                                                    padding: '16px 16px 16px 0px',
                                                    width: '100%',
                                                    display: 'flex'
                                                }}>
                                                    <div style={{
                                                        borderStyle: 'solid',
                                                        borderWidth: 4,
                                                        borderRadius: 10,
                                                        borderColor: 'white',
                                                        textAlign: 'center',
                                                        width: 60,
                                                        height: 60,
                                                        boxSizing: 'initial',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        flexDirection: 'column',
                                                        fontSize: 30,
                                                        fontWeight: 800,
                                                        float: 'left',
                                                        margin: 32
                                                    }}>{i + 1}</div>
                                                    <div style={{
                                                        width: 436,
                                                        float: 'right',
                                                        marginTop: 10
                                                    }}>
                                                        <div style={{
                                                            fontSize: 16,
                                                            fontStyle: 'normal',
                                                            fontWeight: 700,
                                                            lineHeight: '25px',
                                                            textAlign: 'left'
                                                        }}>{row.title}</div><br />
                                                        <div style={{
                                                            fontSize: 14,
                                                            fontStyle: 'normal',
                                                            fontWeight: 500,
                                                            lineHeight: '21px',
                                                            textAlign: 'left'
                                                        }}>{row.text}</div>
                                                    </div>
                                                    <div className='clear'></div>
                                                </div>
                                                <div style={{
                                                    width: '100%',
                                                    textAlign: 'center'
                                                }}>
                                                    {
                                                        i !== 2 ? <div style={{
                                                            width: 4,
                                                            height: 24,
                                                            backgroundColor: 'var(--color-top)',
                                                            margin: '0 auto'
                                                        }}></div> : <div style={{
                                                            width: 4,
                                                            height: 68,
                                                            margin: '0 auto',
                                                            background: `repeating-linear-gradient(
                                                                to bottom,
                                                                var(--color-top) 0 8px,     /* short dot */
                                                                transparent 8px 16px,
                                                                var(--color-top) 16px 28px, /* long dot */
                                                                transparent 28px 36px
                                                              )`,
                                                            maskImage: `linear-gradient(
                                                                to bottom,
                                                                rgba(0,0,0,1) 60%,
                                                                rgba(0,0,0,0) 100%
                                                              )`
                                                        }}>
                                                        </div>
                                                    }
                                                </div>
                                            </>;
                                        })
                                    }
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="block centered" style={{
                        paddingBottom: 124
                    }}>
                        <div className="content">
                            <h2 style={{
                                textAlign: 'center'
                            }}><b>Become</b> a Partner?</h2>
                            <div className="inner centered" style={{
                                flexDirection: 'column'
                            }}>
                                <p className='centered-mobile-p'>
                                    Become part of our partner network for freelance developers and agencies. Get in touch with clients seeking skilled experts to build their apps based on RxDB.
                                </p>
                                <Button primary onClick={() => {
                                    setOpenPartnerForm(true);
                                    triggerTrackingEvent('consulting_form_open', 0.4);
                                }}>Apply as a partner</Button>
                            </div>
                        </div>
                    </div>

                    <IframeFormModal
                        iframeUrl='https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F'
                        open={openForm}
                        onClose={() => setOpenForm(false)}
                    />
                    <IframeFormModal
                        iframeUrl='https://webforms.pipedrive.com/f/6Nat9OkpDOaCdE5GC1wVp9GrJxaMLIwosu7wrdf9CnVDq5kEgtbmf4hTGeZVUd7bVx'
                        open={openPartnerForm}
                        onClose={() => setOpenPartnerForm(false)}
                    />

                    {/* <div className="block packages centered" id="packages">
                        <PackagesBlock
                            onOpenDialog={handleOpenDialog}
                        ></PackagesBlock>
                    </div>

                    <div className="block first centered dark">
                        <HeroBlock onOpenDialog={handleOpenDialog}></HeroBlock>
                    </div>


                    <div className="block benefits centered" id="benefits">
                        <BenefitsBlock></BenefitsBlock>
                    </div>

                    <div className="block steps centered" id="steps">
                        <StepsBlock
                            onOpenDialog={handleOpenDialog}
                        ></StepsBlock>
                    </div>

                    <div className="block review" id="reviews">
                        <div className="content">
                            <div className="inner centered">
                                <h2>Our success stories</h2>
                                <h3>
                                    Hear what our clients have to say about
                                    their experiences working with RxDB. Get to
                                    know real-world examples of how we've helped
                                    businesses like yours achieve their goals
                                    and exceed expectations.
                                </h3>
                            </div>
                        </div>
                        <ReviewsBlock></ReviewsBlock>
                    </div>

                    <div className="block faq centered" id="faq">
                        <FaqBlock></FaqBlock>
                    </div>

                    <div className="block next centered" id="next">
                        <NextBlock onOpenDialog={handleOpenDialog}></NextBlock>
                    </div>

                    <div className="block contact centered" id="contact">
                        <ContactBlock></ContactBlock>
                    </div>

                    <FormDialog open={open} onClose={handleClose} /> */}
                </main>
            </Layout>
        </>
    );
}
