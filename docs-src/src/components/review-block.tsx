import Slider from 'react-slick';
import { IconQuoteEnd, IconQuoteStart } from './icons/quote';
import { NextArrow, PrevArrow, sliderSettings } from './video-section';


export const REVIEW_ITEMS: {
    label: string;
    description: string;
    location: string;
    href: string;
    target: '_blank';
    logo: string;
    logoStyle: 'slider-logo-black ' | 'slider-logo-white ';
}[] = [
        {
            label: 'Readwise',
            location: 'USA',
            description: 'We use RxDB because it works across multiple platforms and we need to store of a great deal of data, some users have tens of thousands of documents! RxDB was the only cross-platform, offline-first solution with good enough performance to meet our needs.',
            href: 'https://readwise.io/',
            target: '_blank',
            logo: '/files/companies/readwise.svg',
            logoStyle: 'slider-logo-black '
        },
        {
            label: 'SafeEx',
            location: 'Denmark',
            description: 'We use RxDB for our offline-first inspection software. It ensures accurate data even under poor connectivity, while its single interface for multiple databases streamlines development. RxDB\'s flexibility also supports easy expansion to more platforms and environments.',
            href: 'https://safeex.com/',
            target: '_blank',
            logo: '/files/companies/safeex.svg',
            logoStyle: 'slider-logo-white '
        },
        {
            label: 'WebWare',
            location: 'Italy',
            description: 'We use RxDB in our global offline-first app for technicians. Its robust features and total control ensure reliable performance, even with poor connectivity, resulting in a seamless maintenance solution.',
            href: 'https://webware.dev/',
            target: '_blank',
            logo: '/files/companies/webware.svg',
            logoStyle: 'slider-logo-black '
        },
        {
            label: 'myAgro',
            location: 'Africa',
            description: 'We rely on RxDB to manage all our data in one place. Our custom store became unwieldy, so we switched to RxDB for schema migrations, real-time replication, conflict resolution, and reactive programming. Its push and pull handlers also integrate smoothly with our existing APIs.',
            href: 'https://myagro.org/',
            target: '_blank',
            logo: '/files/companies/myagro.svg',
            logoStyle: 'slider-logo-black ',
        },
        {
            label: 'MoreApp',
            location: 'Germany',
            description: `We provide a mobile app that is used by people in the
        field to fill in valuable information like inspections,
        surveys and audits. Our users don't always have access to the internet, building from an Offline-first approach with RxDB allows us to have the data integrity we need without being online.`,
            href: 'https://moreapp.com/',
            target: '_blank',
            logo: '/files/companies/moreapp.png',
            logoStyle: 'slider-logo-black ',
        },
        {
            label: 'ALTGRAS',
            location: 'Guinea',
            description: `We use RxDB to create applications capable of being
        used in the most remote areas where Internet access is
        really a challenge.`,
            href: 'https://altgras.com/',
            target: '_blank',
            logo: '/files/companies/altgras.png',
            logoStyle: 'slider-logo-white ',
        },
        {
            label: 'WooCommerce POS',
            location: 'Australia',
            description: `We use RxDB to provide an offline first, cross platform
        point of sale system. With RxDB we could create a web-, desktop- and mobile app using the same code base.`,
            href: 'https://wcpos.com/',
            target: '_blank',
            logo: '/files/companies/woopos.png',
            logoStyle: 'slider-logo-black ',
        },
        {
            label: 'atroo GmbH',
            location: 'Germany',
            description: `RxDB is a main component in building offline-ready
        multichannel apps. It has become our default stack for
        this kind of apps.`,
            href: 'https://atroo.de/',
            target: '_blank',
            logo: '/files/companies/atroo.png',
            logoStyle: 'slider-logo-black ',
        },
        {
            label: 'Nutrien',
            location: 'Canada',
            description: 'With RxDB we have built an offline capable Progressive Web Application that is used by our borer operators to report on conditions at the mineface.',
            href: 'https://nutrien.com/',
            target: '_blank',
            logo: '/files/companies/nutrien.svg',
            logoStyle: 'slider-logo-white ',
        },
        // {
        //     label: "Mapgl Grafana plugins",
        //     description: `"We use RxDB to store clients network topology modifications made with our map plugin visual editor"`,
        //     href: "https://raw.githubusercontent.com/vaduga/mapgl-community/",
        //     logo: "https://raw.githubusercontent.com/vaduga/mapgl-community/main/src/img/logo.png",
        //     logoStyle: 'slider-logo-black ',
        // },
    ];



export function ReviewsBlock() {

    return (
        <>
            <Slider {...sliderSettings}>
                {REVIEW_ITEMS.map((item) => (
                    <div className="slider-content" key={item.label}>
                        <IconQuoteStart />
                        <p style={{
                            fontSize: 14,
                            fontStyle: 'normal',
                            fontWeight: 500,
                            lineHeight: '21px',
                            marginBottom: 0
                        }}>{item.description}</p>
                        <IconQuoteEnd style={{ textAlign: 'right' }} />
                        <div className="slider-profile">
                            <img
                                className={item.logoStyle}
                                src={item.logo}
                                loading="lazy"
                                alt="logo"
                            />
                            <div className="slider-info">
                                <span className="developer"><b>{item.label}</b> ({item.location})</span>
                                {/* <span className="company-link"                                >
                                    {new URL(item.href).hostname}
                                </span> */}
                                {/* <a
                                    href={item.href}
                                    rel='nofollow noopener'
                                    target={item.target ? '_blank' : '_self'}
                                    className="company-link"
                                >
                                    {item.href}
                                </a> */}
                            </div>
                        </div>
                    </div>
                ))}
            </Slider>
        </>
    );
}
