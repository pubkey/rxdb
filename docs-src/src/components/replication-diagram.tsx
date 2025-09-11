import { useRef, useState, useEffect, Fragment } from 'react';
import { HEARTBEAT_DURATION } from '../pages';
import { IconDevicePhone } from './icons/device-phone';
import { IconDeviceSmartwatch } from './icons/device-smartwatch';
import { Cloud } from './cloud';
import { IconDeviceDesktop } from './icons/device-desktop';
import { IconDeviceTablet } from './icons/device-tablet';

export type DeviceType = 'smartwatch' | 'phone' | 'desktop' | 'tablet';

/**
 * On each heartbeat:
 *  1) Pick a random device as the source.
 *  2) Pick one of 3 colors for THIS TICK.
 *  3) Emit ONE circle from that device to the center cloud (Phase 1).
 *  4) Then emit circles from the center to all OTHER devices (Phase 2).
 *  5) All circles in this tick share the chosen color.
 */
export function ReplicationDiagram() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newSize = Math.min(rect.width, rect.height);
        setSize(newSize);
      }
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const devices: DeviceType[] = ['smartwatch', 'desktop', 'phone', 'tablet', 'desktop'];

  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const [sourceIndex, setSourceIndex] = useState<number | null>(null);

  // Color palette (pick your 3 brand colors here)
  const COLORS = ['var(--color-top)', 'var(--color-middle)', 'var(--color-bottom)'] as const;
  const [packetColor, setPacketColor] = useState<string>(COLORS[0]);

  useEffect(() => {
    function handleHeartbeat() {
      setHeartbeatCount((c) => c + 1);
      setSourceIndex(Math.floor(Math.random() * devices.length));
      // pick one of three colors for this tick; all packets use it
      setPacketColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }
    window.addEventListener('heartbeat', handleHeartbeat);
    return () => window.removeEventListener('heartbeat', handleHeartbeat);
  }, []);

  if (size <= 0) {
    return <div ref={containerRef} style={styles.container} />;
  }

  const scale = size / 500;
  const centerX = 250 * scale;
  const centerY = 250 * scale;

  const serverRadius = 55 * scale;
  const deviceCount = devices.length;
  const deviceDistance = 150 * scale;
  const deviceRadius = 50 * scale;
  const serverMargin = 0 * scale;
  const deviceMargin = 0 * scale;

  const linesData = Array.from({ length: deviceCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / deviceCount;
    const deviceX = centerX + deviceDistance * Math.cos(angle);
    const deviceY = centerY + deviceDistance * Math.sin(angle);
    const dx = deviceX - centerX;
    const dy = deviceY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const lineLength =
      dist - (serverRadius + serverMargin) - (deviceRadius + deviceMargin);
    const angleDeg = (angle * 180) / Math.PI;

    const inwardName = `deviceToCenter-${i}-${heartbeatCount}`;
    const outwardName = `centerToDevice-${i}-${heartbeatCount}`;

    return { angleDeg, lineLength, deviceX, deviceY, inwardName, outwardName };
  });

  // Timing
  const PHASE1 = Math.max(200, Math.floor(HEARTBEAT_DURATION * 0.45));
  const PHASE2 = Math.max(200, Math.floor(HEARTBEAT_DURATION * 0.45));
  const GAP = Math.max(0, HEARTBEAT_DURATION - (PHASE1 + PHASE2));

  const dynamicKeyframes = linesData
    .map(
      ({ inwardName, outwardName, lineLength }) => `
@keyframes ${inwardName} {
  0%   { transform: translateX(${lineLength}px); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateX(0px); opacity: 0; }
}
@keyframes ${outwardName} {
  0%   { transform: translateX(0px); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateX(${lineLength}px); opacity: 0; }
}
`
    )
    .join('\n');

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.container,
        // expose chosen color to descendants as a CSS var (handy if you later move styles to CSS)
        ['--packetColor' as any]: packetColor,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        {/* Server (center cloud) */}
        <div
          className="device"
          style={{
            position: 'absolute',
            left: centerX - serverRadius,
            top: centerY - serverRadius,
            width: serverRadius * 2,
            height: serverRadius * 2,
            justifyContent: 'center',
          }}
        >
          <Cloud darkMode={true} />
        </div>

        {/* Lines & devices */}
        {linesData.map(
          (
            { angleDeg, lineLength, deviceX, deviceY, inwardName, outwardName },
            i
          ) => {
            const lineStart = serverRadius + serverMargin;
            const device = devices[i];
            const isSource = sourceIndex === i;

            return (
              <Fragment key={i}>
                {/* Line (from center outward) */}
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
                  {/* Phase 1: ONLY on the source line, travel inward device -> center */}
                  {heartbeatCount > 0 && isSource && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '-6px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: packetColor, // chosen color for this tick
                        boxShadow: `0 0 10px ${packetColor}55`,
                        animation: `${inwardName} ${PHASE1}ms linear 1 forwards`,
                        opacity: 0,
                      }}
                    />
                  )}

                  {/* Phase 2: ONLY on non-source lines, center -> device (after Phase 1) */}
                  {heartbeatCount > 0 && !isSource && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '-6px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: packetColor, // same chosen color
                        boxShadow: `0 0 10px ${packetColor}55`,
                        animation: `${outwardName} ${PHASE2}ms ${PHASE1 + GAP}ms linear 1 forwards`,
                        opacity: 0,
                      }}
                    />
                  )}
                </div>

                {/* Device icons */}
                <div
                  style={{
                    position: 'absolute',
                    left: deviceX - deviceRadius,
                    top: deviceY - deviceRadius,
                    width: deviceRadius * 2,
                    height: deviceRadius * 2,
                    borderRadius: '50%',
                  }}
                >
                  {device === 'phone' ? (
                    <div
                      className="device"
                      style={{
                        width: '70%',
                        height: '60%',
                        top: '20%',
                        left: '30%',
                        marginLeft: 0,
                      }}
                    >
                      <IconDevicePhone iconUrl="/files/logo/logo.svg" />
                    </div>
                  ) : device === 'smartwatch' ? (
                    <div
                      className="device"
                      style={{
                        width: '46%',
                        height: '60%',
                        top: '20%',
                        left: '17%',
                      }}
                    >
                      <IconDeviceSmartwatch iconUrl="/files/logo/logo.svg" />
                    </div>
                  ) : device === 'desktop' ? (
                    <div
                      className="device"
                      style={{
                        width: '46%',
                        height: '60%',
                        top: '20%',
                        left: '27%',
                      }}
                    >
                      <IconDeviceDesktop iconUrl="/files/logo/logo.svg" />
                    </div>
                  ) : (
                    <div
                      className="device"
                      style={{
                        width: '46%',
                        height: '60%',
                        top: '20%',
                        left: '27%',
                      }}
                    >
                      <IconDeviceTablet iconUrl="/files/logo/logo.svg" />
                    </div>
                  )}
                </div>
              </Fragment>
            );
          }
        )}

        {/* Inject dynamic keyframes */}
        <style>{dynamicKeyframes}</style>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    aspectRatio: '1',
    overflow: 'hidden',
  } as React.CSSProperties,
};
