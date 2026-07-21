import { ReactNode } from 'react';

/**
 * Marks a feature or plugin as deprecated. Counterpart to
 * <BetaBlock> and <PremiumBlock>.
 *
 * Usage in .md/.mdx files:
 *
 * <DeprecatedBlock since="16.0.0" removedIn="17.0.0" replacement={<a href="./rx-storage-indexeddb.html">IndexedDB RxStorage</a>} />
 */
export function DeprecatedBlock(props: {
    /**
     * (optional) The RxDB version since which this feature is deprecated.
     */
    since?: string;
    /**
     * (optional) The RxDB version in which this feature will be or was removed.
     */
    removedIn?: string;
    /**
     * (optional) Link or name of the replacement to use instead.
     */
    replacement?: ReactNode;
    /**
     * (optional) Additional content below the default text.
     */
    children?: ReactNode;
}) {
    return (
        <div
            style={{
                borderLeft: '4px solid #eb3d51',
                backgroundColor: 'rgba(235, 61, 81, 0.1)',
                padding: '16px 20px',
                borderRadius: '0 4px 4px 0',
                marginTop: 20,
                marginBottom: 20,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
                <strong style={{ fontSize: '1.05em' }}>Deprecated</strong>
                {props.since && (
                    <span style={{ fontSize: '0.9em', opacity: 0.85 }}>
                        (since version {props.since})
                    </span>
                )}
            </div>
            <div style={{ fontSize: '0.95em' }}>
                This feature is <strong>deprecated</strong> and should no longer be used in new projects.
                {props.removedIn && <> It will be removed in version <strong>{props.removedIn}</strong>.</>}
                {props.replacement && <> Use {props.replacement} instead.</>}
                {props.children && <div style={{ marginTop: 8 }}>{props.children}</div>}
            </div>
        </div>
    );
}
