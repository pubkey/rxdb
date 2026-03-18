import React, { ReactNode } from 'react';
import { IconExperiment } from './icons/experiment';

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
                <IconExperiment />
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
