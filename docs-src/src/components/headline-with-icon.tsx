import React from 'react';

/**
 * A generic component to wrap a heading text with an icon on the left.
 * Must be used inside a markdown heading (`#`, `##`, `###`) so that it appears in the Docusaurus Table of Contents.
 *
 * @example
 * ## <HeadlineWithIcon h2 icon={<IconSomething />}>My Heading Text</HeadlineWithIcon>
 */
export function HeadlineWithIcon({ children, icon, subtitle, h1, h2, h3 }: { children: React.ReactNode; icon?: React.ReactNode; subtitle?: React.ReactNode; h1?: boolean; h2?: boolean; h3?: boolean; }) {
    let size = '35px';
    let marginRight = '20px';
    if (h1) {
        size = '40px';
    } else if (h3) {
        size = '30px';
        marginRight = '15px';
    }

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'bottom' }}>
            {icon && (
                <span style={{ width: size, height: size, marginRight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, {
                        style: { width: '100%', height: '100%' }
                    }) : icon}
                </span>
            )}
            <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ lineHeight: '1.2' }}>{children}</span>
                {subtitle && <span style={{ fontSize: '0.65em', opacity: 0.7, fontWeight: 'normal', lineHeight: '1.2', marginTop: '4px' }}>{subtitle}</span>}
            </span>
        </span>
    );
}
