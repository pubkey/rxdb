import React, { useId } from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * A raw gray document moves through the preInsert hook gate
 * and comes out as the colored middle layer of the RxDB logo.
 */
export function MiddlewareHook() {
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const beforeId = 'middleware-hook-before-' + id;
    const afterId = 'middleware-hook-after-' + id;
    return (
        <div className="middleware-hook">
            <style>{`
                .middleware-hook { line-height: 0; }
                .middleware-hook > svg { display: block; width: 100%; height: auto; }
                .middleware-hook .mh-stage { overflow: visible; }
                .middleware-hook .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.middleware-hook')}
                .middleware-hook .mh-mark .b2 { opacity: 0; }
                .middleware-hook .mh-mv { transform-box: fill-box; animation: middleware-hook-move 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .middleware-hook .mh-raw { fill: #5A5F78; }
                .middleware-hook .mh-new { fill: #B2218B; }
                .middleware-hook .mh-gate { stroke: #FFFFFF; stroke-width: 1.4; stroke-dasharray: 2 2; }
                .middleware-hook .mh-label { fill: #A29DB6; font-size: 8px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                @keyframes middleware-hook-move {
                    0% { opacity: 0; transform: translateX(-125%); }
                    8% { opacity: 1; transform: translateX(-125%); }
                    60%, 88% { opacity: 1; transform: none; }
                    96%, 100% { opacity: 0; transform: none; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .middleware-hook .mh-mv { animation: none; }
                }
            `}</style>
            <svg
                viewBox="0 0 300 225"
                role="img"
                aria-label="A raw gray document passes through the preInsert middleware hook, comes out changed and lands as the middle layer of the RxDB logo."
            >
                <svg className="mh-stage" x="56" y="38" width="189" height="149" viewBox="-110 -14 213.33 168">
                    <defs>
                        <clipPath id={beforeId}><rect x="-200" y="-20" width="188" height="200" /></clipPath>
                        <clipPath id={afterId}><rect x="-12" y="-20" width="200" height="200" /></clipPath>
                    </defs>
                    <g className="mh-mark"><LogoParts /></g>
                    <g clipPath={'url(#' + beforeId + ')'}>
                        <rect className="mh-mv mh-raw" x="6.67" y="60" width="90" height="20" />
                    </g>
                    <g clipPath={'url(#' + afterId + ')'}>
                        <rect className="mh-mv mh-new" x="6.67" y="60" width="90" height="20" />
                    </g>
                    <line className="mh-gate" x1="-12" y1="50" x2="-12" y2="90" />
                    <text className="mh-label" x="-15" y="47" textAnchor="end">preInsert</text>
                </svg>
            </svg>
        </div>
    );
}
