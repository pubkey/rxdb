/**
 * Swizzled DocSidebarItem/Link component.
 * Adds support for rendering custom SVG icons via customProps.icon.
 *
 * Based on @docusaurus/theme-classic DocSidebarItem/Link.
 */
import React from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {isActiveSidebarItem} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import isInternalUrl from '@docusaurus/isInternalUrl';
import IconExternalLink from '@theme/Icon/ExternalLink';
import { SidebarIcon } from '../../../components/icons/sidebar-icon';

import styles from './styles.module.css';

function LinkLabel({label, icon}) {
  return (
    <span title={label} className={styles.linkLabel}>
      {icon && <SidebarIcon iconName={icon} />}
      {label}
    </span>
  );
}

export default function DocSidebarItemLink({
  item,
  onItemClick,
  activePath,
  level,
  _index,
  ...props
}) {
  const {href, label, className, autoAddBaseUrl, customProps} = item;
  const icon = customProps?.icon;
  const isActive = isActiveSidebarItem(item, activePath);
  const isInternalLink = isInternalUrl(href);
  return (
    <li
      className={clsx(
        ThemeClassNames.docs.docSidebarItemLink,
        ThemeClassNames.docs.docSidebarItemLinkLevel(level),
        'menu__list-item',
        className,
      )}
      key={label}>
      <Link
        className={clsx(
          'menu__link',
          !isInternalLink && styles.menuExternalLink,
          {
            'menu__link--active': isActive,
          },
        )}
        autoAddBaseUrl={autoAddBaseUrl}
        aria-current={isActive ? 'page' : undefined}
        to={href}
        {...(isInternalLink && {
          onClick: onItemClick ? () => onItemClick(item) : undefined,
        })}
        {...props}>
        <LinkLabel label={label} icon={icon} />
        {!isInternalLink && <IconExternalLink />}
      </Link>
    </li>
  );
}
