import { useRef, useState, useEffect, Fragment } from 'react';
import { HEARTBEAT_DURATION } from '../pages';
import { IconDevicePhone } from './icons/device-phone';
import { IconDeviceSmartwatch } from './icons/device-smartwatch';
import { Cloud } from './cloud';

/**
 * @link https://chatgpt.com/c/67ecc68e-db6c-8005-8398-7ecf5e1d222e
 */
export function ReplicationDiagram() {
    // A reference to our parent container so we can measure its size
    const containerRef = useRef(null);

    // Store the container's current (square) dimension
    // We'll use min(width, height) to ensure we always have a square
    const [size, setSize] = useState(0);

    // Measure the container whenever it mounts or resizes
    useEffect(() => {
        function handleResize() {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const newSize = Math.min(rect.width, rect.height);
                setSize(newSize);
            }
        }
        window.addEventListener('resize', handleResize);
        // Measure once on mount
        handleResize();
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Each time a heartbeat event fires, increment a counter
    // so that we can “restart” the animation.
    const [heartbeatCount, setHeartbeatCount] = useState(0);

    useEffect(() => {
        function handleHeartbeat() {
            // Each new heartbeat increments the counter,
            // causing our packet animations to restart
            setHeartbeatCount(count => count + 1);
        }
        window.addEventListener('heartbeat', handleHeartbeat);
        return () => window.removeEventListener('heartbeat', handleHeartbeat);
    }, []);

    // If we haven’t measured yet, don’t render the diagram
    if (size <= 0) {
        return <div ref={containerRef} style={styles.container} />;
    }

    // The scale factor relative to our “base” 500×500 coordinate space
    const scale = size / 500;

    // “Coordinates” in a 500×500 system, then multiplied by `scale`
    const centerX = 250 * scale;
    const centerY = 250 * scale;

    // Diagram geometry (scaled)
    const serverRadius = 40 * scale;
    const deviceCount = 5;
    const deviceDistance = 150 * scale;
    const deviceRadius = 50 * scale;
    const serverMargin = 0 * scale;
    const deviceMargin = 0 * scale;

    // Build our lines data
    const linesData = Array.from({ length: deviceCount }, (_, i) => {
        const angle = (2 * Math.PI * i) / deviceCount;

        // Device center
        const deviceX = centerX + deviceDistance * Math.cos(angle);
        const deviceY = centerY + deviceDistance * Math.sin(angle);

        // Vector & distance from center
        const dx = deviceX - centerX;
        const dy = deviceY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Subtract margins from both ends
        const lineLength = dist - (serverRadius + serverMargin) - (deviceRadius + deviceMargin);

        // Convert to degrees for CSS rotate
        const angleDeg = (angle * 180) / Math.PI;

        // Unique animation name for each line & heartbeat
        // So it restarts from the beginning whenever heartbeatCount changes.
        const animationName = `packetMove-${i}-${heartbeatCount}`;

        return { angleDeg, lineLength, deviceX, deviceY, animationName };
    });

    // Build CSS keyframes for each line’s pink “packet” animation
    const dynamicKeyframes = linesData
        .map(({ animationName, lineLength }) => `
        @keyframes ${animationName} {
            0% {
              transform: translateX(0);
              opacity: 0;
            }
            10% {
              opacity: 1; 
            }
            90% {
              opacity: 1; 
            }
            100% {
              transform: translateX(${lineLength}px);
              opacity: 0;
            }
          }
`)
        .join('\n');


    const serverTicksSize = 10;
    return (
        <div ref={containerRef} style={styles.container}>
            {/* A relative child that matches the measured square "size" */}
            <div
                style={{
                    position: 'relative',
                    width: `${size}px`,
                    height: `${size}px`,
                }}
            >
                {/* Server circle */}
                <div
                    className='device'
                    style={{
                        position: 'absolute',
                        left: centerX - serverRadius,
                        top: centerY - serverRadius,
                        width: serverRadius * 2,
                        height: serverRadius * 2,
                        borderRadius: '50%'
                    }}
                >
                    <Cloud darkMode={true}></Cloud>

                </div>

                {/* Lines & devices */}
                {linesData.map(({ angleDeg, lineLength, deviceX, deviceY, animationName }, i) => {
                    // Distance from the center to the line start = serverRadius + serverMargin
                    const lineStart = serverRadius + serverMargin;

                    return (
                        <Fragment key={i}>
                            {/* The grey line (rotated div) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    borderRadius: 5,
                                    left: centerX,
                                    top: centerY,
                                    width: lineLength,
                                    height: '2px',
                                    backgroundColor: 'white',
                                    transform: `rotate(${angleDeg}deg) translateX(${lineStart}px)`,
                                    transformOrigin: 'left center',
                                }}
                            >
                                {/* Pink “packet” traveling along the line */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: '-6px',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        // Animate only if we've had at least 1 heartbeat
                                        // "2s linear 1 forwards" => 2s duration, no repeat, end state is retained
                                        animation:
                                            heartbeatCount > 0
                                                ? `${animationName} ${HEARTBEAT_DURATION / 2}ms linear 1 forwards`
                                                : 'none',
                                        opacity: 0, // hidden by default
                                    }}
                                    className='beating-color'
                                />
                            </div>

                            {/* Device circle */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: deviceX - deviceRadius,
                                    top: deviceY - deviceRadius,
                                    width: deviceRadius * 2,
                                    height: deviceRadius * 2,
                                    borderRadius: '50%',
                                    // backgroundColor: '#ffa500',
                                    // border: '2px solid #222',
                                }}
                            >
                                {
                                    i % 3 === 0 ? <div
                                    className='device '
                                        style={{
                                            width: '70%',
                                            height: '60%',
                                            top: '20%',
                                            left: '15%',
                                            marginLeft: 0
                                        }}
                                    >
                                        <IconDevicePhone></IconDevicePhone>
                                        {/* <div className="beating-color" style={{
                                            borderTopLeftRadius: 5,
                                            borderTopRightRadius: 5
                                        }}>
                                            <img
                                                src="/files/logo/logo.svg"
                                                className="beating logo animation"
                                                alt="RxDB"
                                                loading='lazy'
                                                style={{
                                                    width: '26%'
                                                }}
                                            />
                                        </div> */}
                                    </div> : <div
                                        className='device'
                                        style={{
                                            width: '46%',
                                            height: '60%',
                                            top: '20%',
                                            left: '27%'
                                        }}
                                    >
                                        <IconDeviceSmartwatch></IconDeviceSmartwatch>
                                    </div>
                                }

                                {/* <div
                                    className='device tablet'
                                    style={{
                                        width: '46%',
                                        height: '60%',
                                        top: '20%',
                                        left: '27%'
                                    }}
                                >
                                    <div className="beating-color" style={{
                                        borderRadius: 2
                                    }}>
                                        <img
                                            src="/files/logo/logo.svg"
                                            className="beating logo animation"
                                            alt="RxDB"
                                            loading='lazy'
                                            style={{
                                                width: '50%'
                                            }}
                                        />
                                    </div>
                                </div> */}
                            </div>
                        </Fragment>
                    );
                })}

                {/* Inject dynamic keyframes */}
                <style>{dynamicKeyframes}</style>
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        // Keeps a square aspect ratio in modern browsers
        aspectRatio: '1',
        // You could also use “padding-bottom hack” if needed for older browsers
        overflow: 'hidden',
    },
};
