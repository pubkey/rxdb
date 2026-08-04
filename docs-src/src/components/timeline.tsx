import { ReactNode } from 'react';

export type TimelineEntry = {
    /**
     * Label on the left side of the timeline dot,
     * usually a year like "2012" or a version like "15.0.0".
     */
    label: ReactNode;
    content: ReactNode;
};

/**
 * Vertical timeline for history sections like "A Brief Timeline"
 * in the alternative articles or version histories.
 *
 * Two usage modes:
 *
 * 1. Wrap an existing markdown bullet list with bold labels.
 *    The list keeps normal markdown processing (links, inline
 *    code) and is styled purely via CSS (.rxdb-timeline in
 *    custom.css), so it works with the MDX component mapping:
 *
 * <Timeline>
 *
 * - **2012** - First published.
 * - **2017** - Version 1.0 released.
 *
 * </Timeline>
 *
 * 2. Pass items as data:
 *
 * <Timeline items={[
 *   { label: '2012', content: 'First published.' },
 *   { label: '2017', content: 'Version 1.0 released.' },
 * ]} />
 */
export function Timeline(props: {
    items?: TimelineEntry[];
    children?: ReactNode;
}) {
    if (!props.items) {
        return (
            <div className="rxdb-timeline" style={{ marginTop: 20, marginBottom: 20 }}>
                {props.children}
            </div>
        );
    }
    return (
        <div style={{ marginTop: 20, marginBottom: 20 }}>
            {props.items.map((item, index) => (
                <div key={index} style={styles.row}>
                    <div style={styles.left}>
                        <strong style={styles.label}>{item.label}</strong>
                    </div>
                    <div style={styles.indicator}>
                        <div style={styles.dot} />
                        {index < props.items.length - 1 && <div style={styles.line} />}
                    </div>
                    <div style={styles.content}>{item.content}</div>
                </div>
            ))}
        </div>
    );
}

const styles = {
    row: {
        display: 'flex',
        alignItems: 'stretch',
        minWidth: 0,
    },
    left: {
        width: 70,
        flexShrink: 0,
        textAlign: 'right',
        paddingRight: 12,
        paddingTop: 0,
    },
    label: {
        color: 'var(--color-top)',
    },
    indicator: {
        position: 'relative',
        width: 15,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    dot: {
        width: 11,
        height: 11,
        borderRadius: '50%',
        backgroundColor: 'var(--color-top)',
        marginTop: 6,
        flexShrink: 0,
    },
    line: {
        width: 1,
        flex: 1,
        backgroundColor: 'var(--color-top)',
        opacity: 0.4,
    },
    content: {
        flex: 1,
        minWidth: 0,
        overflowWrap: 'break-word',
        paddingLeft: 12,
        paddingBottom: 24,
    },
} as const;
