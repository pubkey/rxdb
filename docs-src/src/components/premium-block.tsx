import React, { ReactNode } from 'react';
import { IconPremium } from './icons/premium';

export function PremiumBlock(props: {
    /**
     * Optional additional content to display below the default text.
     */
    children?: ReactNode;
}) {
    return (
        <div
            style={{
                borderLeft: '3px solid #9370DB',
                padding: '10px 16px',
                borderRadius: '0 4px 4px 0',
                marginTop: 16,
                marginBottom: 16,
                fontSize: '0.9em',
                opacity: 0.9,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconPremium />
                <span>
                    This plugin is part of <a href="/premium/">RxDB Premium 👑</a>. It is not part of the default RxDB module.
                </span>
            </div>
            {props.children && <div style={{ marginTop: 6 }}>{props.children}</div>}
        </div>
    );
}
