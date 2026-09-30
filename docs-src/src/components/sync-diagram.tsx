import React, { useEffect, useId, useRef, useState } from 'react';

export type SyncDiagramNode = {
  label?: string;
  icon?: string;
  /**
   * Small second line below the label,
   * for example "Node.js" or "Postgres".
   */
  sublabel?: string;
};

export type SyncDiagramFlow = 'both' | 'push' | 'pull';

export type SyncDiagramProps = {
  /**
   * The client devices on the left side.
   * [default=['Client A', 'Client B', 'Client C']]
   */
  clients?: (string | SyncDiagramNode)[];
  /**
   * The optional server in the middle.
   * Set to false to connect the clients directly to the backend.
   * [default={ label: 'RxServer' }]
   */
  server?: boolean | string | SyncDiagramNode;
  /**
   * The backend on the right side.
   * [default={ label: 'Backend' }]
   */
  backend?: string | SyncDiagramNode;
  /**
   * Which direction the animated packets travel.
   * [default='both']
   */
  flow?: SyncDiagramFlow;
  /**
   * Enables the packet animations.
   * [default=true]
   */
  animated?: boolean;
  /**
   * Seconds one packet needs to travel over one connection.
   * [default=0.9]
   */
  hopDuration?: number;
  /**
   * Periodically takes one client offline,
   * lets it queue local writes and replays them when it reconnects.
   * [default=false]
   */
  simulateOffline?: boolean;
  /**
   * Text shown above the client connections, for example "HTTP" or "WebSocket".
   */
  clientConnectionLabel?: string;
  /**
   * Text shown above the connection between server and backend, for example "Change Stream".
   */
  backendConnectionLabel?: string;
  /**
   * Shows a legend that explains the packet colors.
   * [default=true when animated]
   */
  showLegend?: boolean;
  caption?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;

  /**
   * Shortcut props, used when clients/server/backend are not set.
   */
  clientLabels?: string[];
  serverLabel?: string;
  dbLabel?: string;
  dbIcon?: string;
  showServer?: boolean;
};

const RXDB_LOGO = '/files/logo/logo.svg';

const PAD_Y = 30;
const CLIENT_H = 64;
const CLIENT_GAP = 26;
const LINK_INSET = 7;

/**
 * On narrow screens the boxes and links are shrunk
 * so that the text keeps a readable size after the SVG is scaled down.
 */
const COMPACT_BREAKPOINT = 600;
const LAYOUTS = {
  normal: { clientW: 230, serverW: 200, backendW: 210, linkW: 120, directLinkW: 220 },
  compact: { clientW: 160, serverW: 150, backendW: 160, linkW: 56, directLinkW: 110 },
};

type Point = { x: number; y: number; };
type Hop = {
  key: string;
  from: Point;
  to: Point;
  start: number;
  kind: 'push' | 'pull';
  clients: number[];
};
type Halo = {
  key: string;
  target: 'server' | 'backend' | number;
  at: number;
  kind: 'push' | 'pull';
  clients: number[];
};

