import { ReactNode } from 'react';

/**
 * Short summary box for the top of long articles. Readers that
 * skim get the main claims without reading the whole page.
 *
 * Usage in .md/.mdx files:
 *
 * <KeyPoints points={[
 *   'RxDB stores data on the client, queries run without network latency.',
 *   'Replication keeps the local state in sync with any backend.',
 * ]} />
 */
export function KeyPoints(props: {
    points: ReactNode[];
    /**
     * (optional) [default='Key Points']
     */
    title?: ReactNode;
}) {
    return (
        <div style={styles.container}>
            <strong style={styles.title}>{props.title ?? 'Key Points'}</strong>
            <ul style={styles.list}>
                {props.points.map((point, index) => (
                    <li key={index} style={styles.item}>{point}</li>
                ))}
            </ul>
        </div>
    );
}

const styles = {
    container: {
        borderLeft: '4px solid var(--color-top)',
        backgroundColor: 'rgba(237, 22, 143, 0.06)',
        padding: '16px 20px',
        borderRadius: '0 4px 4px 0',
        marginTop: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: '1.05em',
    },
    list: {
        margin: 0,
        marginTop: 8,
        paddingLeft: 20,
    },
    item: {
        marginBottom: 4,
    },
} as const;
