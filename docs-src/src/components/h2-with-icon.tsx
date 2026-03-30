import React from 'react';

/**
 * A generic component to wrap an H2 text with an icon on the left.
 * Must be used inside a markdown `## ` heading so that it appears in the Docusaurus Table of Contents.
 *
 * @example
 * ## <H2WithIcon icon={<IconSomething />}>My Heading Text</H2WithIcon>
 */
export function H2WithIcon({ children, icon, subtitle }: { children: React.ReactNode; icon?: React.ReactNode; subtitle?: React.ReactNode; }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'bottom' }}>
            {icon && (
                <span style={{ width: '35px', height: '35px', marginRight: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
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
