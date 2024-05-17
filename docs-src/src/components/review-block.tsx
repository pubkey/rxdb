import Slider from 'react-slick';

export function ReviewsBlock() {
    const slickSettings = {
        dots: true,
        centerMode: true,
        centerPadding: '180px',
        infinite: true,
        arrows: false,
        adaptiveHeight: true,
        speed: 500,
        slidesToShow: 3,
        slidesToScroll: 1,
        initialSlide: 0,
        responsive: [
            {
                breakpoint: 1460,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true,
                    centerPadding: '180px',
                },
            },
            {
                breakpoint: 1124,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true,
                    centerPadding: '100px',
                },
            },
            {
                breakpoint: 900,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true,
                    centerPadding: '40px',
                },
            },
            {
                breakpoint: 690,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true,
                    centerMode: false,
                    centerPadding: '0px',
                },
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    infinite: false,
                    dots: true,
                    swipeToSlide: true,
                    centerMode: false,
                    centerPadding: '0px',
                },
            },
        ],
    };

    const reviewItems = [
        {
            label: 'Readwise, USA',
            description: 'We use RxDB because it works across multiple platforms and we need to store of a great deal of data, some users have tens of thousands of documents! RxDB was the only cross-platform, offline-first solution with good enough performance to meet our needs.',
            href: 'https://readwise.io/',
            target: '_blank',
            logo: '/files/companies/readwise.svg',
            logoStyle: 'slider-logo-black lazyload'
        },
        {
            label: 'myAgro, Africa',
            description: 'Transitioning to RxDB was a breath of fresh air due to its comprehensive features, including schema migration, real-time replication, conflict resolution, and reactive programming.',
            href: 'https://www.myagro.org/',
            target: '_blank',
            logo: '/files/companies/myagro.svg',
            logoStyle: 'slider-logo-black lazyload',
        },
        {
            label: 'MoreApp, Germany',
            description: `We provide a mobile app that is used by people in the
            field to fill in valuable information like inspections,
            surveys and audits.`,
            href: 'https://moreapp.com/',
            target: '_blank',
            logo: '/files/companies/moreapp.png',
            logoStyle: 'slider-logo-black lazyload',
        },
        {
            label: 'ALTGRAS, Africa',
            description: `We use RxDB to create applications capable of being
            used in the most remote areas where Internet access is
            really a challenge.`,
            href: 'https://altgras.com/',
            target: '_blank',
            logo: '/files/companies/altgras.png',
            logoStyle: 'slider-logo-white lazyload',
        },
        {
            label: 'WooCommerce POS, Australia',
            description: `We use RxDB to provide an offline first, cross platform
            point of sale system. With RxDB we could create a web-, desktop- and mobile app using the same code base.`,
            href: 'https://wcpos.com/',
            target: '_blank',
            logo: '/files/companies/woopos.png',
            logoStyle: 'slider-logo-black lazyload',
        },
        {
            label: 'atroo GmbH, Germany',
            description: `RxDB is a main component in building offline-ready
            multichannel apps. It has become our default stack for
            this kind of apps.`,
            href: 'https://atroo.de/',
            target: '_blank',
            logo: '/files/companies/atroo.png',
            logoStyle: 'slider-logo-black lazyload',
        },
        {
            label: 'Nutrien, Canada',
            description: 'With RxDB we have built an offline capable Progressive Web Application that is used by our borer operators to report on conditions at the mineface.',
            href: 'https://www.nutrien.com/',
            target: '_blank',
            logo: '/files/companies/nutrien.svg',
            logoStyle: 'slider-logo-black lazyload',
        },
        // {
        //     label: "Mapgl Grafana plugins",
        //     description: `"We use RxDB to store clients network topology modifications made with our map plugin visual editor"`,
        //     href: "https://raw.githubusercontent.com/vaduga/mapgl-community/",
        //     logo: "https://raw.githubusercontent.com/vaduga/mapgl-community/main/src/img/logo.png",
        //     logoStyle: 'slider-logo-black lazyload',
        // },
    ];

    return (
        <>
            <Slider {...slickSettings}>
                {reviewItems.map((item) => (
                    <div className="slider-content" key={item.label}>
                        <img
                            src="/img/quote.svg"
                            className="review-img"
                            alt="quote"
                        />
                        <h3>{item.description}</h3>
                        <div className="slider-profile">
                            <img
                                className={item.logoStyle}
                                data-src={item.logo}
                                alt="logo"
                            />
                            <div className="slider-info">
                                <p className="developer">{item.label}</p>
                                <a
                                    href={item.href}
                                    target={item.target ? '_blank' : '_self'}
                                    className="company-link"
                                >
                                    {item.href}
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </Slider>
        </>
    );
}
