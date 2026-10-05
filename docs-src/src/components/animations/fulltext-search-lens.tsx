import React, { useId } from 'react';
import { LogoParts } from './shared';

/**
 * A magnifying lens scans the layers of the RxDB logo with a 1.8x zoom
 * and stops on the layer that matches the fulltext search.
 */
export function FulltextSearchLens() {
    const clipId = 'fulltext-search-lens-clip-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
    return (
        <div className="fulltext-search-lens">
            <style>{`
                .fulltext-search-lens { line-height: 0; }
                .fulltext-search-lens > svg { display: block; width: 100%; height: auto; }
                .fulltext-search-lens text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .fulltext-search-lens .part { transform-box: fill-box; transform-origin: center; }
                .fulltext-search-lens .outline { fill: #FFFFFF; }
                .fulltext-search-lens .b1 { --c: #ED168F; }
                .fulltext-search-lens .b2 { --c: #B2218B; }
                .fulltext-search-lens .b3 { --c: #752A8A; }
                .fulltext-search-lens .bar { fill: var(--c); }
                .fulltext-search-lens .corner { fill: #ED168F; }
                .fulltext-search-lens .foot { fill: #752A8A; }
                .fulltext-search-lens .lens, .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg, .fulltext-search-lens .zoom { transform-box: view-box; transform-origin: 0 0; }
                .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg { animation: fulltext-search-lens-move 6s ease-in-out infinite; }
                .fulltext-search-lens .zoom { animation: fulltext-search-lens-zoom 6s ease-in-out infinite; }
                .fulltext-search-lens .lens-wrap { animation: fulltext-search-lens-fade 6s infinite; }
                .fulltext-search-lens .lens { animation: fulltext-search-lens-move 6s ease-in-out infinite, fulltext-search-lens-fade 6s infinite; }
                .fulltext-search-lens .lens-bg { fill: #141725; }
                .fulltext-search-lens .ring { fill: none; stroke: #FFFFFF; stroke-width: 2.5; }
                .fulltext-search-lens .handle { stroke: #FFFFFF; stroke-width: 4.5; stroke-linecap: round; }
                .fulltext-search-lens .b2 { animation: fulltext-search-lens-match 6s infinite; }
                .fulltext-search-lens .fulltext-search-lens-caption { font-size: 12px; fill: #A29DB6; }
                .fulltext-search-lens .fulltext-search-lens-code { fill: #ECE9F2; }
                @keyframes fulltext-search-lens-move {
                    0% { transform: translate(-5px, 20px); }
                    12% { transform: translate(25px, 43px); }
                    26% { transform: translate(78px, 43px); }
                    40% { transform: translate(25px, 70px); }
                    50%, 70% { transform: translate(55px, 70px); }
                    82% { transform: translate(78px, 97px); }
                    94%, 100% { transform: translate(120px, 130px); }
                }
                @keyframes fulltext-search-lens-zoom {
                    0% { transform: translate(4px, -16px) scale(1.8); }
                    12% { transform: translate(-20px, -34.4px) scale(1.8); }
                    26% { transform: translate(-62.4px, -34.4px) scale(1.8); }
                    40% { transform: translate(-20px, -56px) scale(1.8); }
                    50%, 70% { transform: translate(-44px, -56px) scale(1.8); }
                    82% { transform: translate(-62.4px, -77.6px) scale(1.8); }
                    94%, 100% { transform: translate(-96px, -104px) scale(1.8); }
                }
                @keyframes fulltext-search-lens-fade { 0% { opacity: 0; } 8%, 86% { opacity: 1; } 94%, 100% { opacity: 0; } }
                @keyframes fulltext-search-lens-match {
                    0%, 50% { fill: var(--c); }
                    53% { fill: #FFFFFF; }
                    58% { fill: var(--c); }
                    61% { fill: #FFFFFF; }
                    66%, 100% { fill: var(--c); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .fulltext-search-lens .lens, .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg, .fulltext-search-lens .zoom, .fulltext-search-lens .lens-wrap, .fulltext-search-lens .b2 { animation: none; }
                    .fulltext-search-lens .lens, .fulltext-search-lens .lens-c, .fulltext-search-lens .lens-bg { transform: translate(55px, 70px); }
                    .fulltext-search-lens .zoom { transform: translate(-44px, -56px) scale(1.8); }
                }
            `}</style>
            <svg
                viewBox="0 0 400 300"
                role="img"
                aria-label="A magnifying lens searches the layers of the RxDB logo and finds one match for the search term offline."
            >
                <svg x="24" y="38" width="352" height="198" viewBox="-12 -12 127.33 164" overflow="visible">
                    <LogoParts />
                    <defs>
                        <clipPath id={clipId}><circle className="lens-c" r="15" /></clipPath>
                    </defs>
                    <g className="lens-wrap" clipPath={'url(#' + clipId + ')'}>
                        <circle className="lens-bg" r="15" />
                        <g className="zoom"><LogoParts /></g>
                    </g>
                    <g className="lens"><circle className="ring" r="15" /><path className="handle" d="M11 11 L20 20" /></g>
                </svg>
                <text className="fulltext-search-lens-caption" x="200" y="258" textAnchor="middle">
                    <tspan className="fulltext-search-lens-code">search('offline')</tspan>
                    {' · 1 match'}
                </text>
            </svg>
        </div>
    );
}
