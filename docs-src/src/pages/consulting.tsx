import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import BrowserOnly from '@docusaurus/BrowserOnly';

import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import 'lazysizes';

import React, { useEffect, useRef } from 'react';

import { getDatabase, hasIndexedDB } from '../components/database';
const FILE_EVENT_ID = 'consulting-link-clicked';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import '@shoelace-style/shoelace/dist/themes/light.css';
import { ReviewsBlock } from '../components/review-block';

export default function Consulting() {
    const { siteConfig } = useDocusaurusContext();

    const isBrowser = useIsBrowser();
    useEffect(() => {
        if (!isBrowser || !hasIndexedDB()) {
            return;
        }

        (async () => {
            const database = await getDatabase();
            const flagDoc = await database.getLocal(FILE_EVENT_ID);
            if (flagDoc) {
                console.log('# already tracked ' + FILE_EVENT_ID);
            } else {
                window.trigger(FILE_EVENT_ID, 100);
                await database.upsertLocal(FILE_EVENT_ID, {});
            }
        })();
    });

    const dialogRef = useRef(null);

    function handleOpenDialog() {
        console.log('open');
        dialogRef.current.show();
    }
    // // to prevent close
    // function handleRequestClose(event) {
    //     if (event.detail.source === "overlay") {
    //         event.preventDefault();
    //     }
    // }

    return (
        <>
            <Head>
                <body className="homepage" />
            </Head>
            <Layout
                title={`${siteConfig.title}`}
                description="RxDB is a fast, local-first NoSQL-database for JavaScript Applications like Websites, hybrid Apps, Electron-Apps, Progressive Web Apps and Node.js"
            >
                <main className="consulting-page">
                    <BrowserOnly fallback={<div>Loading...</div>}>
                        {() => {
                            const SlDialog =
                                require('@shoelace-style/shoelace/dist/react/dialog').default;
                            const SlButton =
                                require('@shoelace-style/shoelace/dist/react/button').default;
                            const SlTabGroup =
                                require('@shoelace-style/shoelace/dist/react/tab-group').default;
                            const SlTab =
                                require('@shoelace-style/shoelace/dist/react/tab').default;
                            const SlTabPanel =
                                require('@shoelace-style/shoelace/dist/react/tab-panel').default;
                            const SlDetails =
                                require('@shoelace-style/shoelace/dist/react/details').default;

                            return (
                                <>
                                    <div className="block first centered dark">
                                        <HeroBlock
                                            onOpenDialog={handleOpenDialog}
                                            SlButton={SlButton}
                                        ></HeroBlock>
                                    </div>

                                    <div
                                        className="block packages centered"
                                        id="packages"
                                    >
                                        <PackagesBlock
                                            onOpenDialog={handleOpenDialog}
                                            SlButton={SlButton}
                                        ></PackagesBlock>
                                    </div>

                                    <div
                                        className="block benefits centered"
                                        id="benefits"
                                    >
                                        <BenefitsBlock
                                            SlTabGroup={SlTabGroup}
                                            SlTab={SlTab}
                                            SlTabPanel={SlTabPanel}
                                        ></BenefitsBlock>
                                    </div>

                                    <div
                                        className="block steps centered"
                                        id="steps"
                                    >
                                        <StepsBlock
                                            onOpenDialog={handleOpenDialog}
                                            SlButton={SlButton}
                                        ></StepsBlock>
                                    </div>

                                    <div className="block review" id="reviews">
                                        <div className="content">
                                            <div className="inner centered">
                                                <h2>Our success stories</h2>
                                                <h3>
                                                    Hear what our clients have to say about their
                                                    experiences working with RxDB. Get to know real-world
                                                    examples of how we've helped businesses like yours
                                                    achieve their goals and exceed expectations.
                                                </h3>
                                            </div>
                                        </div>
                                        <ReviewsBlock></ReviewsBlock>
                                    </div>

                                    <div
                                        className="block faq centered"
                                        id="faq"
                                    >
                                        <FaqBlock
                                            SlDetails={SlDetails}
                                        ></FaqBlock>
                                    </div>

                                    <div
                                        className="block next centered"
                                        id="next"
                                    >
                                        <NextBlock
                                            onOpenDialog={handleOpenDialog}
                                            SlButton={SlButton}
                                        ></NextBlock>
                                    </div>

                                    <div
                                        className="block contact centered"
                                        id="contact"
                                    >
                                        <ContactBlock></ContactBlock>
                                    </div>

                                    {/* <div className="block footer" id="footer">
                                        <FooterBlock
                                            SlButton={SlButton}
                                        ></FooterBlock>
                                    </div> */}
                                    <SlDialog noHeader ref={dialogRef}>
                                        <iframe
                                            style={{
                                                width: '100%',
                                                height: '70vh',
                                                borderRadius: '32px',
                                            }}
                                            id="request-project-form"
                                            src="https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F"
                                        >
                                            Your browser doesn't support
                                            iframes,{' '}
                                            <a
                                                href="https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F"
                                                target="_blank"
                                                rel="nofollow"
                                            >
                                                Click here
                                            </a>
                                        </iframe>
                                    </SlDialog>
                                </>
                            );
                        }}
                    </BrowserOnly>
                </main>
            </Layout>
        </>
    );
}

