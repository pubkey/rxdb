import React from 'react';
import { LogoParts } from './shared';

/**
 * The RxDB logo with an RGB split glitch.
 * The glitch plays every few seconds and speeds up on hover.
 */
export function GlitchLogo({ width = 120 }: { width?: number; }) {
    return (
        <span className="glitch-logo" style={{ width }}>
            <style>{`
                .glitch-logo { display: inline-block; line-height: 0; }
                .glitch-logo svg { width: 100%; height: auto; overflow: visible; }
                .glitch-logo .outline { fill: #FFFFFF; }
                .glitch-logo .b1, .glitch-logo .corner { fill: #ED168F; }
                .glitch-logo .b2 { fill: #B2218B; }
                .glitch-logo .b3, .glitch-logo .foot { fill: #752A8A; }
                .glitch-logo .gl { mix-blend-mode: screen; opacity: 0; }
                .glitch-logo .gl-a .part { fill: #3FE0FF; }
                .glitch-logo .gl-b .part { fill: #ED168F; }
                .glitch-logo .gl-a { animation: glitch-logo-a 3.2s steps(1) infinite; }
                .glitch-logo .gl-b { animation: glitch-logo-b 3.2s steps(1) infinite; }
                .glitch-logo .main { animation: glitch-logo-main 3.2s steps(1) infinite; }
                .glitch-logo:hover .gl, .glitch-logo:hover .main { animation-duration: .9s; }
                @keyframes glitch-logo-a {
                    0%, 78% { opacity: 0; transform: none; clip-path: none; }
                    80% { opacity: .9; transform: translate(-4px, 0); clip-path: inset(10% 0 55% 0); }
                    83% { transform: translate(3px, 0); clip-path: inset(60% 0 12% 0); }
                    86% { transform: translate(-2px, 0); clip-path: inset(30% 0 40% 0); }
                    89% { transform: translate(5px, 0); clip-path: inset(0 0 80% 0); }
                    92%, 100% { opacity: 0; transform: none; clip-path: none; }
                }
                @keyframes glitch-logo-b {
                    0%, 78% { opacity: 0; transform: none; clip-path: none; }
                    80% { opacity: .9; transform: translate(4px, 0); clip-path: inset(50% 0 20% 0); }
                    83% { transform: translate(-3px, 0); clip-path: inset(5% 0 70% 0); }
                    86% { transform: translate(2px, 0); clip-path: inset(70% 0 5% 0); }
                    89% { transform: translate(-5px, 0); clip-path: inset(40% 0 35% 0); }
                    92%, 100% { opacity: 0; transform: none; clip-path: none; }
                }
                @keyframes glitch-logo-main {
                    0%, 78% { transform: none; }
                    80% { transform: translate(2px, 0); }
                    84% { transform: translate(-1px, 0) skewX(-6deg); }
                    88% { transform: translate(1px, 0); }
                    92%, 100% { transform: none; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .glitch-logo .gl, .glitch-logo .main { animation: none; }
                }
            `}</style>
            <svg viewBox="0 0 103.33 140" role="img" aria-label="RxDB logo">
                <g className="main"><LogoParts /></g>
                <g className="gl gl-a"><LogoParts /></g>
                <g className="gl gl-b"><LogoParts /></g>
            </svg>
        </span>
    );
}
