/**
 * @link https://chatgpt.com/c/67af1c3a-4d98-8005-a86c-8f9b4192b519
 */
export function Steps(props: { children: JSX.Element[]; }) {
    const steps = [];
    let currentStep = null;

    props.children.forEach((child) => {
        // Group paragraphs under the most recent "headline" (child with an id)
        if (!child.props.id) {
            if (currentStep) {
                currentStep.paragraphs.push(child);
            }
        } else {
            if (currentStep) {
                steps.push(currentStep);
            }
            currentStep = {
                headline: child,
                paragraphs: [],
            };
        }
    });
    if (currentStep) {
        steps.push(currentStep);
    }

    return (
        <div style={styles.stepsContainer}>
            {steps.map((step, index) => (
                <div key={index} style={styles.stepWrapper}>
                    <div style={styles.stepIndicator}>
                        <div style={styles.stepNumber}>{index + 1}.</div>
                        <div style={styles.verticalLine} />
                    </div>

                    <div style={styles.stepContent}>
                        {/* Headline */}
                        <div>{step.headline}</div>
                        {/* Paragraphs */}
                        {step.paragraphs.map((item, itemIndex) => (
                            <div key={itemIndex} style={styles.item}>
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

const styles = {
    stepsContainer: {
        display: 'flex',
        flexDirection: 'column',
    },
    stepWrapper: {
        display: 'flex',
        alignItems: 'stretch',
        marginBottom: '1rem',
        position: 'relative',
        // Allow the .stepContent (to the right) to shrink without pushing the layout horizontally
        minWidth: 0,
        // Optionally, if there's still overflow from extremely wide content, you could hide it:
        // overflowX: 'hidden',
    },
    stepIndicator: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '32px',
        marginRight: '1rem',
        // Ensure the left indicator area also allows shrinking, if needed
        minWidth: 0,
    },
    stepNumber: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-middle)',
        border: '3px solid #391a3b',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
    },
    verticalLine: {
        position: 'absolute',
        top: '32px',
        bottom: '0',
        left: '50%',
        width: '1px',
        background:
            'linear-gradient(to bottom, var(--color-middle) 0%, var(--color-middle) 80%, rgba(0,0,0,0) 100%)',
        transform: 'translateX(-50%)',
    },
    stepContent: {
        // This is critical to avoid horizontal overflow:
        flex: 1,
        minWidth: 0,                 // Let this content shrink
        overflowWrap: 'break-word',  // Break long words if needed
    },
    item: {
        marginTop: '0.5rem',
    },
} as const;
