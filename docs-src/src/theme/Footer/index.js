import React from 'react';
import Footer from '@theme-original/Footer';
import SlButton from '@shoelace-style/shoelace/dist/react/button';

export default function FooterWrapper(props) {

  const footerConfig = {
    navLinks: [
      {
        label: 'Pricing',
        href: '/premium'
      },
      {
        href: '/consulting',
        label: 'Consulting',
      },
      {
        label: 'Documentation',
        href: '/quickstart.html',
      },
      {
        label: 'Discord',
        target: '_blank',
        href: '/chat',
      },
      {
        label: 'Github',
        target: '_blank',
        href: '/code',
      },
      {
        label: 'Twitter',
        href: 'https://twitter.com/intent/user?screen_name=rxdbjs',
        target: '_blank',
      },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/company/rxdb',
        target: '_blank',
      }
    ],
    communityLinks: [
      {
        label: 'Discord',
        target: '_blank',
        href: '/chat',
        logo: '/img/community-links/discord-logo.svg',
      },
      {
        label: 'Github',
        target: '_blank',
        href: '/code',
        logo: '/img/community-links/github-logo.svg',
      },
      {
        label: 'Twitter',
        href: 'https://twitter.com/intent/user?screen_name=rxdbjs',
        target: '_blank',
        logo: '/img/community-links/x-logo.svg',
      },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/company/rxdb',
        target: '_blank',
        logo: '/img/community-links/linkedin-logo.svg',
      },
      {
        label: 'Stack Overflow',
        href: 'https://stackoverflow.com/questions/tagged/rxdb',
        target: '_blank',
        logo: '/img/community-links/stack-overflow-logo.svg',
      },
    ],
    policyLinks: [
      {
        label: 'Legal Notice',
        target: '_blank',
        href: '/legal-notice',
      },
    ],
  };

  const rightsText = `© ${new Date().getFullYear()} RxDB. All rights reserved.`;
  return (
    <>
      {/* <Footer {...props} /> */}
      <>
        <div className='block footer'>

          <div className="footer-block">
            <div className="footer-links">
              <span>
                <SlButton
                  variant="text"
                  href="/"
                  className="footer-logo-button"
                >
                  <img src="/files/logo/logo.svg" alt="RxDB" />
                  RxDB
                </SlButton>
                <div className="footer-community-links">
                  {footerConfig.communityLinks.map((link, index) => (
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
                {footerConfig.navLinks.map((link, index) => (
                  <a
                    variant="text"
                    href={link.href}
                    target={link.target ? '_blank' : '_self'}
                    key={link.href + index}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="footer-policy">
              <div>
                {footerConfig.policyLinks.map((link, index) => (
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
              src="/img/footer-column.svg"
              alt="columns"
            />
          </div>
        </div>
      </>
    </>
  );
}
