import { ReactNode } from 'react';

/**
 * Two-column pros and cons block. Stacks vertically on
 * small screens.
 *
 * Usage in .md/.mdx files:
 *
 * <ProsCons
 *   pros={[
 *     'Works offline out of the box',
 *     'Reactive queries with RxJS',
 *   ]}
 *   cons={[
 *     'No relational joins',
 *   ]}
 * />
 */
export function ProsCons(props: {
    pros: ReactNode[];
    cons: ReactNode[];
    /**
     * (optional) [default='Pros']
     */
    prosTitle?: ReactNode;
    /**
     * (optional) [default='Cons']
     */
    consTitle?: ReactNode;
}) {
    return (
        <div style={styles.container}>
            <div style={{ ...styles.column, borderTop: '4px solid #23d195' }}>
                <strong style={styles.title}>{props.prosTitle ?? 'Pros'}</strong>
                <ul style={styles.list}>
                    {props.pros.map((item, index) => (
                        <li key={index} style={styles.item}>
                            <span style={{ ...styles.sign, color: '#23d195' }}>✓</span>
                            <span style={styles.text}>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div style={{ ...styles.column, borderTop: '4px solid #eb3d51' }}>
                <strong style={styles.title}>{props.consTitle ?? 'Cons'}</strong>
                <ul style={styles.list}>
                    {props.cons.map((item, index) => (
                        <li key={index} style={styles.item}>
                            <span style={{ ...styles.sign, color: '#eb3d51' }}>✕</span>
                            <span style={styles.text}>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 20,
        marginBottom: 20,
    },
    column: {
        flex: '1 1 260px',
        minWidth: 0,
        backgroundColor: 'var(--bg-color-dark)',
        borderRadius: 8,
        padding: '16px 20px',
    },
    title: {
        fontSize: '1.05em',
    },
    list: {
        listStyle: 'none',
        margin: 0,
        marginTop: 10,
        padding: 0,
    },
    item: {
        display: 'flex',
        gap: 10,
        marginBottom: 8,
    },
    sign: {
        fontWeight: 700,
        flexShrink: 0,
    },
    text: {
        flex: 1,
        minWidth: 0,
        overflowWrap: 'break-word',
    },
} as const;
