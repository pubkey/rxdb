export const ALL_RUNTIMES = [
    'Browser',
    'Node.js',
    'Electron',
    'React Native',
    'Capacitor',
    'Deno',
    'Bun',
] as const;

export type Runtime = typeof ALL_RUNTIMES[number];

/**
 * Badge row for the JavaScript runtimes a plugin or storage
 * supports. By default all runtimes are shown as supported.
 * On storage pages you can mark single runtimes as unsupported.
 *
 * Usage in .md/.mdx files:
 *
 * <RuntimeBadges />
 * <RuntimeBadges unsupported={['Deno', 'Bun']} />
 * <RuntimeBadges supported={['Browser', 'Electron']} />
 */
export function RuntimeBadges(props: {
    /**
     * (optional) Only these runtimes are shown as supported.
     * [default=all runtimes]
     */
    supported?: Runtime[];
    /**
     * (optional) These runtimes are shown as unsupported.
     */
    unsupported?: Runtime[];
}) {
    const isSupported = (runtime: Runtime): boolean => {
        if (props.unsupported && props.unsupported.includes(runtime)) {
            return false;
        }
        if (props.supported) {
            return props.supported.includes(runtime);
        }
        return true;
    };

    return (
        <div style={styles.container}>
            {ALL_RUNTIMES.map((runtime) => {
                const supported = isSupported(runtime);
                return (
                    <span
                        key={runtime}
                        style={{
                            ...styles.badge,
                            ...(supported ? styles.supported : styles.unsupported),
                        }}
                        title={runtime + (supported ? ' is supported' : ' is not supported')}
                    >
                        <span style={{ color: supported ? '#23d195' : '#eb3d51', fontWeight: 700 }}>
                            {supported ? '✓' : '✕'}
                        </span>
                        {' '}{runtime}
                    </span>
                );
            })}
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 20,
        marginBottom: 20,
    },
    badge: {
        padding: '4px 12px',
        borderRadius: 15,
        fontSize: '0.9em',
        whiteSpace: 'nowrap',
        backgroundColor: 'var(--bg-color-dark)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
    },
    supported: {},
    unsupported: {
        opacity: 0.55,
    },
} as const;
