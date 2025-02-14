/**
 * @link https://chatgpt.com/c/67af1c3a-4d98-8005-a86c-8f9b4192b519
 */
export function Steps(props: { children: JSX.Element[] }) {
    const steps = [];
    let currentStep = null;

    props.children.forEach((child) => {
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
                        <div>{step.headline}</div>
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
    },
    stepIndicator: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '32px',
        marginRight: '1rem',
    },
    stepNumber: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-middle)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
    },
    /** 
     * Updated gradient: stays opaque until 80% (or 90%), then fades out.
     * Adjust these values to control how much of the line remains fully visible.
     */
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
        flex: 1,
    },
    item: {
        marginTop: '0.5rem',
    },
} as const;
