import React, { ReactNode } from 'react';

function ExperimentIcon() {
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M19.8 18.4 14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L4.2 18.4c-.49.66-.02 1.6.8 1.6h14c.82 0 1.29-.94.8-1.6z" />
    </svg>;
}

export function BetaBlock(props: {
    /**
     * The RxDB version since which this feature is available.
     * Example: "17.0.0"
     */
    since: string;
    /**
     * Optional additional content to display below the default text.
     */
    children?: ReactNode;
}) {
    return (
        <div
            style={{
                borderLeft: '4px solid #e6a700',
                backgroundColor: 'rgba(230, 167, 0, 0.1)',
                padding: '16px 20px',
                borderRadius: '0 4px 4px 0',
                marginTop: 20,
                marginBottom: 20,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
                <ExperimentIcon />
                <strong style={{ fontSize: '1.05em' }}>Beta Feature</strong>
                <span style={{ fontSize: '0.9em', opacity: 0.85 }}>
                    (available since version {props.since})
                </span>
            </div>
            <div style={{ fontSize: '0.95em' }}>
                This feature is in <strong>beta</strong> and may have breaking changes without a major RxDB version release.
                {props.children && <div style={{ marginTop: 8 }}>{props.children}</div>}
            </div>
        </div>
    );
}
