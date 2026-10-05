import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * Offline-first: the connection drops, the RxDB logo keeps writing locally
 * and queues three changes. When the connection returns, the queue flushes upstream.
 */
export function OfflineQueue() {
    return (
        <div className="offline-queue">
            <style>{`
                .offline-queue { line-height: 0; }
                .offline-queue > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .offline-queue .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.offline-queue')}
                .offline-queue .b1 { animation: offline-queue-write 6s infinite; }
                .offline-queue .q { opacity: 0; transform-box: fill-box; transform-origin: center; }
                .offline-queue .q1 { fill: #ED168F; animation: offline-queue-q1 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .offline-queue .q2 { fill: #B2218B; animation: offline-queue-q2 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .offline-queue .q3 { fill: #752A8A; animation: offline-queue-q3 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .offline-queue .wire { stroke: #A29DB6; stroke-width: 1.2; stroke-dasharray: 2 3; fill: none; animation: offline-queue-wire 6s infinite; }
                .offline-queue .pill rect { fill: #0D0F18; stroke: #262B40; stroke-width: 1; }
                .offline-queue .pill text { fill: #ECE9F2; font-size: 11px; letter-spacing: .04em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .offline-queue .pill-on circle { fill: #3DD68C; }
                .offline-queue .pill-off circle { fill: #A29DB6; }
                .offline-queue .pill-on { animation: offline-queue-st-on 6s infinite; }
                .offline-queue .pill-off { opacity: 0; animation: offline-queue-st-off 6s infinite; }
                @keyframes offline-queue-st-on { 0%, 46% { opacity: 1; } 49%, 95% { opacity: 0; } 98%, 100% { opacity: 1; } }
                @keyframes offline-queue-st-off { 0%, 46% { opacity: 0; } 49%, 95% { opacity: 1; } 98%, 100% { opacity: 0; } }
                @keyframes offline-queue-wire { 0%, 46% { opacity: .7; } 49%, 95% { opacity: .12; } 98%, 100% { opacity: .7; } }
                @keyframes offline-queue-write {
                    0%, 57%, 62%, 67%, 72%, 77%, 82%, 100% { fill: #ED168F; }
                    58%, 68%, 78% { fill: #FFFFFF; }
                }
                @keyframes offline-queue-q1 { 0%, 58% { opacity: 0; transform: scale(0); } 62%, 94% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-80px); } }
                @keyframes offline-queue-q2 { 0%, 68% { opacity: 0; transform: scale(0); } 72%, 95% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-80px); } }
                @keyframes offline-queue-q3 { 0%, 78% { opacity: 0; transform: scale(0); } 82%, 96% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-80px); } }
                @media (prefers-reduced-motion: reduce) {
                    .offline-queue .b1, .offline-queue .q, .offline-queue .wire, .offline-queue .pill-on, .offline-queue .pill-off { animation: none; }
                }
            `}</style>
            <svg
                viewBox="-120 -80 370 278"
                role="img"
                aria-label="The RxDB logo keeps writing locally while the connection is offline and queues three changes, then flushes the queue upstream when it is back online."
            >
                <g className="pill pill-on" aria-hidden="true">
                    <rect x="-108" y="-68" width="212" height="24" rx="12" />
                    <circle cx="-95.5" cy="-56" r="3.5" />
                    <text x="-85" y="-56" dominantBaseline="central">online · synced</text>
                </g>
                <g className="pill pill-off" aria-hidden="true">
                    <rect x="-108" y="-68" width="212" height="24" rx="12" />
                    <circle cx="-95.5" cy="-56" r="3.5" />
                    <text x="-85" y="-56" dominantBaseline="central">offline · writing locally</text>
                </g>
                <LogoParts />
                <path className="wire" d="M119 -24 V 60" />
                <rect className="q q1" x="112" y="96" width="14" height="8" rx="2" />
                <rect className="q q2" x="112" y="84" width="14" height="8" rx="2" />
                <rect className="q q3" x="112" y="72" width="14" height="8" rx="2" />
            </svg>
        </div>
    );
}