// blocks
function NavBarBlock({ onOpenDialog, SlButton }) {
    const items = [
        {
            to: '/consulting#packages',
            label: 'Packages',
            position: 'left',
        },
        {
            to: '/consulting#benefits',
            label: 'Benefits',
            position: 'left',
        },
        {
            to: '/consulting#steps',
            label: 'How it works',
            position: 'left',
        },
        {
            to: '/consulting#faq',
            label: 'FAQs',
            position: 'left',
        },
        {
            to: '/consulting#contact',
            label: 'Contact us',
            position: 'left',
        },
    ];

    return (
        <>
            <nav className="navbar-home navbar--fixed-top">
                <div className="navbar__inner">
                    <div className="navbar-home-links">
                        {/* <SlButton
                            variant="text"
                            href="/"
                            className="nav-logo-button"
                        >
                            <img src="./files/logo/logo.svg" alt="RxDB" />
                            RxDB
                        </SlButton> */}

                        <a className="nav-logo-consulting" href="/">
                            <img src="./files/logo/logo.svg" alt="RxDB" />
                            RxDB
                        </a>

                        <span className="navbar-home-links-mobile">
                            {items.map((item) => (
                                // <SlButton
                                //     href={item.to}
                                //     variant="text"
                                //     key={item.label}
                                // >
                                //     {item.label}
                                // </SlButton>

                                <a
                                    className="navbar-home-links-mobile consulting-nav-links"
                                    href={item.to}
                                    key={item.label}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </span>
                    </div>

                    <SlButton
                        onClick={onOpenDialog}
                        className="sl-button nav-button"
                        style={{ maxWidth: '123px' }}
                    >
                        Get started
                    </SlButton>
                </div>
            </nav>
        </>
    );
}

function HeroBlock({ onOpenDialog, SlButton }) {
    const title = 'Expert support for local database applications';
    const description = `We offer custom solutions to streamline your data
    management or revolutionize your project's backend.
    Our team is here to guide you at every step.`;

    return (
        <>
            <div className="content flex-row">
                <div className="half">
                    <h1>{title}</h1>
                    <h3>{description}</h3>

                    <div
                        className="flex-row hero-buttons"
                        style={{
                            alignItems: 'center',
                            gap: '16px',
                            marginTop: '40px',
                            marginBottom: '10px',
                        }}
                    >
                        {/* <a className="button" onClick={onOpenDialog}>
                                     Get started
                                </a>
                                <a className="button-empty" href="/consulting#steps">
                                See how it works
                                </a> */}
                        <SlButton onClick={onOpenDialog} className="sl-button">
                            Get started
                        </SlButton>
                        <SlButton
                            href="/consulting#steps"
                            className="sl-button sl-button-empty"
                        >
                            See how it works
                        </SlButton>
                    </div>
                </div>
                <div
                    className="half"
                    style={{
                        paddingTop: '42px',
                        paddingBottom: '42px',
                    }}
                >
                    <img
                        src="./img/hero.svg"
                        className="hero-img"
                        alt="rxdb-image"
                    />
                </div>
            </div>
            <div className="hero-bottom-group">
                <img src="./img/hero-group.svg" alt="columns" />
                <img src="./img/hero-group.svg" alt="columns" />
            </div>
            <div className="hero-bottom-group-mobile">
                <img src="./img/hero-group-mobile.svg" alt="columns" />
            </div>
        </>
    );
}

function PackagesBlock({ onOpenDialog, SlButton }) {
    const title = 'Our Service Packages';
    const description = `We offer tailored solutions to meet your needs. Whether
    you're looking to streamline your data management
    process or revolutionize your project's backend, our
    team is here to guide you every step of the way.`;

    const packageItems = [
        {
            index: '1',
            label: 'Quick Consulting Session',
            price: '180€',
            description:
                'Schedule a quick consultancy session where the RxDB core maintainer answers all your questions and gives suggestions on how you should use RxDB or related technologies.',
            cta: 'Schedule a call',
            href: 'https://buy.stripe.com/14kdU1dN05SAfMA4gg',
            target: '_blank',
            rel: '',
            iframe: false,
        },
        {
            index: '2',
            label: 'We build it with you',
            price: '',
            description: `Let our expert team handle the heavy lifting.
            With Package 2, we take full responsibility for
            building and implementing your local JavaScript
            database solution. Sit back, relax, and watch as
            we transform your vision into reality.`,
            cta: 'Get started',
            href: 'https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F',
            target: '_blank',
            rel: 'nofollow',
            iframe: true,
        },
        {
            index: '3',
            label: 'We build it with you',
            price: '',
            description:
                'Prefer a more hands-on approach? Package 3 allows you to collaborate closely with our team throughout the development process. Together, we\'ll fine-tune every aspect of your solution to ensure it aligns perfectly with your goals and requirements.',
            cta: 'Get started',
            href: 'https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F',
            target: '_blank',
            rel: 'nofollow',
            iframe: true,
        },
    ];

    return (
        <>
            <div className="content centered">
                <div className="inner">
                    <h2>{title}</h2>
                    <h3>{description}</h3>
                </div>
                <div
                    className="flex-row"
                    style={{
                        flexWrap: 'wrap',
                        alignItems: 'stretch',
                    }}
                >
                    {packageItems.map((item, index) => (
                        <div
                            key={item.label + index}
                            className={
                                index < 1
                                    ? 'item-package flex-row'
                                    : 'item-package flex-column'
                            }
                            style={{
                                // maxWidth: index > 0 ? "48.5%" : "unset",
                                height: 'auto',
                                border:
                                    index < 1 ? 'solid 1px #E6008D' : 'none',
                            }}
                        >
                            <div
                                className="flex-column"
                                style={{
                                    maxWidth: index < 1 ? '70%' : 'unset',
                                }}
                            >
                                <h6>Package {item.index}</h6>
                                <div
                                    className="flex-row"
                                    style={{
                                        alignItems: 'center',
                                        gap: '16px',
                                    }}
                                >
                                    <h4>{item.label}</h4>
                                    {item.price ? (
                                        <span className="item-label">
                                            Fixed {item.price} fee
                                        </span>
                                    ) : null}
                                </div>

                                <p>{item.description}</p>
                            </div>

                            <div
                                className="flex-row"
                                style={{
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: 'auto',
                                }}
                            >
                                <SlButton
                                    variant="text"
                                    href={item.iframe ? '' : item.href}
                                    target={item.target ? '_blank' : '_self'}
                                    onClick={() =>
                                        item.iframe ? onOpenDialog() : null
                                    }
                                >
                                    {item.cta}
                                    <svg
                                        width="17"
                                        height="17"
                                        viewBox="0 0 17 17"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M9.25 16.0781L7.64063 14.4844L12.4609 9.66406H0.75V7.33594H12.4609L7.64063 2.52344L9.25 0.921875L16.8281 8.5L9.25 16.0781Z"
                                            fill="#E6008D"
                                        />
                                    </svg>
                                </SlButton>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function BenefitsBlock({ SlTabGroup, SlTab, SlTabPanel }) {
    const title = 'How we help you';
    const description = 'Any type of support is possible: from full development to only helping support or code review. We can do Custom RxDB features.';

    const benefitsPanels = [
        {
            label: 'Expert Guidance',
            text: `We have years of experience with local first
            projects and can provide expert guidance. We
            can provide an optimal concept for the best
            solution for your specific use case.`,
            name: 'quidance',
        },
        {
            label: 'Development support',
            text: `Either you have your own team of developers
            or we can provide expert developers or we
            can have a mix where we provide some of the
            developers and the customer provides the
            others.`,
            name: 'support',
        },
        {
            label: 'Project review',
            text: `We can review your code and project and
            ensure that it uses best practices and has
            optimal performance. This can be done once
            before your big release or as an ongoing
            support.`,
            name: 'review',
        },
        {
            label: 'Tailored features',
            text: `We can developer tailored features for RxDB
            that are optimized for your specific use
            case.`,
            name: 'feature',
        },
    ];

    return (
        <>
            <div className="content centered">
                <div className="inner">
                    <h2>{title}</h2>
                    <h3>{description}</h3>
                </div>

                <SlTabGroup placement="start">
                    <SlTab slot="nav" panel="quidance">
                        Expert Guidance
                    </SlTab>
                    <SlTab slot="nav" panel="support">
                        Development support
                    </SlTab>
                    <SlTab slot="nav" panel="review">
                        Project review
                    </SlTab>
                    <SlTab slot="nav" panel="feature">
                        Tailored features
                    </SlTab>

                    {benefitsPanels.map((item) => (
                        <SlTabPanel name={item.name} key={item.label}>
                            <div className="panel">
                                <img
                                    src="./img/benefits-column.svg"
                                    className="desktop-img"
                                    alt="columns"
                                />
                                <div className="mobile-img">
                                    <img
                                        src="./img/benefits-column-mobile.svg"
                                        alt="columns"
                                    />
                                </div>
                                <div className="panel-content">
                                    <h3>{item.label}</h3>
                                    <h6>{item.text}</h6>
                                </div>
                            </div>
                        </SlTabPanel>
                    ))}
                </SlTabGroup>
            </div>
        </>
    );
}

function StepsBlock({ onOpenDialog, SlButton }) {
    const title = 'How it works';
    const description = 'Here you’ll find an overview of the steps involved, offering insight into how we make the complex simple, from consultation to implementation.';

    const stepsItems = [
        {
            label: 'Initial contact',
            text: `We talk about your needs and give suggestions
            for an optimal collaboration with us.`,
        },
        {
            label: 'Specification Design',
            text: 'We specify the collaboration between you and RxDB and define a roadmap.',
        },
        {
            label: 'Development',
            text: 'Realization of the roadmap.',
        },
        {
            label: 'Ongoing support',
            text: 'Regular project reviews and guidance when adding new features.',
        },
    ];
    return (
        <>
            <div className="content">
                <div className="inner">
                    <h2>{title}</h2>
                    <h3>{description}</h3>

                    <SlButton
                        className="sl-button desktop-img"
                        onClick={() => onOpenDialog()}
                    >
                        Get started
                    </SlButton>
                </div>
                <div className="steps-container">
                    {stepsItems.map((item, index) => (
                        <div className="step-item" key={item.label}>
                            <div className="step-line">
                                <span className="step-number">{index + 1}</span>
                                {index < stepsItems.length - 1 ? (
                                    <span className="step-number-line"></span>
                                ) : null}
                            </div>
                            <div className="step-content">
                                <h5>{item.label}</h5>
                                <p>{item.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <SlButton
                    className="sl-button mobile-button"
                    onClick={() => onOpenDialog()}
                >
                    Get started
                </SlButton>

                <img
                    className="mobile-button"
                    src="./img/steps-column.svg"
                    alt="columns"
                />
            </div>
        </>
    );
}

function FaqBlock({ SlDetails }) {
    const title = 'FAQs';
    const description = `Have questions? We've got answers. Explore our FAQs to
    learn more about our services, pricing, and approach to
    local JavaScript database solutions.`;

    const items = [
        {
            label: 'Which frameworks can you support ?',
            text: 'Everything from react to Vue to Angular to Svelte. We know all frameworks and how to use them efficiently with RxDB.',
        },
        {
            label: 'Which platforms are supported?',
            text: `We can build web-apps for browsers, hybrid apps and
            progressive web apps. Even server-side RxDB projects can
            be realized.`,
        },
        {
            label: 'How much does it cost?',
            text: `This depends on:
            - How much of the work is provided by us
            - Which type of development support do you need
            - How much of the development will be done by yourside\n
            We can offer in-house developers, near-shore and off-shore developers.`,
        },
        {
            label: 'Do you provide 24/7 emergency support?',
            text: 'No, sorry. This is not provided by default but we can figure out a way with you that fits your problems.',
        },
    ];

    return (
        <>
            <div className="content">
                <div className="inner">
                    <h2>{title}</h2>
                    <h3>{description}</h3>
                </div>

                <div className="faq-container">
                    {items.map((item) => (
                        <SlDetails summary={item.label} key={item.label}>
                            {item.text}
                            <span slot="expand-icon">
                                <svg
                                    width="18"
                                    height="11"
                                    viewBox="0 0 18 11"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M9.52831 9.88389C9.23541 10.1768 8.76061 10.1768 8.46771 9.88389L0.82123 2.23739C0.52834 1.94449 0.52834 1.46969 0.82123 1.17679L1.17479 0.823191C1.46768 0.530291 1.94255 0.530291 2.23545 0.823191L8.99801 7.58579L15.7606 0.823191C16.0535 0.530291 16.5283 0.530291 16.8212 0.823191L17.1748 1.17679C17.4677 1.46969 17.4677 1.94449 17.1748 2.23739L9.52831 9.88389Z"
                                        fill="#F6F6F7"
                                    />
                                </svg>
                            </span>
                            <span
                                slot="collapse-icon"
                                style={{
                                    transform: 'rotate(-90deg)',
                                }}
                            >
                                <svg
                                    width="18"
                                    height="10"
                                    viewBox="0 0 18 10"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M8.47169 0.616109C8.76459 0.323209 9.23939 0.323209 9.53229 0.616109L17.1788 8.26261C17.4717 8.55551 17.4717 9.03031 17.1788 9.32321L16.8252 9.67681C16.5323 9.96971 16.0574 9.96971 15.7645 9.67681L9.00199 2.91421L2.23939 9.67681C1.94649 9.96971 1.47169 9.96971 1.17879 9.67681L0.82519 9.32321C0.53229 9.03031 0.53229 8.55551 0.82519 8.26261L8.47169 0.616109Z"
                                        fill="#F6F6F7"
                                    />
                                </svg>
                            </span>
                        </SlDetails>
                    ))}
                </div>
            </div>
        </>
    );
}

function NextBlock({ onOpenDialog, SlButton }) {
    const title = 'Ready to take the next step?';
    const description = `Transform your project with RxDB. Schedule your
    consultancy session today and discover the power of
    local JavaScript database solutions.`;

    return (
        <>
            <div className="content">
                <div className="inner centered">
                    <h2>{title}</h2>
                    <h3>{description}</h3>

                    <SlButton
                        className="sl-button "
                        onClick={() => onOpenDialog()}
                    >
                        Get started
                    </SlButton>
                </div>
            </div>
            <img src="./img/next-column.svg" alt="columns" />
        </>
    );
}

function ContactBlock() {
    const title = 'Still have questions?';
    const description = `Get in touch with us today to schedule your
    consultancy session or discuss your project
    requirements. Fill out the form below, and a
    member of our team will be in contact with
    you shortly.`;

    return (
        <>
            <div className="content">
                <div className="iframe-form">
                    <div className="inner centered">
                        <h2>{title}</h2>
                        <h3>{description}</h3>
                    </div>
                    <iframe
                        style={{
                            width: '100%',
                            margin: '0 auto',
                            maxWidth: '708px',
                            borderRadius: '32px',
                        }}
                        src="https://webforms.pipedrive.com/f/6q8inTHyEUIvXxoWQGwymSc8VfEj3cUgikIf9IibvPWkJJYGI8gYEzXP89VJTwhdZx"
                    >
                        Your browser doesn't support iframes,{' '}
                        <a
                            href="https://webforms.pipedrive.com/f/6q8inTHyEUIvXxoWQGwymSc8VfEj3cUgikIf9IibvPWkJJYGI8gYEzXP89VJTwhdZx"
                            target="_blank"
                            rel="nofollow"
                        >
                            go here
                        </a>
                    </iframe>
                </div>
            </div>
        </>
    );
}

function FooterBlock({ SlButton }) {
    const navLinks = [
        {
            label: 'Packages',
            href: '/consulting#packages',
        },
        {
            label: 'Benefits',
            href: '/consulting#benefits',
        },
        {
            label: 'How it works',
            href: '/consulting#steps',
        },
        {
            label: 'FAQs',
            href: '/consulting#faq',
        },
        {
            label: 'Contact us',
            href: '/consulting#contact',
        },
    ];

    const communityLinks = [
        {
            label: 'Discord',
            target: '_blank',
            href: '/chat',
            logo: './img/community-links/discord-logo.svg',
        },
        {
            label: 'Github',
            target: '_blank',
            href: '/code',
            logo: './img/community-links/github-logo.svg',
        },
        {
            label: 'Twitter',
            href: 'https://twitter.com/intent/user?screen_name=rxdbjs',
            logo: './img/community-links/x-logo.svg',
        },
        {
            label: 'LinkedIn',
            href: 'https://www.linkedin.com/company/rxdb',
            logo: './img/community-links/linkedin-logo.svg',
        },
        {
            label: 'Stack Overflow',
            href: 'https://stackoverflow.com/questions/tagged/rxdb',
            logo: './img/community-links/stack-overflow-logo.svg',
        },
    ];

    const policyLinks = [
        // {
        //     label: 'Privacy Policy',
        //     target: '_blank',
        //     href: '/',
        // },
        // {
        //     label: 'Terms of Service',
        //     target: '_blank',
        //     href: '/',
        // },
        {
            label: 'Legal Notice',
            target: '_blank',
            href: '/legal-notice',
        },
    ];

    const rightsText = `© ${new Date().getFullYear()} RxDB. All rights reserved.`;

    return (
        <>
            <div className="footer-block">
                <div className="footer-links">
                    <span>
                        <SlButton
                            variant="text"
                            href="/"
                            className="footer-logo-button"
                        >
                            <img src="./files/logo/logo.svg" alt="RxDB" />
                            RxDB
                        </SlButton>
                        <div className="footer-community-links">
                            {communityLinks.map((link, index) => (
                                <SlButton
                                    key={link.href + index}
                                    variant="text"
                                    href={link.href}
                                    target={link.target ? '_blank' : '_self'}
                                >
                                    <img src={link.logo} alt="logo" />
                                </SlButton>
                            ))}
                        </div>
                    </span>
                    <div className="footer-nav-links">
                        {navLinks.map((link, index) => (
                            <SlButton
                                variant="text"
                                href={link.href}
                                key={link.href + index}
                            >
                                {link.label}
                            </SlButton>
                        ))}
                    </div>
                </div>

                <div className="footer-policy">
                    <div>
                        {policyLinks.map((link, index) => (
                            <SlButton
                                variant="text"
                                href={link.href}
                                key={link.href + index}
                                target={link.target ? '_blank' : '_self'}
                            >
                                {link.label}
                            </SlButton>
                        ))}
                    </div>
                    <span className="footer-rights">{rightsText}</span>
                </div>
                <img
                    className="footer-img desktop-img"
                    src="./img/footer-column.svg"
                    alt="columns"
                />
            </div>
        </>
    );
}

// components

// form (without iframe)
/*
function ContactBlock() {
    const title = "Still have questions?";
    const description = `Get in touch with us today to schedule your
    consultancy session or discuss your project
    requirements. Fill out the form below, and a
    member of our team will be in contact with
    you shortly.`;

    const [disableSubmit, setDisableSubmit] = useState(true);
    const [responseMessage, setResponseMessage] = useState("");

    function handleSubmit(e) {
        e.preventDefault();
        const data = new FormData(e.target);

        console.log(data.get("email"), "email");

        let response;

        if (!response) {
            setResponseMessage("Something went wrong. Try again later.");
        } else {
            setResponseMessage(
                "Your request has been successfully submitted, and it will be reviewed as soon as possible!"
            );
        }
    }

    return (
        <>
            <div className="content">
                <form onSubmit={(e) => handleSubmit(e)}>
                    {!responseMessage ? (
                        <>
                            <div className="inner centered">
                                <h2>{title}</h2>
                                <h3>{description}</h3>
                            </div>
                            <div className="contact-form">
                                <SlInput
                                    placeholder="Your name"
                                    name="name"
                                    type="text"
                                    required
                                ></SlInput>
                                <SlInput
                                    placeholder="Your email"
                                    name="email"
                                    type="email"
                                    required
                                ></SlInput>
                                <SlTextarea
                                    placeholder="Type your message..."
                                    name="message"
                                ></SlTextarea>
                                <SlCheckbox
                                    onSlChange={(e) => {
                                        setDisableSubmit(!e.target?.checked);
                                    }}
                                >
                                    I accept the <a>Terms</a>
                                </SlCheckbox>
                                <SlButton
                                    type="submit"
                                    className="sl-button"
                                    disabled={!disableSubmit ? false : true}
                                >
                                    Submit
                                </SlButton>
                            </div>
                        </>
                    ) : (
                        <Submission message={responseMessage} />
                    )}
                </form>
            </div>
        </>
    );
}
*/
// for the response (contact form submission)
// const Submission = ({ message }) => {
//     return (
//         <div>
//             <p>Thank you for your submission!</p>
//             <h3>{message}</h3>
//         </div>
//     );
// };
