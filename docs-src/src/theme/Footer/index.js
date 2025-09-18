import React from 'react';
import { IconNewsletter } from '../../components/icons/newsletter';
import { IconGithub } from '../../components/icons/github';
import { IconTwitter } from '../../components/icons/twitter';
import { IconDiscord } from '../../components/icons/discord';
import { IconLinkedIn } from '../../components/icons/linkedin';

export default function FooterWrapper() {

  const footerConfig = {
    navLinks: [
      {
        label: 'Docs',
        href: '/overview.html'
      },
      {
        href: '/replication.html',
        label: 'Sync',
      },
      {
        href: '/rx-storage.html',
        label: 'Storages',
      },
      {
        label: 'Premium',
        target: '_blank',
        href: '/premium/',
      },
      {
        label: 'Support',
        target: '_blank',
        href: '/consulting/',
      }
    ],
    communityLinks: [
      {
        label: 'Newsletter',
        target: '_blank',
        href: '/chat/',
        logo: <IconNewsletter />,
      },
      {
        label: 'Twitter',
        href: 'https://twitter.com/intent/user?screen_name=rxdbjs',
        target: '_blank',
        logo: <IconTwitter />,
      },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/company/rxdb',
        target: '_blank',
        logo: <IconLinkedIn />,
      },
      {
        label: 'Github',
        target: '_blank',
        href: '/code/',
        logo: <span className="navbar-icon-github" style={{width: 22, height: 22, display: 'inline-block'}}></span>
      },
      {
        label: 'Discord',
        target: '_blank',
        href: '/chat/',
        logo: <span className="navbar-icon-discord" style={{width: 22, height: 22, display: 'inline-block'}}></span>,
      },
    ],
    policyLinks: [
      {
        label: 'Our Customers',
        target: '_blank',
        href: '/legal-notice/',
      },
      {
        label: 'About us',
        target: '_blank',
        href: '/legal-notice/',
      },
      {
        label: 'Legal Notice',
        target: '_blank',
        href: '/legal-notice/',
      },
    ],
  };

  const rightsText = `© ${new Date().getFullYear()} RxDB. All rights reserved.`;
  return (
    <>
      {/* <Footer {...props} /> */}
      <>

        <div className='block footer dark'>
          <div className="content" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 44
          }}>
            <div className="half left">
              <span>
                <a
                  variant="text"
                  href="/"
                  className="footer-logo-button"
                >
                  <img src="/files/logo/logo_text_white.svg" alt="RxDB" loading="lazy" style={{ width: 100 }} />
                </a>
                <div className="footer-community-links">
                  {footerConfig.communityLinks.map((link, index) => (
                    <a
                      key={link.href + index}
                      variant="text"
                      href={link.href}
                      target={link.target ? '_blank' : ''}
                    >
                      {link.logo}
                    </a>
                  ))}
                </div>
              </span>

            </div>
            <div className="half right" style={{
              display: 'flex',
              flex: 1
            }}>



              <div className="footer-links">
                {footerConfig.navLinks.map((link, index) => (
                  <a
                    variant="text"
                    href={link.href}
                    target={link.target ? '_blank' : ''}
                    key={link.href + index}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="footer-links">
                {footerConfig.policyLinks.map((link, index) => (
                  <a
                    variant="text"
                    href={link.href}
                    key={link.href + index}
                    target={link.target ? '_blank' : ''}
                  >
                    {link.label}
                  </a>
                ))}
                {/* <span className="footer-rights">{rightsText}</span> */}
              </div>



            </div>
          </div>
        </div>
      </>
    </>
  );
}
