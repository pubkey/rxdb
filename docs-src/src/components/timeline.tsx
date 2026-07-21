import React, { ReactNode } from 'react';

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
 *    Each bullet must start with a bold label, an optional
 *    " - " separator follows. Links and inline code keep
 *    normal markdown processing:
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
    const items: TimelineEntry[] = props.items ?? parseMarkdownChildren(props.children);
    return (
        <div style={{ marginTop: 20, marginBottom: 20 }}>
            {items.map((item, index) => (
                <div key={index} style={styles.row}>
                    <div style={styles.left}>
                        <strong style={styles.label}>{item.label}</strong>
                    </div>
                    <div style={styles.indicator}>
                        <div style={styles.dot} />
                        {index < items.length - 1 && <div style={styles.line} />}
                    </div>
                    <div style={styles.content}>{item.content}</div>
                </div>
            ))}
        </div>
    );
}

/**
 * Parses a markdown bullet list (rendered as <ul><li>...) into
 * timeline entries. The first <strong> element of each bullet
 * becomes the label, the rest becomes the content. A leading
 * " - " separator after the label is stripped.
 */
function parseMarkdownChildren(children: ReactNode): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    const visit = (node: ReactNode) => {
        React.Children.forEach(node, (child) => {
            if (!React.isValidElement(child)) {
                return;
            }
            if (child.type === 'li') {
                let liChildren = React.Children.toArray((child.props as any).children);
                // loose lists wrap the bullet content in a paragraph
                if (
                    liChildren.length === 1 &&
                    React.isValidElement(liChildren[0]) &&
                    liChildren[0].type === 'p'
                ) {
                    liChildren = React.Children.toArray((liChildren[0].props as any).children);
                }
                const labelIndex = liChildren.findIndex(
                    (c) => React.isValidElement(c) && c.type === 'strong'
                );
                if (labelIndex === -1) {
                    entries.push({ label: '', content: liChildren });
                    return;
                }
                const label = (liChildren[labelIndex] as React.ReactElement).props.children;
                const rest = liChildren.slice(labelIndex + 1).map((c, i) => {
                    if (i === 0 && typeof c === 'string') {
                        return c.replace(/^\s*[-–—:]\s*/, '');
                    }
                    return c;
                });
                entries.push({ label, content: rest });
            } else {
                visit((child.props as any).children);
            }
        });
    };
    visit(children);
    return entries;
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
