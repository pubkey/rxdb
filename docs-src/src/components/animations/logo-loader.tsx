import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * The RxDB logo as a loading indicator: the layers fill and drain in sequence
 * while the corner piece turns, for the moment an app waits on the first sync.
 */
export function LogoLoader() {
    return (
        <div className="logo-loader">
            <style>{`
                .logo-loader { line-height: 0; }
                .logo-loader > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .logo-loader .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.logo-loader')}
                .logo-loader .bar { animation: logo-loader-load 1.8s cubic-bezier(.16, 1, .3, 1) infinite both; }
                .logo-loader .b2 { animation-delay: .12s; }
                .logo-loader .b3 { animation-delay: .24s; }
                .logo-loader .corner { animation: logo-loader-spin 1.8s cubic-bezier(.65, 0, .35, 1) infinite; }
                .logo-loader .caption { fill: #A29DB6; font-size: 10px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .logo-loader .caption .code { fill: #ECE9F2; }
                .logo-loader .dot { fill-opacity: 0; }
                .logo-loader .d1 { animation: logo-loader-d1 1.8s infinite; }
                .logo-loader .d2 { animation: logo-loader-d2 1.8s infinite; }
                .logo-loader .d3 { animation: logo-loader-d3 1.8s infinite; }
                @keyframes logo-loader-load {
                    0% { transform: scaleX(0); transform-origin: left center; }
                    42% { transform: scaleX(1); transform-origin: left center; }
                    43%, 58% { transform: scaleX(1); transform-origin: right center; }
                    100% { transform: scaleX(0); transform-origin: right center; }
                }
                @keyframes logo-loader-spin { 0%, 50% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
                @keyframes logo-loader-d1 { 0%, 24.9% { fill-opacity: 0; } 25%, 100% { fill-opacity: 1; } }
                @keyframes logo-loader-d2 { 0%, 49.9% { fill-opacity: 0; } 50%, 100% { fill-opacity: 1; } }
                @keyframes logo-loader-d3 { 0%, 74.9% { fill-opacity: 0; } 75%, 100% { fill-opacity: 1; } }
                @media (prefers-reduced-motion: reduce) {
                    .logo-loader .bar, .logo-loader .corner, .logo-loader .dot { animation: none; }
                    .logo-loader .dot { fill-opacity: 1; }
                }
            `}</style>
            <svg
                viewBox="-108.33 -38 320 240"
                role="img"
                aria-label="The RxDB logo as a loading indicator while awaitInitialReplication() waits for the first sync."
            >
                <LogoParts />
                <text className="caption" x="51.67" y="164" textAnchor="middle">
                    <tspan className="code">awaitInitialReplication()</tspan>
                    <tspan className="dot d1">.</tspan>
                    <tspan className="dot d2">.</tspan>
                    <tspan className="dot d3">.</tspan>
                </text>
            </svg>
        </div>
    );
}
