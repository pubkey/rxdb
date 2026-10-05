import React from 'react';
import type { CSSProperties } from 'react';
import { LogoParts, logoColorsCss } from './shared';

type Hop = { x: number; y: number; fill: string; dx: number; dy: number; delay: string; };

const HOPS: Hop[] = [
    { x: 51, y: 42, fill: '#ED168F', dx: 190, dy: 0, delay: '0s' },
    { x: 241, y: 42, fill: '#752A8A', dx: -190, dy: 0, delay: '-1.2s' },
    { x: 51, y: 42, fill: '#B2218B', dx: 95, dy: 80, delay: '-.6s' },
    { x: 146, y: 122, fill: '#ED168F', dx: -95, dy: -80, delay: '-1.8s' },
    { x: 241, y: 42, fill: '#B2218B', dx: -95, dy: 80, delay: '-.4s' },
    { x: 146, y: 122, fill: '#752A8A', dx: 95, dy: -80, delay: '-1.6s' }
];

const PEERS: [number, number][] = [[55, 45], [245, 45], [150, 125]];

/**
 * Three RxDB peers replicate directly with each other over WebRTC.
 * Documents move along every edge of the mesh, with no server in the middle.
 */
export function P2pReplicationMesh() {
    return (
        <div className="p2p-replication-mesh">
            <style>{`
                .p2p-replication-mesh { line-height: 0; }
                .p2p-replication-mesh > svg { display: block; width: 100%; height: auto; }
                ${logoColorsCss('.p2p-replication-mesh')}
                .p2p-replication-mesh .mesh { stroke: #A29DB6; stroke-width: 1; stroke-dasharray: 3 4; opacity: .5; }
                .p2p-replication-mesh .hop { opacity: 0; animation: p2p-replication-mesh-hop 2.4s linear infinite; }
                .p2p-replication-mesh .peer { fill: #A29DB6; font-size: 8px; letter-spacing: .06em; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                @keyframes p2p-replication-mesh-hop {
                    0% { opacity: 0; transform: translate(0, 0); }
                    10% { opacity: 1; }
                    85% { opacity: 1; transform: translate(var(--dx), var(--dy)); }
                    95%, 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .p2p-replication-mesh .hop { animation: none; }
                }
            `}</style>
            <svg
                viewBox="-20 -42.5 340 255"
                role="img"
                aria-label="Three RxDB peers replicate documents directly with each other over a WebRTC mesh without a server."
            >
                <line className="mesh" x1="55" y1="45" x2="245" y2="45" />
                <line className="mesh" x1="55" y1="45" x2="150" y2="125" />
                <line className="mesh" x1="245" y1="45" x2="150" y2="125" />
                {HOPS.map((h, i) => (
                    <rect
                        key={i}
                        className="hop"
                        x={h.x}
                        y={h.y}
                        width="8"
                        height="6"
                        rx="1.5"
                        fill={h.fill}
                        style={{ '--dx': h.dx + 'px', '--dy': h.dy + 'px', animationDelay: h.delay } as CSSProperties}
                    />
                ))}
                {PEERS.map(([x, y], i) => (
                    <svg key={'logo' + i} x={x - 22} y={y - 30} width="44" height="60" viewBox="0 0 103.33 140">
                        <LogoParts />
                    </svg>
                ))}
                {PEERS.map(([x, y], i) => (
                    <text key={'peer' + i} className="peer" x={x} y={y + 41} textAnchor="middle">peer</text>
                ))}
            </svg>
        </div>
    );
}
