import React from 'react';
import { LogoParts } from './shared';

/**
 * Isometric stack: the RxDB logo tilts into an isometric view and its three layers
 * lift off the frame like a stack of storage layers, then settle back.
 */
export function IsometricStack() {
    return (
        <div className="isometric-stack">
            <style>{`
                .isometric-stack { line-height: 0; }
                .isometric-stack > .stage { position: relative; width: 100%; aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; perspective: 800px; overflow: hidden; }
                .isometric-stack .iso { position: relative; height: 58%; aspect-ratio: 103.33 / 140; max-width: 100%; transform-style: preserve-3d; animation: isometric-stack-iso 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .isometric-stack .iso > svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; overflow: visible; animation: isometric-stack-lift 6s cubic-bezier(.16, 1, .3, 1) infinite; }
                .isometric-stack .frame .outline { fill: #FFFFFF; }
                .isometric-stack .frame .bar { fill: #262B40; }
                .isometric-stack .frame .corner { fill: #ED168F; }
                .isometric-stack .frame .foot { fill: #752A8A; }
                .isometric-stack .layer .b1 { fill: #ED168F; }
                .isometric-stack .layer .b2 { fill: #B2218B; }
                .isometric-stack .layer .b3 { fill: #752A8A; }
                .isometric-stack .z1 { --isometric-stack-z: 18px; }
                .isometric-stack .z2 { --isometric-stack-z: 36px; }
                .isometric-stack .z3 { --isometric-stack-z: 54px; }
                @keyframes isometric-stack-iso {
                    0%, 12% { transform: none; }
                    32%, 72% { transform: rotateX(58deg) rotateZ(-38deg); }
                    92%, 100% { transform: none; }
                }
                @keyframes isometric-stack-lift {
                    0%, 22% { transform: translateZ(0); }
                    42%, 66% { transform: translateZ(var(--isometric-stack-z, 0)); }
                    84%, 100% { transform: translateZ(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .isometric-stack .iso, .isometric-stack .iso > svg { animation: none; }
                }
            `}</style>
            <div className="stage">
                <div
                    className="iso"
                    role="img"
                    aria-label="The RxDB logo tilts into an isometric view and its three layers lift off the frame like a stack of storage layers, then settle back."
                >
                    <svg className="frame" viewBox="0 0 103.33 140" aria-hidden="true">
                        <LogoParts />
                    </svg>
                    <svg className="layer z1" viewBox="0 0 103.33 140" aria-hidden="true">
                        <rect className="b3" x="6.66" y="86.66" width="90" height="20" />
                    </svg>
                    <svg className="layer z2" viewBox="0 0 103.33 140" aria-hidden="true">
                        <rect className="b2" x="6.67" y="60" width="90" height="20" />
                    </svg>
                    <svg className="layer z3" viewBox="0 0 103.33 140" aria-hidden="true">
                        <rect className="b1" x="6.66" y="33.34" width="90" height="20" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