function toNode(value: string | SyncDiagramNode | undefined, fallback: SyncDiagramNode): SyncDiagramNode {
  if (typeof value === 'string') {
    return { ...fallback, label: value };
  }
  if (!value) {
    return fallback;
  }
  /**
   * A node with only an icon (like a wordmark logo)
   * must not get the fallback label.
   */
  const hasOwnLabel = value.label !== undefined || !!value.icon;
  return {
    ...fallback,
    ...value,
    label: hasOwnLabel ? value.label : fallback.label,
  };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function SyncDiagram(props: SyncDiagramProps) {
  const {
    flow = 'both',
    animated = true,
    hopDuration = 0.9,
    simulateOffline = false,
    clientConnectionLabel,
    backendConnectionLabel,
    caption,
    className = '',
    style,
  } = props;

  const rawId = useId();
  const uid = 'sd' + rawId.replace(/[^a-zA-Z0-9]/g, '');

  const clients: SyncDiagramNode[] = (
    props.clients ??
    props.clientLabels ??
    ['Client A', 'Client B', 'Client C']
  ).map(c => toNode(c, { icon: RXDB_LOGO }));

  const serverProp = props.server ?? (props.showServer === false ? false : (props.serverLabel ?? true));
  const hasServer = serverProp !== false;
  const server = toNode(serverProp === true ? undefined : (serverProp as string | SyncDiagramNode), {
    label: 'RxServer',
    icon: RXDB_LOGO,
  });
  const backend = toNode(
    props.backend ?? (props.dbLabel !== undefined || props.dbIcon ? { label: props.dbLabel, icon: props.dbIcon } : undefined),
    { label: 'Backend' }
  );

  const figureRef = useRef<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = figureRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setCompact(w > 0 && w < COMPACT_BREAKPOINT);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const {
    clientW: CLIENT_W,
    serverW: SERVER_W,
    backendW: BACKEND_W,
    linkW: LINK_W,
    directLinkW: DIRECT_LINK_W,
  } = compact ? LAYOUTS.compact : LAYOUTS.normal;

  const reducedMotion = usePrefersReducedMotion();
  const isAnimated = animated && !reducedMotion;
  const showLegend = props.showLegend ?? animated;

  /**
   * Geometry
   */
  const n = Math.max(clients.length, 1);
  const innerH = n * CLIENT_H + (n - 1) * CLIENT_GAP;
  const height = innerH + PAD_Y * 2;
  const serverX = CLIENT_W + LINK_W;
  const backendX = hasServer ? serverX + SERVER_W + LINK_W : CLIENT_W + DIRECT_LINK_W;
  const width = backendX + BACKEND_W;
  const midY = PAD_Y + innerH / 2;
  const clientY = (i: number) => PAD_Y + i * (CLIENT_H + CLIENT_GAP);
  const clientCenterY = (i: number) => clientY(i) + CLIENT_H / 2;
  const clientTargetX = hasServer ? serverX : backendX;

  const clientLinkFrom = (i: number): Point => ({ x: CLIENT_W + LINK_INSET, y: clientCenterY(i) });
  const clientLinkTo = (i: number): Point => ({ x: clientTargetX - LINK_INSET, y: clientCenterY(i) });
  const serverLinkFrom: Point = { x: serverX + SERVER_W + LINK_INSET, y: midY };
  const serverLinkTo: Point = { x: backendX - LINK_INSET, y: midY };

  /**
   * Timeline: each client writes in turn. The write travels to the backend
   * and the resulting change is then streamed to every other client.
   */
  const d = hopDuration;
  const period = Math.max(n * 2 * d, hasServer ? 5 * d : 3.4 * d);
  const hops: Hop[] = [];
  const halos: Halo[] = [];
  const all = clients.map((_, i) => i);
  clients.forEach((_, i) => {
    const s = (i * period) / n;
    const others = all.filter(j => j !== i);
    let t = s;
    if (flow !== 'pull') {
      hops.push({ key: `p1-${i}`, from: clientLinkFrom(i), to: clientLinkTo(i), start: t, kind: 'push', clients: [i] });
      t += d;
      if (hasServer) {
        halos.push({ key: `hs-${i}`, target: 'server', at: t, kind: 'push', clients: [i] });
        hops.push({ key: `p2-${i}`, from: serverLinkFrom, to: serverLinkTo, start: t, kind: 'push', clients: [i] });
        t += d;
      }
      halos.push({ key: `hb-${i}`, target: 'backend', at: t, kind: 'push', clients: [i] });
      t += d * 0.2;
    }
    if (flow !== 'push') {
      const receivers = flow === 'pull' ? all : others;
      if (hasServer) {
        hops.push({ key: `l1-${i}`, from: serverLinkTo, to: serverLinkFrom, start: t, kind: 'pull', clients: flow === 'pull' ? [] : [i] });
        t += d;
        halos.push({ key: `hs2-${i}`, target: 'server', at: t, kind: 'pull', clients: flow === 'pull' ? [] : [i] });
      }
      receivers.forEach(j => {
        hops.push({
          key: `l2-${i}-${j}`,
          from: clientLinkTo(j),
          to: clientLinkFrom(j),
          start: t,
          kind: 'pull',
          clients: flow === 'pull' ? [j] : [i, j],
        });
        halos.push({ key: `hc-${i}-${j}`, target: j, at: t + d, kind: 'pull', clients: flow === 'pull' ? [j] : [i, j] });
      });
    }
  });

  /**
   * Offline simulation
   */
  const [offlineIndex, setOfflineIndex] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [burst, setBurst] = useState<{ client: number; count: number; key: number; } | null>(null);
  const pendingRef = useRef(0);

  useEffect(() => {
    if (!simulateOffline || !isAnimated || clients.length < 2) {
      setOfflineIndex(null);
      return;
    }
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let last = -1;
    const onlineMs = period * 2 * 1000;
    const offlineMs = period * 1.6 * 1000;

    const goOffline = () => {
      if (cancelled) return;
      let idx = Math.floor(Math.random() * clients.length);
      if (idx === last) {
        idx = (idx + 1) % clients.length;
      }
      last = idx;
      pendingRef.current = 0;
      setPending(0);
      setOfflineIndex(idx);
      interval = setInterval(() => {
        pendingRef.current += 1;
        setPending(pendingRef.current);
      }, Math.max(d * 1000, 600));
      timeout = setTimeout(goOnline, offlineMs);
    };
    const goOnline = () => {
      if (cancelled) return;
      if (interval) clearInterval(interval);
      setBurst({ client: last, count: Math.max(pendingRef.current, 1), key: Date.now() });
      setOfflineIndex(null);
      setPending(0);
      timeout = setTimeout(goOffline, onlineMs);
    };
    timeout = setTimeout(goOffline, onlineMs / 2);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulateOffline, isAnimated, clients.length, period, d]);

  const isOffline = (i: number) => offlineIndex === i;
  const involvesOffline = (idx: number[]) => offlineIndex !== null && idx.includes(offlineIndex);

  const pathOf = (a: Point, b: Point) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const fmt = (v: number) => Number(v.toFixed(4));

  const renderPacket = (hop: Hop) => {
    const frac = fmt(d / period);
    const fadeAt = fmt(frac * 0.94);
    return (
      <g key={hop.key} className={`packet packet-${hop.kind}`} opacity={0}>
        <circle r={9} className="packet-glow" />
        <circle r={5} className="packet-core" />
        <animateMotion
          path={pathOf(hop.from, hop.to)}
          dur={`${period}s`}
          begin={`${fmt(hop.start)}s`}
          repeatCount="indefinite"
          keyPoints="0;1;1"
          keyTimes={`0;${frac};1`}
          calcMode="linear"
        />
        <animate
          attributeName="opacity"
          dur={`${period}s`}
          begin={`${fmt(hop.start)}s`}
          repeatCount="indefinite"
          values="0;1;1;0;0"
          keyTimes={`0;${fmt(frac * 0.1)};${fadeAt};${frac};1`}
        />
      </g>
    );
  };

  const haloRect = (target: Halo['target']) => {
    if (target === 'server') {
      return { x: serverX, y: PAD_Y, w: SERVER_W, h: innerH };
    }
    if (target === 'backend') {
      return { x: backendX, y: PAD_Y, w: BACKEND_W, h: innerH };
    }
    return { x: 0, y: clientY(target), w: CLIENT_W, h: CLIENT_H };
  };

  const renderHalo = (halo: Halo) => {
    const r = haloRect(halo.target);
    const len = Math.min(d * 0.7, period * 0.3);
    return (
      <rect
        key={halo.key}
        className={`halo halo-${halo.kind}`}
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={14}
        opacity={0}
      >
        <animate
          attributeName="opacity"
          dur={`${period}s`}
          begin={`${fmt(halo.at)}s`}
          repeatCount="indefinite"
          values="0;1;0;0"
          keyTimes={`0;${fmt((len * 0.15) / period)};${fmt(len / period)};1`}
        />
      </rect>
    );
  };

  const renderNodeContent = (node: SyncDiagramNode, opts: { big?: boolean; status?: React.ReactNode; }) => {
    const iconOnly = !node.label && !!node.icon;
    return (
      <div className={`node-content${iconOnly ? ' icon-only' : ''}${opts.big ? ' big' : ''}`}>
        <div className="node-main">
          {node.icon && <img src={node.icon} alt="" aria-hidden className="node-icon" />}
          {node.label && <span className="node-label">{node.label}</span>}
        </div>
        {node.sublabel && <div className="node-sub">{node.sublabel}</div>}
        {opts.status}
      </div>
    );
  };

  const defaultAria = [
    clients.map(c => c.label).filter(Boolean).join(', '),
    hasServer ? server.label : undefined,
    backend.label || 'backend',
  ].filter(Boolean).join(' sync with ');
  const ariaLabel = props.ariaLabel ?? `Sync diagram: ${defaultAria}`;

  return (
    <figure ref={figureRef} className={`sync-diagram${compact ? ' is-compact' : ''} ${className}`} style={style}>
      <style>{`
        .sync-diagram {
          --sd-push: var(--color-top, #ED168F);
          --sd-pull: #b98cff;
          --sd-line: rgba(255, 255, 255, 0.28);
          --sd-box: var(--bg-color, #20293C);
          --sd-text: var(--ifm-font-color-base, #fff);
          margin: 24px auto;
          padding: 0;
          width: 100%;
          max-width: 100%;
          color: var(--sd-text);
        }
        .sync-diagram svg {
          display: block;
          width: 100%;
          height: auto;
          overflow: visible;
        }
        .sync-diagram .box {
          fill: var(--sd-box);
          stroke-width: 1.5;
          transition: opacity 0.4s ease;
        }
        .sync-diagram .box-client { stroke: url(#${uid}-grad-client); }
        .sync-diagram .box-server { stroke: url(#${uid}-grad-server); }
        .sync-diagram .box-backend { stroke: url(#${uid}-grad-backend); }
        .sync-diagram .client.is-offline .box {
          stroke-dasharray: 6 5;
          opacity: 0.55;
        }
        .sync-diagram .client.is-offline foreignObject { opacity: 0.75; }
        .sync-diagram .link {
          stroke: var(--sd-line);
          stroke-width: 2;
          fill: none;
          transition: stroke 0.4s ease, opacity 0.4s ease;
        }
        .sync-diagram .link.is-offline {
          stroke-dasharray: 4 6;
          opacity: 0.45;
        }
        .sync-diagram .arrow-head { fill: var(--sd-line); }
        .sync-diagram .packet-push .packet-core { fill: var(--sd-push); }
        .sync-diagram .packet-push .packet-glow { fill: var(--sd-push); opacity: 0.3; }
        .sync-diagram .packet-pull .packet-core { fill: var(--sd-pull); }
        .sync-diagram .packet-pull .packet-glow { fill: var(--sd-pull); opacity: 0.3; }
        .sync-diagram .halo {
          fill: none;
          stroke-width: 3;
          filter: url(#${uid}-blur);
        }
        .sync-diagram .halo-push { stroke: var(--sd-push); }
        .sync-diagram .halo-pull { stroke: var(--sd-pull); }
        .sync-diagram .conn-label {
          fill: var(--sd-text);
          opacity: 0.6;
          font-size: 13px;
          font-family: var(--ifm-font-family-monospace, monospace);
        }
        .sync-diagram .offline-badge circle {
          fill: var(--sd-box);
          stroke: #ff6b6b;
          stroke-width: 1.5;
        }
        .sync-diagram .offline-badge path {
          stroke: #ff6b6b;
          stroke-width: 2;
          stroke-linecap: round;
        }
        .sync-diagram .offline-badge {
          animation: ${uid}-pop 0.35s ease-out;
          transform-box: fill-box;
          transform-origin: center;
        }
        .sync-diagram .node-content {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4px 10px;
          font-family: inherit;
          color: var(--sd-text);
          line-height: 1.15;
          user-select: none;
        }
        .sync-diagram .node-main {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          max-width: 100%;
        }
        .sync-diagram .node-icon {
          height: 26px;
          width: auto;
          flex-shrink: 0;
          object-fit: contain;
        }
        .sync-diagram .node-content.big .node-icon { height: 34px; }
        .sync-diagram .node-content.icon-only .node-icon {
          height: auto;
          width: 78%;
          max-height: 60px;
        }
        .sync-diagram .node-label {
          font-weight: 700;
          font-size: 19px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sync-diagram .node-content.big .node-label { font-size: 22px; }
        .sync-diagram.is-compact .node-content.big .node-label { font-size: 19px; }
        .sync-diagram.is-compact .node-main { gap: 6px; }
        .sync-diagram.is-compact .node-icon { height: 22px; }
        .sync-diagram.is-compact .node-content.big .node-icon { height: 26px; }
        .sync-diagram.is-compact .node-content.big .node-main { flex-direction: column; }
        .sync-diagram .node-sub {
          margin-top: 4px;
          font-size: 13px;
          opacity: 0.65;
        }
        .sync-diagram .node-status {
          margin-top: 3px;
          font-size: 12px;
          font-weight: 600;
          color: #ff6b6b;
          white-space: nowrap;
        }
        .sync-diagram .node-status.is-syncing { color: var(--sd-push); }
        .sync-diagram figcaption {
          margin-top: 10px;
          text-align: center;
          font-size: 0.9em;
          opacity: 0.8;
        }
        .sync-diagram .legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px 22px;
          margin-top: 12px;
          font-size: 0.85em;
          opacity: 0.85;
        }
        .sync-diagram .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .sync-diagram .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .sync-diagram .legend-dot.push { background: var(--sd-push); box-shadow: 0 0 8px var(--sd-push); }
        .sync-diagram .legend-dot.pull { background: var(--sd-pull); box-shadow: 0 0 8px var(--sd-pull); }
        .sync-diagram .legend-dot.offline {
          background: transparent;
          border: 1.5px dashed #ff6b6b;
          box-shadow: none;
        }
        @keyframes ${uid}-pop {
          from { transform: scale(0.2); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sync-diagram .packet,
          .sync-diagram .halo { display: none; }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${uid}-grad-client`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--color-top, #ED168F)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-middle, #b2218b)' }} />
          </linearGradient>
          <linearGradient id={`${uid}-grad-server`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--color-middle, #b2218b)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-bottom, #752a8a)' }} />
          </linearGradient>
          <linearGradient id={`${uid}-grad-backend`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: '#b98cff' }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-bottom, #752a8a)' }} />
          </linearGradient>
          <marker
            id={`${uid}-arrow`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-head" />
          </marker>
          <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Connections */}
        {clients.map((_, i) => {
          const from = clientLinkFrom(i);
          const to = clientLinkTo(i);
          const offline = isOffline(i);
          const cx = (from.x + to.x) / 2;
          return (
            <g key={`link-${i}`}>
              <line
                className={`link${offline ? ' is-offline' : ''}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                markerStart={flow !== 'push' ? `url(#${uid}-arrow)` : undefined}
                markerEnd={flow !== 'pull' ? `url(#${uid}-arrow)` : undefined}
              />
              {offline && (
                <g className="offline-badge" aria-hidden>
                  <circle cx={cx} cy={from.y} r={11} />
                  <path d={`M ${cx - 4.5} ${from.y - 4.5} L ${cx + 4.5} ${from.y + 4.5} M ${cx + 4.5} ${from.y - 4.5} L ${cx - 4.5} ${from.y + 4.5}`} />
                </g>
              )}
            </g>
          );
        })}
        {hasServer && (
          <line
            className="link"
            x1={serverLinkFrom.x}
            y1={serverLinkFrom.y}
            x2={serverLinkTo.x}
            y2={serverLinkTo.y}
            markerStart={flow !== 'push' ? `url(#${uid}-arrow)` : undefined}
            markerEnd={flow !== 'pull' ? `url(#${uid}-arrow)` : undefined}
          />
        )}

        {clientConnectionLabel && !compact && (
          <text
            className="conn-label"
            x={(clientLinkFrom(0).x + clientLinkTo(0).x) / 2}
            y={clientCenterY(0) - 18}
            textAnchor="middle"
          >
            {clientConnectionLabel}
          </text>
        )}
        {hasServer && backendConnectionLabel && !compact && (
          <text
            className="conn-label"
            x={(serverLinkFrom.x + serverLinkTo.x) / 2}
            y={midY - 18}
            textAnchor="middle"
          >
            {backendConnectionLabel}
          </text>
        )}

        {/* Clients */}
        {clients.map((client, i) => {
          const offline = isOffline(i);
          const syncing = !offline && burst && burst.client === i;
          let status: React.ReactNode = null;
          if (offline) {
            status = (
              <div className="node-status">
                offline{pending > 0 ? ` · ${pending} queued` : ''}
              </div>
            );
          } else if (syncing) {
            status = <div className="node-status is-syncing" key={burst.key}>back online · syncing</div>;
          }
          return (
            <g key={`client-${i}`} className={`client${offline ? ' is-offline' : ''}`}>
              <rect className="box box-client" x={0} y={clientY(i)} width={CLIENT_W} height={CLIENT_H} rx={14} />
              <foreignObject x={0} y={clientY(i)} width={CLIENT_W} height={CLIENT_H}>
                {renderNodeContent(client, { status })}
              </foreignObject>
            </g>
          );
        })}

        {/* Server */}
        {hasServer && (
          <g className="server">
            <rect className="box box-server" x={serverX} y={PAD_Y} width={SERVER_W} height={innerH} rx={14} />
            <foreignObject x={serverX} y={PAD_Y} width={SERVER_W} height={innerH}>
              {renderNodeContent(server, { big: true })}
            </foreignObject>
          </g>
        )}

        {/* Backend */}
        <g className="backend">
          <rect className="box box-backend" x={backendX} y={PAD_Y} width={BACKEND_W} height={innerH} rx={14} />
          <foreignObject x={backendX} y={PAD_Y} width={BACKEND_W} height={innerH}>
            {renderNodeContent(backend, { big: true })}
          </foreignObject>
        </g>

        {/* Animations */}
        {isAnimated && (
          <g aria-hidden>
            {halos.filter(h => !involvesOffline(h.clients)).map(renderHalo)}
            {hops.filter(h => !involvesOffline(h.clients)).map(renderPacket)}
            {burst && offlineIndex === null && (
              <ReconnectBurst
                key={burst.key}
                count={burst.count}
                path={pathOf(clientLinkFrom(burst.client), clientLinkTo(burst.client))}
                duration={d}
                showPush={flow !== 'pull'}
                showPull={flow !== 'push'}
                onDone={() => setBurst(null)}
              />
            )}
          </g>
        )}
      </svg>

      {showLegend && (
        <div className="legend" aria-hidden>
          {flow !== 'pull' && (
            <span className="legend-item"><span className="legend-dot push" />Push: local writes</span>
          )}
          {flow !== 'push' && (
            <span className="legend-item"><span className="legend-dot pull" />Pull: remote changes</span>
          )}
          {simulateOffline && isAnimated && (
            <span className="legend-item"><span className="legend-dot offline" />Offline: writes are queued and synced on reconnect</span>
          )}
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/**
 * Replays the writes a client has queued while it was offline.
 * Uses begin="indefinite" and starts the animations manually
 * because they must run exactly once, relative to the reconnect.
 */
function ReconnectBurst({
  count,
  path,
  duration,
  showPush,
  showPull,
  onDone,
}: {
  count: number;
  path: string;
  duration: number;
  showPush: boolean;
  showPull: boolean;
  onDone: () => void;
}) {
  const ref = useRef<SVGGElement | null>(null);
  const visible = Math.min(count, 6);
  const gap = duration * 0.35;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const animations = Array.from(root.querySelectorAll('animate, animateMotion')) as unknown as SVGAnimationElement[];
    animations.forEach(el => {
      const offset = Number(el.getAttribute('data-offset') || 0);
      try {
        el.beginElementAt(offset);
      } catch {
        // SMIL is not supported, the burst is skipped.
      }
    });
    const total = (visible * gap + duration * 2.2) * 1000;
    const timeout = setTimeout(onDone, total);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const packets: { kind: 'push' | 'pull'; offset: number; }[] = [];
  if (showPush) {
    for (let i = 0; i < visible; i++) {
      packets.push({ kind: 'push', offset: i * gap });
    }
  }
  if (showPull) {
    packets.push({ kind: 'pull', offset: (showPush ? visible * gap : 0) + duration * 0.2 });
  }

  return (
    <g ref={ref}>
      {packets.map((p, i) => (
        <g key={i} className={`packet packet-${p.kind}`} opacity={0}>
          <circle r={9} className="packet-glow" />
          <circle r={5} className="packet-core" />
          <animateMotion
            path={path}
            dur={`${duration}s`}
            begin="indefinite"
            data-offset={p.offset}
            keyPoints={p.kind === 'push' ? '0;1' : '1;0'}
            keyTimes="0;1"
            calcMode="linear"
            fill="freeze"
          />
          <animate
            attributeName="opacity"
            dur={`${duration}s`}
            begin="indefinite"
            data-offset={p.offset}
            values="1;1;0"
            keyTimes="0;0.9;1"
            fill="freeze"
          />
        </g>
      ))}
    </g>
  );
}
