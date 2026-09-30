import { useRef, useState, useEffect, Fragment, CSSProperties } from 'react';
import { HEARTBEAT_DURATION } from '../pages';
import { IconDevicePhone } from './icons/device-phone';
import { IconDeviceSmartwatch } from './icons/device-smartwatch';
import { Cloud } from './cloud';
import { IconDeviceDesktop } from './icons/device-desktop';
import { IconDeviceTablet } from './icons/device-tablet';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { WifiOffIcon } from './icons/offline';

export type DeviceType = 'smartwatch' | 'phone' | 'desktop' | 'tablet';

/**
 * - 'sync': a device writes and the change is replicated to all online devices.
 * - 'local': the offline device writes, the change stays on the device.
 * - 'flush': the offline device comes back online and pushes its pending changes.
 */
type RoundKind = 'sync' | 'local' | 'flush';

type Round = {
  id: number;
  kind: RoundKind;
  source: number;
  color: string;
  /** index of the device that is offline during this round */
  offline: number | null;
  /** pending local writes on the offline device after this round */
  pending: number;
  /** number of changes pushed in a 'flush' round */
  flushed: number;
};

export type ReplicationDiagramProps = {
  /** Scales the whole diagram [default=1] */
  scale?: number;
  dark: boolean;
  /** Show the replication protocol icon inside the cloud [default=true] */
  hasIcon?: boolean;
  /**
   * Simulate offline devices: one device goes offline, keeps writing locally
   * and syncs its pending changes when it comes back online. [default=false]
   */
  demoOffline?: boolean;
  /** Number of heartbeats a device stays offline in demoOffline mode [default=3] */
  offlineBeats?: number;
  /** Renders a play button on top of the cloud */
  onPlayClick?: () => void;
  /** The devices around the cloud, clockwise starting at the top */
  devices?: DeviceType[];
  /** Show a label next to each device [default=false] */
  showLabels?: boolean;
  /** Custom labels, same order as `devices` */
  labels?: string[];
  /** Show a text line below the diagram that describes the current step [default=false] */
  showStatus?: boolean;
  /** Clicking or pressing enter on a device writes a change on that device [default=true] */
  interactive?: boolean;
  /**
   * By default the diagram listens to the global 'heartbeat' event of the landing page.
   * Set an interval in milliseconds to run with its own timer instead, for example on doc pages.
   */
  heartbeatInterval?: number;
  /** Colors of the replicated changes */
  packetColors?: string[];
  className?: string;
  style?: CSSProperties;
};

const DEFAULT_DEVICES: DeviceType[] = ['desktop', 'tablet', 'phone', 'desktop', 'smartwatch'];
const DEFAULT_COLORS = ['var(--color-top)', 'var(--color-middle)', 'var(--color-bottom)'];
const DEVICE_LABELS: Record<DeviceType, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  phone: 'Phone',
  smartwatch: 'Smartwatch',
};

/**
 * Probability that the offline device is the one that writes,
 * so the demo shows local writes piling up while offline.
 */
const OFFLINE_WRITE_PROBABILITY = 0.4;

