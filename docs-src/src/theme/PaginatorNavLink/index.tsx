import React, { type ReactNode } from 'react';
// import clsx from 'clsx';
// import Link from '@docusaurus/Link';
import type { Props } from '@theme/PaginatorNavLink';
import { Button } from '@site/src/components/button';

export default function PaginatorNavLink(props: Props): ReactNode {
  const { permalink, title, isNext } = props;
  return <Button
    style={{
      textAlign: isNext ? 'right' : 'left',
      justifyContent: isNext ? 'right' : 'left',
      height: 'auto',
      paddingTop: 14,
      paddingBottom: 14
    }}
    href={permalink}
  ><span style={{
    fontSize: '80%',
    display: 'contents'
  }}>{isNext ? 'Next' : 'Previous'}</span><br />{isNext ? '' : '« '}{title}{isNext ? ' »' : ''}</Button>;
  // return (
  //   <Link
  //     className={clsx(
  //       'pagination-nav__link',
  //       isNext ? 'pagination-nav__link--next' : 'pagination-nav__link--prev',
  //     )}
  //     to={permalink}>
  //     {subLabel && <div className="pagination-nav__sublabel">{subLabel}</div>}
  //     <div className="pagination-nav__label">{title}</div>
  //   </Link>
  // );
}
