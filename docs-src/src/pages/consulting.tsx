import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';

import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import React, { useEffect } from 'react';

import { Tabs } from 'antd';
import { Collapse } from 'antd';

const FILE_EVENT_ID = 'consulting-link-clicked';

import { ReviewsBlock } from '../components/review-block';
import { triggerTrackingEvent } from '../components/trigger-event';
import { Modal } from '../components/modal';

export default function Consulting() {
    const { siteConfig } = useDocusaurusContext();
    useEffect(() => {
        (() => {
            triggerTrackingEvent(FILE_EVENT_ID, 2);
        })();
    });

    // for dialog
    const [open, setOpen] = React.useState(false);
    const handleOpenDialog = () => {
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };

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
                    <div className="block first centered dark">
                        <HeroBlock onOpenDialog={handleOpenDialog}></HeroBlock>
                    </div>

                    <div className="block packages centered" id="packages">
                        <PackagesBlock
                            onOpenDialog={handleOpenDialog}
                        ></PackagesBlock>
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

                    <FormDialog open={open} onClose={handleClose} />
                </main>
            </Layout>
        </>
    );
}

// blocks
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NavBarBlock({ onOpenDialog }) {
    const items = [
        {
            to: '/consulting/#packages',
            label: 'Packages',
            position: 'left',
        },
        {
            to: '/consulting/#benefits',
            label: 'Benefits',
            position: 'left',
        },
        {
            to: '/consulting/#steps',
            label: 'How it works',
            position: 'left',
        },
        {
            to: '/consulting/#faq',
            label: 'FAQs',
            position: 'left',
        },
        {
            to: '/consulting/#contact',
            label: 'Contact us',
            position: 'left',
        },
    ];

    return (
        <>
            <nav className="navbar-home navbar--fixed-top">
                <div className="navbar__inner">
                    <div className="navbar-home-links">
                        <a className="nav-logo-consulting" href="/">
                            <img src="/files/logo/logo.svg" alt="RxDB" />
                            RxDB
                        </a>

                        <span className="navbar-home-links-mobile">
                            {items.map((item) => (
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

                    <a
                        className="nav-button"
                        onClick={onOpenDialog}
                        style={{ maxWidth: '123px' }}
                    >
                        Get started
                    </a>
                </div>
            </nav>
        </>
    );
}

function HeroBlock({ onOpenDialog }) {
    const title = 'Expert support for local database applications';
    const description = `We offer custom solutions to streamline your data
    management or revolutionize your local first project.
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
                        <a className="button" onClick={onOpenDialog}>
                            Get started
                        </a>
                        <a className="button-empty" href="/consulting/#steps">
                            See how it works
                        </a>
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
                        src="/img/hero.svg"
                        className="hero-img"
                        alt="rxdb-image"
                    />
                </div>
            </div>
            <div className="hero-bottom-group">
                <img src="/img/hero-group.svg" alt="columns" />
                <img src="/img/hero-group.svg" alt="columns" />
            </div>
            <div className="hero-bottom-group-mobile">
                <img src="/img/hero-group-mobile.svg" alt="columns" />
            </div>
        </>
    );
}

function PackagesBlock({ onOpenDialog }) {
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
            label: 'We build it for you',
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
                                <a
                                    onClick={() =>
                                        item.iframe ? onOpenDialog() : null
                                    }
                                    href={item.iframe ? null : item.href}
                                    target={
                                        item.target && !item.iframe
                                            ? '_blank'
                                            : '_self'
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
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function BenefitsBlock() {
    const title = 'How we help you';
    const description =
        'Any type of support is possible: from full development to only helping support or code review. We can do Custom RxDB features.';

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

    const items = [
        {
            key: '0',
            label: benefitsPanels[0].label,
            children: <BenefitTabPanel item={benefitsPanels[0]} />,
        },
        {
            key: '1',
            label: benefitsPanels[1].label,
            children: <BenefitTabPanel item={benefitsPanels[1]} />,
        },
        {
            key: '2',
            label: benefitsPanels[2].label,
            children: <BenefitTabPanel item={benefitsPanels[2]} />,
        },
        {
            key: '3',
            label: benefitsPanels[3].label,
            children: <BenefitTabPanel item={benefitsPanels[3]} />,
        },
    ];

    return (
        <>
            <div className="content centered">
                <div className="inner">
                    <h2>{title}</h2>
                    <h3>{description}</h3>
                </div>

                <Tabs defaultActiveKey="1" items={items} />
            </div>
        </>
    );
}

function StepsBlock({ onOpenDialog }) {
    const title = 'How it works';
    const description =
        'Here you\'ll find an overview of the steps involved, offering insight into how we make the complex simple, from consultation to implementation.';

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
                    <a className="button desktop-img" onClick={onOpenDialog}>
                        Get started
                    </a>
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
                <a className="button mobile-button" onClick={onOpenDialog}>
                    Get started
                </a>
                <img
                    className="mobile-button"
                    src="/img/steps-column.svg"
                    alt="columns"
                />
            </div>
        </>
    );
}

function FaqBlock() {
    const title = 'FAQs';
    const description = `Have questions? We've got answers. Explore our FAQs to
    learn more about our services, pricing, and approach to
    local JavaScript database solutions.`;

    const items = [
        {
            key: '1',
            label: 'Which frameworks can you support ?',
            children: 'Everything from react to Vue to Angular to Svelte. We know all frameworks and how to use them efficiently with RxDB.',
        },
        {
            key: '2',
            label: 'Which platforms are supported?',
            children: 'We can build web-apps for browsers, hybrid apps and progressive web apps. Even server-side RxDB projects can be realized.',
        },
        {
            key: '3',
            label: 'How much does it cost?',
            children: `This depends on:
            - How much of the work is provided by us
            - Which type of development support do you need
            - How much of the development will be done by yourside\n
            We can offer in-house developers, near-shore and off-shore developers.`,
        },
        {
            key: '4',
            label: 'Do you provide 24/7 emergency support?',
            children: 'No, sorry. This is not provided by default but we can figure out a way with you that fits your problems.',
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
                    <Collapse
                        className="faq-collapse"
                        items={items}
                        bordered={false}
                        expandIcon={({ isActive }) => (
                            <ArrowDownwardIcon rotate={isActive ? 90 : 0} />
                        )}
                    />
                </div>
            </div>
        </>
    );
}

function NextBlock({ onOpenDialog }) {
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
                    <a className="button " onClick={onOpenDialog}>
                        Get started
                    </a>
                </div>
            </div>
            <img src="/img/next-column.svg" alt="columns" />
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
                    <BrowserOnly>
                        {() => {
                            return (
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
                            );
                        }}
                    </BrowserOnly>
                </div>
            </div>
        </>
    );
}

// components
function FormDialog({ onClose, open }) {
    const handleClose = () => {
        onClose();
    };
    return (
        <Modal
            className="modal-consulting-page"
            open={open}
            width={'auto'}
            onCancel={handleClose}
            footer={null}
        >
            <br />
            <br />
            <iframe
                style={{
                    width: '100%',
                    height: '70vh',
                    borderRadius: '32px',
                }}
                id="request-project-form"
                src="https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F"
            >
                Your browser doesn't support iframes,{' '}
                <a
                    href="https://webforms.pipedrive.com/f/6UUQvwSg3cy0wizvNdC3pmT378WEHYcwv6tdTlPNRl2HtVm0JjBbj5MQjqVj7ePW3F"
                    target="_blank"
                    rel="nofollow"
                >
                    Click here
                </a>
            </iframe>
        </Modal>
    );
}
function ArrowDownwardIcon({ rotate }) {
    const style = {
        transform: rotate ? 'rotate(180deg)' : '',
        transition: 'transform 150ms ease',
    };

    return (
        <div style={style}>
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
        </div>
    );
}
function BenefitTabPanel({ item }) {
    return (
        <div className="panel">
            <img
                src="/img/benefits-column.svg"
                className="desktop-img"
                alt="columns"
            />
            <div className="mobile-img">
                <img src="/img/benefits-column-mobile.svg" alt="columns" />
            </div>
            <div className="panel-content">
                <h3>{item.label}</h3>
                <h6>{item.text}</h6>
            </div>
        </div>
    );
}