function pickRandomIndex(count: number, exclude: (number | null | undefined)[]): number {
  const candidates: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!exclude.includes(i)) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) {
    return 0;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * All elements are absolutely positioned inside a box whose size is
 * calculated from the element positions, so the diagram has no empty margins.
 * Animations use static keyframes with CSS variables and are restarted
 * by re-keying the animated elements on every round.
 */
export function ReplicationDiagram({
  scale = 1,
  dark,
  hasIcon = true,
  demoOffline = false,
  offlineBeats = 3,
  onPlayClick,
  devices = DEFAULT_DEVICES,
  showLabels = false,
  labels,
  showStatus = false,
  interactive = true,
  heartbeatInterval,
  packetColors = DEFAULT_COLORS,
  className,
  style,
}: ReplicationDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const cloudRef = useRef<HTMLDivElement | null>(null);
  const deviceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const deviceCount = devices.length;
  const getLabel = (i: number) => labels?.[i] ?? DEVICE_LABELS[devices[i]];

  const sim = useRef({ id: 0, offline: null as number | null, offlineSince: 0, pending: 0 });
  const config = useRef({ deviceCount, demoOffline, offlineBeats, packetColors });
  config.current = { deviceCount, demoOffline, offlineBeats, packetColors };

  const nextRound = (forcedSource?: number): Round => {
    const c = config.current;
    const s = sim.current;
    s.id += 1;

    let kind: RoundKind = 'sync';
    let source: number | null = null;
    let flushed = 0;

    if (!c.demoOffline || c.deviceCount < 2) {
      s.offline = null;
      s.pending = 0;
    } else if (s.offline === null) {
      s.offline = pickRandomIndex(c.deviceCount, [forcedSource]);
      s.offlineSince = s.id;
      s.pending = 0;
    } else if (forcedSource === undefined && s.id - s.offlineSince >= c.offlineBeats) {
      kind = 'flush';
      source = s.offline;
      flushed = s.pending;
      s.offline = pickRandomIndex(c.deviceCount, [source]);
      s.offlineSince = s.id;
      s.pending = 0;
    }

    if (kind !== 'flush') {
      if (forcedSource !== undefined) {
        source = forcedSource;
      } else if (s.offline !== null && Math.random() < OFFLINE_WRITE_PROBABILITY) {
        source = s.offline;
      } else {
        source = pickRandomIndex(c.deviceCount, [s.offline]);
      }
      if (source === s.offline) {
        kind = 'local';
        s.pending += 1;
      }
    }

    return {
      id: s.id,
      kind,
      source: source as number,
      color: c.packetColors[Math.floor(Math.random() * c.packetColors.length)],
      offline: s.offline,
      pending: s.pending,
      flushed,
    };
  };

  // Only animate while the diagram is on screen.
  const visibleRef = useRef(true);
  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM || !containerRef.current || !('IntersectionObserver' in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => (visibleRef.current = entry.isIntersecting)),
      { threshold: 0 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return;
    }
    const tick = () => {
      if (visibleRef.current && !document.hidden) {
        setRound(nextRound());
      }
    };
    if (heartbeatInterval) {
      const interval = window.setInterval(tick, heartbeatInterval);
      return () => window.clearInterval(interval);
    }
    window.addEventListener('heartbeat', tick);
    return () => window.removeEventListener('heartbeat', tick);
  }, [heartbeatInterval]);

  const triggerWrite = (index: number) => {
    if (interactive) {
      setRound(nextRound(index));
    }
  };

  // ---- Geometry ----
  const centerX = 250 * scale;
  const centerY = 200 * scale;
  const serverRadius = 60 * scale;
  const deviceRadius = 45 * scale;
  const deviceDistance = centerY - deviceRadius; // top-most device sits at y=0
  const angleOffset = -Math.PI / 2;
  const serverMargin = 3 * scale;
  const deviceMargin = 7 * scale;
  const labelFontSize = Math.max(11, 13 * scale);
  const labelGap = 10 * scale;

  const linesData = devices.map((_, i) => {
    const angle = angleOffset + (2 * Math.PI * i) / deviceCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const deviceX = centerX + deviceDistance * cos;
    const deviceY = centerY + deviceDistance * sin;
    const lineStart = serverRadius + serverMargin;
    const lineLength = deviceDistance - lineStart - (deviceRadius + deviceMargin);

    const labelWidth = getLabel(i).length * labelFontSize * 0.62;
    const labelHeight = labelFontSize * 1.4;
    const labelDistance = deviceRadius + labelGap;
    const labelPush = labelDistance + (labelWidth / 2) * Math.abs(cos) + (labelHeight / 2) * Math.abs(sin);
    const labelX = deviceX + cos * labelPush;
    const labelY = deviceY + sin * labelPush;

    return {
      angleDeg: (angle * 180) / Math.PI,
      cos,
      sin,
      deviceX,
      deviceY,
      lineStart,
      lineLength,
      labelX,
      labelY,
      labelWidth,
      labelHeight,
    };
  });

  const boxes = [
    { l: centerX - serverRadius, r: centerX + serverRadius, t: centerY - serverRadius, b: centerY + serverRadius },
    ...linesData.map((d) => ({
      l: d.deviceX - deviceRadius,
      r: d.deviceX + deviceRadius,
      t: d.deviceY - deviceRadius,
      b: d.deviceY + deviceRadius,
    })),
    ...(showLabels
      ? linesData.map((d) => ({
        l: d.labelX - d.labelWidth / 2,
        r: d.labelX + d.labelWidth / 2,
        t: d.labelY - d.labelHeight / 2,
        b: d.labelY + d.labelHeight / 2,
      }))
      : []),
  ];
  const minLeft = Math.min(...boxes.map((b) => b.l));
  const minTop = Math.min(...boxes.map((b) => b.t));
  const contentWidth = Math.ceil(Math.max(...boxes.map((b) => b.r)) - minLeft);
  const contentHeight = Math.ceil(Math.max(...boxes.map((b) => b.b)) - minTop);
  const offsetX = -minLeft;
  const offsetY = -minTop;
  const cx = centerX + offsetX;
  const cy = centerY + offsetY;

  // ---- Timing ----
  const duration = heartbeatInterval ? heartbeatInterval * 0.6 : HEARTBEAT_DURATION;
  const PHASE_IN = Math.max(200, Math.floor(duration * 0.42));
  const GAP = Math.max(0, Math.floor(duration * 0.1));
  const PHASE_OUT = Math.max(200, Math.floor(duration * 0.48));
  const ARRIVAL = PHASE_IN + GAP + PHASE_OUT;

  const offlineIndex = demoOffline && round ? round.offline : null;

  useEffect(() => {
    if (!round || round.kind === 'local' || typeof Element === 'undefined' || !('animate' in Element.prototype)) {
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const bump = [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.35 }, { transform: 'scale(1)' }];
    const animations: Animation[] = [];
    if (cloudRef.current) {
      animations.push(cloudRef.current.animate(bump, { duration: GAP + PHASE_OUT * 0.5, delay: PHASE_IN, easing: 'ease-out' }));
    }
    deviceRefs.current.forEach((el, i) => {
      if (el && i !== round.source && i !== round.offline) {
        animations.push(el.animate(bump, { duration: 320, delay: ARRIVAL - 60, easing: 'ease-out' }));
      }
    });
    return () => animations.forEach((a) => a.cancel());
  }, [round]);
  const isBroadcast = !!round && round.kind !== 'local';
  const packetSize = Math.max(8, 12 * scale);
  const tailLength = packetSize * 1.6;

  const statusText = getStatusText(round, getLabel, deviceCount);

  return (
    <div
      ref={containerRef}
      className={'replication-diagram' + (className ? ' ' + className : '')}
      role="img"
      aria-label={
        'Replication diagram: ' +
        deviceCount +
        ' devices replicate their changes through a server' +
        (demoOffline ? ', one device is offline and syncs when it reconnects' : '')
      }
      style={{
        width: '100%',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        ...style,
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        style={{
          position: 'relative',
          width: contentWidth,
          height: contentHeight,
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Connection lines */}
        <svg
          width={contentWidth}
          height={contentHeight}
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          {linesData.map((d, i) => {
            const x1 = cx + d.cos * d.lineStart;
            const y1 = cy + d.sin * d.lineStart;
            const x2 = cx + d.cos * (d.lineStart + d.lineLength);
            const y2 = cy + d.sin * (d.lineStart + d.lineLength);
            const isOffline = offlineIndex === i;
            const isHover = hoverIndex === i;
            const isSourceLine = !!round && round.source === i;
            const flashDelay = isSourceLine ? 0 : PHASE_IN + GAP;
            const flashDuration = isSourceLine ? PHASE_IN : PHASE_OUT;

            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="white"
                  strokeOpacity={isOffline ? 0.4 : isHover ? 1 : 0.85}
                  strokeWidth={isHover && !isOffline ? 3 : 2}
                  strokeLinecap="round"
                  strokeDasharray={isOffline ? `${3 * scale} ${7 * scale}` : undefined}
                  style={{ transition: 'stroke-opacity 300ms ease, stroke-width 200ms ease' }}
                />
                {round && isBroadcast && !isOffline && (
                  <line
                    key={round.id}
                    className="rd-anim"
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={round.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    style={{
                      opacity: 0,
                      filter: `drop-shadow(0 0 4px ${round.color})`,
                      animation: `rd-line-flash ${flashDuration}ms ease-out ${flashDelay}ms 1 forwards`,
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Server glow and cloud */}
        <div
          style={{
            position: 'absolute',
            left: cx - serverRadius * 1.5,
            top: cy - serverRadius * 1.5,
            width: serverRadius * 3,
            height: serverRadius * 3,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(237,22,143,0.22) 0%, rgba(237,22,143,0.06) 45%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {round && isBroadcast && (
          <Ring
            key={'server-' + round.id}
            x={cx}
            y={cy}
            radius={serverRadius}
            color={round.color}
            delay={PHASE_IN}
            duration={GAP + PHASE_OUT}
          />
        )}
        <div
          ref={cloudRef}
          className="device"
          style={{
            position: 'absolute',
            left: cx - serverRadius,
            top: cy - serverRadius,
            width: serverRadius * 2,
            height: serverRadius * 2,
            justifyContent: 'center',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
          }}
        >
          <Cloud darkMode={dark} style={{ width: '100%' }} hasIcon={hasIcon} />
        </div>

        {onPlayClick && (
          <div
            onClick={onPlayClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPlayClick();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Play video"
            className="rd-play"
            style={{
              position: 'absolute',
              left: cx,
              top: cy + 7 * scale,
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <YouTubePlayButtonSvg width={41 * scale} />
          </div>
        )}

        {/* Packets and offline badges, positioned along the rotated line */}
        {linesData.map((d, i) => {
          const isOffline = offlineIndex === i;
          const isSource = !!round && round.source === i;
          const badgeRadius = 14 * scale;

          let packet: { animation: string; inward: boolean; } | null = null;
          if (round) {
            if (round.kind === 'local' && isSource) {
              packet = { animation: `rd-packet-blocked ${PHASE_IN}ms cubic-bezier(.3,.6,.5,1) 0ms 1 forwards`, inward: true };
            } else if (isBroadcast && isSource) {
              packet = { animation: `rd-packet-in ${PHASE_IN}ms cubic-bezier(.55,.05,.45,1) 0ms 1 forwards`, inward: true };
            } else if (isBroadcast && !isOffline) {
              packet = {
                animation: `rd-packet-out ${PHASE_OUT}ms cubic-bezier(.55,.05,.45,1) ${PHASE_IN + GAP}ms 1 forwards`,
                inward: false,
              };
            }
          }

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: cx,
                top: cy,
                width: d.lineLength,
                height: 0,
                transform: `rotate(${d.angleDeg}deg) translateX(${d.lineStart}px)`,
                transformOrigin: 'left center',
                pointerEvents: 'none',
                ['--rd-len' as any]: `${d.lineLength}px`,
                ['--rd-stop' as any]: `${d.lineLength / 2 + badgeRadius + packetSize / 2}px`,
              }}
            >
              {packet && round && (
                <div
                  key={round.id}
                  className="rd-anim"
                  style={{
                    position: 'absolute',
                    left: -packetSize / 2,
                    top: -packetSize / 2,
                    width: packetSize,
                    height: packetSize,
                    opacity: 0,
                    animation: packet.animation,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: packetSize / 2 - packetSize * 0.2,
                      left: packet.inward ? packetSize / 2 : packetSize / 2 - tailLength,
                      width: tailLength,
                      height: packetSize * 0.4,
                      borderRadius: packetSize,
                      background: `linear-gradient(${packet.inward ? 'to left' : 'to right'}, transparent, ${round.color})`,
                      opacity: 0.8,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      backgroundColor: round.color,
                      border: `${Math.max(1, scale)}px solid rgba(255,255,255,0.85)`,
                      boxShadow: `0 0 ${packetSize}px ${round.color}`,
                    }}
                  />
                </div>
              )}

              {isOffline && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    transform: `translate(-50%, -50%) rotate(${-d.angleDeg}deg)`,
                  }}
                >
                  <div
                    key={round && round.kind === 'local' ? 'blocked-' + round.id : 'badge'}
                    className="rd-anim"
                    style={{
                      width: badgeRadius * 2,
                      height: badgeRadius * 2,
                      background: 'var(--bg-color-dark)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation:
                        round && round.kind === 'local'
                          ? `rd-shake 360ms ease-in-out ${PHASE_IN * 0.8}ms 1`
                          : 'rd-pop 300ms ease-out',
                    }}
                  >
                    <WifiOffIcon style={{ width: badgeRadius * 1.25 }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Devices */}
        {linesData.map((d, i) => {
          const device = devices[i];
          const isOffline = offlineIndex === i;
          const isSource = !!round && round.source === i;
          const receives = !!round && isBroadcast && !isSource && !isOffline;
          const isHover = hoverIndex === i;
          const pending = isOffline && round ? round.pending : 0;
          const justSynced = !!round && round.kind === 'flush' && isSource;

          return (
            <Fragment key={i}>
              {round && isSource && (
                <Ring key={'send-' + round.id} x={d.deviceX + offsetX} y={d.deviceY + offsetY} radius={deviceRadius} color={round.color} delay={0} duration={PHASE_IN} />
              )}
              {round && receives && (
                <Ring key={'recv-' + round.id} x={d.deviceX + offsetX} y={d.deviceY + offsetY} radius={deviceRadius} color={round.color} delay={ARRIVAL - 60} duration={PHASE_IN} />
              )}
              <div
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? 'Write a change on ' + getLabel(i) : undefined}
                onClick={() => triggerWrite(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerWrite(i);
                  }
                }}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex(null)}
                className="rd-device"
                style={{
                  position: 'absolute',
                  left: d.deviceX - deviceRadius + offsetX,
                  top: d.deviceY - deviceRadius + offsetY,
                  width: deviceRadius * 2,
                  height: deviceRadius * 2,
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: interactive ? 'pointer' : undefined,
                  outline: 'none',
                  transform: isHover && interactive ? 'scale(1.06)' : undefined,
                  transition: 'transform 200ms ease',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                }}
              >
                <div
                  ref={(el) => {
                    deviceRefs.current[i] = el;
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <DeviceIcon device={device} dark={dark} scale={scale} />
                </div>

                {pending > 0 && (
                  <div
                    key={'pending-' + pending}
                    className="rd-anim"
                    title={pending + ' pending changes'}
                    style={{
                      ...badgeStyle(scale),
                      background: 'var(--color-top)',
                      animation: 'rd-pop 300ms ease-out',
                    }}
                  >
                    {pending}
                  </div>
                )}
                {justSynced && round && (
                  <div
                    key={'synced-' + round.id}
                    className="rd-anim"
                    title="synced"
                    style={{
                      ...badgeStyle(scale),
                      background: '#1bb76e',
                      animation: `rd-pop 300ms ease-out, rd-fade ${ARRIVAL}ms ease-in ${ARRIVAL}ms 1 forwards`,
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>

              {showLabels && (
                <div
                  style={{
                    position: 'absolute',
                    left: d.labelX + offsetX,
                    top: d.labelY + offsetY,
                    transform: 'translate(-50%, -50%)',
                    fontSize: labelFontSize,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    color: 'white',
                    opacity: isHover ? 1 : isOffline ? 0.5 : 0.75,
                    transition: 'opacity 300ms ease',
                    pointerEvents: 'none',
                  }}
                >
                  {getLabel(i)}
                  {isOffline ? ' (offline)' : ''}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {showStatus && (
        <div
          aria-live="polite"
          style={{
            marginTop: 16 * scale,
            minHeight: '1.5em',
            fontSize: Math.max(12, 14 * scale),
            color: 'white',
            opacity: 0.8,
            textAlign: 'center',
          }}
        >
          <span key={round ? round.id : 'idle'} className="rd-anim" style={{ display: 'inline-block', animation: 'rd-status 400ms ease-out' }}>
            {statusText}
          </span>
        </div>
      )}
    </div>
  );
}

function getStatusText(round: Round | null, getLabel: (i: number) => string, deviceCount: number): string {
  if (!round) {
    return 'Waiting for changes...';
  }
  const source = getLabel(round.source);
  const onlineTargets = deviceCount - 1 - (round.offline !== null && round.offline !== round.source ? 1 : 0);
  switch (round.kind) {
    case 'local':
      return `${source} is offline, the write is stored locally (${round.pending} pending)`;
    case 'flush':
      return round.flushed > 0
        ? `${source} is back online and syncs ${round.flushed} pending ${round.flushed === 1 ? 'change' : 'changes'}`
        : `${source} is back online and pulls the latest state`;
    default:
      return `${source} writes a change, it is replicated to ${onlineTargets} ${onlineTargets === 1 ? 'device' : 'devices'}`;
  }
}

function badgeStyle(scale: number): CSSProperties {
  const size = Math.max(16, 20 * scale);
  return {
    position: 'absolute',
    right: 2 * scale,
    top: 0,
    minWidth: size,
    height: size,
    padding: '0 4px',
    borderRadius: size,
    color: 'white',
    fontSize: size * 0.6,
    fontWeight: 700,
    lineHeight: size + 'px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
    border: '2px solid var(--bg-color-dark)',
    zIndex: 3,
    pointerEvents: 'none',
  };
}

function Ring({ x, y, radius, color, delay, duration }: {
  x: number;
  y: number;
  radius: number;
  color: string;
  delay: number;
  duration: number;
}) {
  return (
    <div
      className="rd-anim"
      style={{
        position: 'absolute',
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        boxShadow: `0 0 12px ${color}, inset 0 0 12px ${color}`,
        opacity: 0,
        pointerEvents: 'none',
        animation: `rd-ring ${duration}ms ease-out ${delay}ms 1 forwards`,
      }}
    />
  );
}

function DeviceIcon({ device, dark, scale }: { device: DeviceType; dark: boolean; scale: number; }) {
  const iconUrl = '/files/logo/logo.svg';
  const transform = scale !== 1 ? `scale(${scale})` : undefined;
  switch (device) {
    case 'phone':
      return (
        <div className="device" style={{ top: '20%', left: '30%' , transform }}>
          <IconDevicePhone dark={dark} iconUrl={iconUrl} />
        </div>
      );
    case 'smartwatch':
      return (
        <div className="device" style={{ width: '80%', top: '20%', left: '17%' , transform }}>
          <IconDeviceSmartwatch dark={dark} iconUrl={iconUrl} />
        </div>
      );
    case 'desktop':
      return (
        <div className="device" style={{ top: '20%', left: '27%', transform }}>
          <IconDeviceDesktop dark={dark} iconUrl={iconUrl} />
        </div>
      );
    default:
      return (
        <div className="device" style={{ top: '20%', left: '27%', transform }}>
          <IconDeviceTablet dark={dark} iconUrl={iconUrl} />
        </div>
      );
  }
}

const KEYFRAMES = `
@keyframes rd-packet-in {
  0%   { transform: translateX(var(--rd-len)); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateX(0px); opacity: 0; }
}
@keyframes rd-packet-out {
  0%   { transform: translateX(0px); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateX(var(--rd-len)); opacity: 0; }
}
@keyframes rd-packet-blocked {
  0%   { transform: translateX(var(--rd-len)); opacity: 0; }
  20%  { opacity: 1; }
  65%  { transform: translateX(var(--rd-stop)); opacity: 1; animation-timing-function: ease-out; }
  80%  { transform: translateX(calc(var(--rd-stop) + 6px)); opacity: 1; animation-timing-function: ease-in; }
  100% { transform: translateX(var(--rd-stop)); opacity: 0; }
}
@keyframes rd-line-flash {
  0%   { opacity: 0; }
  25%  { opacity: 0.9; }
  100% { opacity: 0; }
}
@keyframes rd-ring {
  0%   { transform: scale(0.8); opacity: 0.9; }
  100% { transform: scale(1.45); opacity: 0; }
}
@keyframes rd-pop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes rd-shake {
  0%, 100% { transform: translateX(0) rotate(0); }
  25% { transform: translateX(-3px) rotate(-8deg); }
  50% { transform: translateX(3px) rotate(8deg); }
  75% { transform: translateX(-2px) rotate(-4deg); }
}
@keyframes rd-fade {
  to { opacity: 0; transform: scale(0.6); }
}
@keyframes rd-status {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
.replication-diagram .rd-play {
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.45));
  transition: transform 150ms ease-out;
}
.replication-diagram .rd-play:hover,
.replication-diagram .rd-play:focus-visible {
  transform: translate(-50%, -50%) scale(1.08);
}
.replication-diagram .rd-device:focus-visible {
  box-shadow: 0 0 0 2px var(--color-top);
}
@media (prefers-reduced-motion: reduce) {
  .replication-diagram .rd-anim {
    animation: none !important;
  }
}
`;

function YouTubePlayButtonSvg({ width = 68 }: { width?: number; }) {
  const height = (width * 48) / 68;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 68 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
        fill="#f00"
      />
      <path d="M45 24 27 14v20" fill="#fff" />
    </svg>
  );
}
