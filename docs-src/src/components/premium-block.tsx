import React, { ReactNode } from 'react';

function CrownIcon() {
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        width={16}
        height={16}
        viewBox="0 0 25 25"
        fill="none"
    >
        <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12.06 3.77c.13-.24.44-.33.68-.2.08.05.15.11.2.2l2.95 5.6a.992.992 0 0 0 1.52.29L21.69 6c.21-.17.53-.14.7.07.1.12.14.29.09.45l-2.83 10.25c-.12.43-.51.73-.96.73H6.31c-.45 0-.84-.3-.96-.73L2.52 6.52c-.07-.27.08-.54.35-.61.16-.04.32 0 .45.09L7.6 9.66a1.008 1.008 0 0 0 1.52-.29l2.95-5.61-.01.01ZM5.5 21.5h14M12.49 13h.01"
        />
    </svg>;
}

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
                <CrownIcon />
                <span>
                    This plugin is part of <a href="/premium/">RxDB Premium 👑</a>. It is not part of the default RxDB module.
                </span>
            </div>
            {props.children && <div style={{ marginTop: 6 }}>{props.children}</div>}
        </div>
    );
}
