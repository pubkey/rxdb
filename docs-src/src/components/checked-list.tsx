import { CSSProperties, Children, ReactNode } from 'react';
import { IconCheck } from './icons/check';

type FeatureListProps = {
    children: ReactNode[];
};


const styles: Record<string, CSSProperties> = {
    list: {
        listStyle: "none",
        padding: "1.5rem",
        margin: 0,
        color: "#fff",
        fontFamily: "monospace",
    },
    item: {
        display: "flex",
        alignItems: "center", // <-- instead of flex-start
        gap: "0.75rem",
        fontSize: "1.125rem",
        marginBottom: 16,
        height: 52
    },
    icon: {
        color: "#fff",
        width: 37,
        height: 26,
        flexShrink: 0, // prevents squishing
        alignSelf: "center", // ensures vertical centering inside flex
    },
    text: {
        flex: 1,
        marginLeft: 10,
        fontSize: 20,
        fontStyle: 'normal',
        fontWeight: 700,
        lineHeight: 'normal',
        maxWidth: 306
    },
    highlight: {
        color: "#e6007a",
        fontWeight: 600,
    },
};

export function CheckedList({ children }: FeatureListProps) {

    const items = Children.toArray(children);

    return (
        <ul style={styles.list}>
            {items.map((child, i) => (
                <li key={i} style={styles.item}>
                    <IconCheck style={styles.icon} />
                    <div style={styles.text}>{child}</div>
                </li>
            ))}
        </ul>
    );
}
