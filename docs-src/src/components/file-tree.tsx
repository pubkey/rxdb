import { ReactNode } from 'react';

export type FileTreeItem = {
    name: string;
    /**
     * (optional) Short comment shown behind the file name.
     */
    comment?: ReactNode;
    children?: FileTreeItem[];
};

/**
 * Project structure tree for quickstart and example pages.
 * Entries with children (or a trailing slash) are rendered as folders.
 *
 * Usage in .md/.mdx files:
 *
 * <FileTree items={[
 *   {
 *     name: 'src',
 *     children: [
 *       { name: 'database.ts', comment: 'creates the RxDatabase' },
 *       { name: 'schema.ts' },
 *     ]
 *   },
 *   { name: 'package.json' },
 * ]} />
 */
export function FileTree(props: {
    items: FileTreeItem[];
}) {
    return (
        <div style={styles.container}>
            {props.items.map((item, index) => (
                <FileTreeNode key={index} item={item} />
            ))}
        </div>
    );
}

function FileTreeNode(props: { item: FileTreeItem; }) {
    const item = props.item;
    const isFolder = !!item.children || item.name.endsWith('/');
    const name = item.name.endsWith('/') ? item.name.slice(0, -1) : item.name;
    return (
        <div>
            <div style={styles.row}>
                <span style={styles.icon}>{isFolder ? <FolderIcon /> : <FileIcon />}</span>
                <span style={isFolder ? styles.folderName : {}}>
                    {name}{isFolder ? '/' : ''}
                </span>
                {item.comment && <span style={styles.comment}>{item.comment}</span>}
            </div>
            {item.children && (
                <div style={styles.childrenBlock}>
                    {item.children.map((child, index) => (
                        <FileTreeNode key={index} item={child} />
                    ))}
                </div>
            )}
        </div>
    );
}

function FolderIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-top)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function FileIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
}

const styles = {
    container: {
        fontFamily: 'var(--ifm-font-family-monospace)',
        fontSize: '0.9em',
        backgroundColor: 'var(--bg-color-code)',
        borderRadius: 8,
        padding: '16px 20px',
        marginTop: 20,
        marginBottom: 20,
        overflowX: 'auto',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '2px 0',
        whiteSpace: 'nowrap',
    },
    icon: {
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
    },
    folderName: {
        fontWeight: 700,
    },
    comment: {
        opacity: 0.6,
        marginLeft: 12,
    },
    childrenBlock: {
        marginLeft: 7,
        paddingLeft: 16,
        borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
    },
} as const;
