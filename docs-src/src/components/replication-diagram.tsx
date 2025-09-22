import { useRef, useState, useEffect, Fragment } from 'react';
import { HEARTBEAT_DURATION } from '../pages';
import { IconDevicePhone } from './icons/device-phone';
import { IconDeviceSmartwatch } from './icons/device-smartwatch';
import { Cloud } from './cloud';
import { IconDeviceDesktop } from './icons/device-desktop';
import { IconDeviceTablet } from './icons/device-tablet';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

export type DeviceType = 'smartwatch' | 'phone' | 'desktop' | 'tablet';

/**
 * Container width & height are calculated from element positions,
 * and the inner diagram div is right-aligned inside the outer container.
 */
export function ReplicationDiagram({ scale: scaleProp = 1 }: { scale?: number; }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // trigger rerender on resize so scaling updates correctly if font/zoom changes
  const [, forceRerender] = useState(0);
  useEffect(() => {
    const onResize = () => forceRerender(c => c + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const devices: DeviceType[] = [
    'desktop',
    'tablet',
    'phone',
    'desktop',
    'smartwatch',
  ];

  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const [sourceIndex, setSourceIndex] = useState<number | null>(null);

  const COLORS = ['var(--color-top)', 'var(--color-middle)', 'var(--color-bottom)'] as const;
  const [packetColor, setPacketColor] = useState<string>(COLORS[0]);

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return;
    }
    function handleHeartbeat() {
      setHeartbeatCount((c) => c + 1);
      setSourceIndex(Math.floor(Math.random() * devices.length));
      setPacketColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }
    window.addEventListener('heartbeat', handleHeartbeat);
    return () => window.removeEventListener('heartbeat', handleHeartbeat);
  }, []);

  // ---- Geometry ----
  const scale = scaleProp;
  const centerX = 250 * scale;
  const centerY = 200 * scale;

  const serverRadius = 60 * scale;
  const deviceCount = devices.length;
  const deviceRadius = 45 * scale;

  const deviceDistance = centerY - deviceRadius; // top-most device sits at y=0
  const angleOffset = -Math.PI / 2;

  const serverMargin = 3;
  const deviceMargin = 7;

  const linesData = Array.from({ length: deviceCount }, (_, i) => {
    const angle = angleOffset + (2 * Math.PI * i) / deviceCount;
    const deviceX = centerX + deviceDistance * Math.cos(angle);
    const deviceY = centerY + deviceDistance * Math.sin(angle);

    const dx = deviceX - centerX;
    const dy = deviceY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const lineLength =
      dist - (serverRadius + serverMargin) - (deviceRadius + deviceMargin);

    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const inwardName = `deviceToCenter-${i}-${heartbeatCount}`;
    const outwardName = `centerToDevice-${i}-${heartbeatCount}`;

    const deviceLeft = deviceX - deviceRadius;
    const deviceRight = deviceX + deviceRadius;
    const deviceTop = deviceY - deviceRadius;
    const deviceBottom = deviceY + deviceRadius;

    return {
      angleDeg, lineLength, deviceX, deviceY, inwardName, outwardName,
      deviceLeft, deviceRight, deviceTop, deviceBottom,
    };
  });

  // --- bounding box across all elements ---
  const serverLeft = centerX - serverRadius;
  const serverRight = centerX + serverRadius;
  const serverTop = centerY - serverRadius;
  const serverBottom = centerY + serverRadius;

  const minLeft = Math.min(serverLeft, ...linesData.map(d => d.deviceLeft));
  const maxRight = Math.max(serverRight, ...linesData.map(d => d.deviceRight));
  const minTop = Math.min(serverTop, ...linesData.map(d => d.deviceTop));
  const maxBot = Math.max(serverBottom, ...linesData.map(d => d.deviceBottom));

  const contentWidth = Math.ceil(maxRight - minLeft);
  const contentHeight = Math.ceil(maxBot - minTop);

  const offsetX = -minLeft;
  const offsetY = -minTop;

  // --- Timing ---
  const PHASE1 = Math.max(200, Math.floor(HEARTBEAT_DURATION * 0.45));
  const PHASE2 = Math.max(200, Math.floor(HEARTBEAT_DURATION * 0.45));
  const GAP = Math.max(0, HEARTBEAT_DURATION - (PHASE1 + PHASE2));

  const dynamicKeyframes = linesData.map(
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
}`
  ).join('\n');

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.container,
        ['--packetColor' as any]: packetColor,
        display: 'flex',           // flex container
        justifyContent: 'center' // align diagram wrapper to the right
      }}
    >
      <div
        style={{
          position: 'relative',
          width: `${contentWidth}px`,
          height: `${contentHeight}px`,
        }}
      >
        {/* Server (center cloud) */}
        <div
          className="device"
          style={{
            position: 'absolute',
            left: centerX - serverRadius + offsetX,
            top: centerY - serverRadius + offsetY,
            width: serverRadius * 2,
            height: serverRadius * 2,
            justifyContent: 'center',
          }}
        >
          <Cloud darkMode={true} style={{
            width: '100%'
          }} />
        </div>

        {/* Lines & devices */}
        {linesData.map(
          ({ angleDeg, lineLength, deviceX, deviceY, inwardName, outwardName }, i) => {
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
                    left: centerX + offsetX,
                    top: centerY + offsetY,
                    width: lineLength,
                    height: '2px',
                    backgroundColor: 'white',
                    transform: `rotate(${angleDeg}deg) translateX(${lineStart}px)`,
                    transformOrigin: 'left center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    display: 'flex'
                  }}
                >
                  {/* Phase 1: ONLY source line */}
                  {heartbeatCount > 0 && isSource && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '-6px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: packetColor,
                        boxShadow: `0 0 10px ${packetColor}55`,
                        animation: `${inwardName} ${PHASE1}ms linear 1 forwards`,
                        opacity: 0,
                      }}
                    />
                  )}
                  {/* Phase 2: ONLY non-source lines */}
                  {heartbeatCount > 0 && !isSource && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '-6px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: packetColor,
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
                    left: deviceX - deviceRadius + offsetX,
                    top: deviceY - deviceRadius + offsetY,
                    width: deviceRadius * 2,
                    height: deviceRadius * 2,
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    textAlign: 'center',
                    alignItems: 'center',
                    verticalAlign: 'middle'
                  }}
                >
                  {device === 'phone' ? (
                    <div className="device" style={{ top: '20%', left: '30%' }}>
                      <IconDevicePhone iconUrl="/files/logo/logo.svg" />
                    </div>
                  ) : device === 'smartwatch' ? (
                    <div className="device" style={{ width: '80%', top: '20%', left: '17%' }}>
                      <IconDeviceSmartwatch iconUrl="/files/logo/logo.svg" />
                    </div>
                  ) : device === 'desktop' ? (
                    <div className="device" style={{ top: '20%', left: '27%' }}>
                      <IconDeviceDesktop iconUrl="/files/logo/logo.svg" />
                    </div>
                  ) : (
                    <div className="device" style={{ top: '20%', left: '27%' }}>
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
    width: '100%',       // outer container can stretch
    overflow: 'visible', // let diagram content grow
  } as React.CSSProperties,
};
