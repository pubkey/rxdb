import React, { useState, useRef } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import isInternalUrl from '@docusaurus/isInternalUrl';
import { isRegexpStringMatch } from '@docusaurus/theme-common';
import IconExternalLink from '@theme/Icon/ExternalLink';
import { triggerTrackingEvent } from '../../components/trigger-event';
import { NavbarDropdown } from '../../components/navbar-dropdowns'


export default function NavbarNavLink({
  activeBasePath,
  activeBaseRegex,
  to,
  href,
  label,
  html,
  isDropdownLink,
  prependBaseUrlToHref,
  ...props
}) {
  const toUrl = useBaseUrl(to);
  const activeBaseUrl = useBaseUrl(activeBasePath);
  const normalizedHref = useBaseUrl(href, { forcePrependBaseUrl: true });
  const isExternalLink = label && href && !isInternalUrl(href);

  const linkContentProps = html
    ? { dangerouslySetInnerHTML: { __html: html } }
    : {
      children: (
        <>
          {label}
          {isExternalLink && (
            <IconExternalLink
              {...(isDropdownLink && { width: 12, height: 12 })}
            />
          )}
        </>
      ),
    };

  // ---------- NEW WRAPPER WHEN USING DROPDOWN ----------
  const LinkElement = (
    href ? (
      <Link
        onClick={() => {
          triggerTrackingEvent('navbar_click', 0.1);
          triggerTrackingEvent('navbar_click_' + label.toLowerCase(), 0.2);
        }}
        href={prependBaseUrlToHref ? normalizedHref : href}
        {...props}
        {...linkContentProps}
      />
    ) : (
      <Link
        to={toUrl}
        isNavLink
        {...((activeBasePath || activeBaseRegex) && {
          isActive: (_match, location) =>
            activeBaseRegex
              ? isRegexpStringMatch(activeBaseRegex, location.pathname)
              : location.pathname.startsWith(activeBaseUrl),
        })}
        {...props}
        {...linkContentProps}
      />
    )
  );

  if (props.dropdown) {
    const [open, setOpen] = useState(false);
    const hideTimer = useRef(null);

    const handleMouseEnter = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setOpen(true);
    };

    const handleMouseLeave = () => {
      hideTimer.current = setTimeout(() => {
        setOpen(false);
      }, 200);
    };

    return (
      <div
        className="dropdown-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {LinkElement}

        {open && (
          <NavbarDropdown which={props.dropdown} />
        )}
      </div>
    );
  }


  return LinkElement;
}
