import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * The layers of the RxDB logo squeeze to 60% of their width while the
 * field names of a JSON document shrink, like the key compression plugin does.
 */
export function KeyCompressionLogo() {
    return (
        <div className="key-compression-logo">
            <style>{`
                .key-compression-logo { line-height: 0; }
                .key-compression-logo > svg { display: block; width: 100%; height: auto; }
                .key-compression-logo .logo { overflow: visible; }
                .key-compression-logo .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.key-compression-logo')}
                .key-compression-logo .bar { transform-origin: left center; animation: key-compression-logo-squeeze 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .key-compression-logo .b2 { animation-delay: .1s; }
                .key-compression-logo .b3 { animation-delay: .2s; }
                .key-compression-logo .readout {
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 10px;
                }
                .key-compression-logo .raw { fill: #ECE9F2; animation: key-compression-logo-raw 4.4s infinite; }
                .key-compression-logo .min { fill: #ED168F; opacity: 0; animation: key-compression-logo-min 4.4s infinite; }
                @keyframes key-compression-logo-squeeze { 0%, 22% { transform: none; } 36%, 74% { transform: scaleX(.6); } 88%, 100% { transform: none; } }
                @keyframes key-compression-logo-raw { 0%, 28% { opacity: 1; } 34%, 78% { opacity: 0; } 84%, 100% { opacity: 1; } }
                @keyframes key-compression-logo-min { 0%, 28% { opacity: 0; } 34%, 78% { opacity: 1; } 84%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .key-compression-logo .bar, .key-compression-logo .raw, .key-compression-logo .min { animation: none; }
                }
            `}</style>
            <svg viewBox="0 0 300 225" role="img" aria-label="The RxDB logo layers compress to 60 percent of their width while the JSON field name firstName shrinks to a short key, saving up to 40 percent disk space">
                <svg className="logo" x="0" y="25.9" width="300" height="148.5" viewBox="0 0 103.33 140">
                    <LogoParts />
                </svg>
                <g className="readout" aria-hidden="true">
                    <text className="raw" x="150" y="195" textAnchor="middle">{'{"firstName":"Alice"}'}</text>
                    <text className="min" x="150" y="195" textAnchor="middle">{'{"|a":"Alice"} · up to 40% less disk'}</text>
                </g>
            </svg>
        </div>
    );
}
