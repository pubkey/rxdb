import React, { useEffect, useRef } from 'react';
import { LogoParts, createRunner, prefersReducedMotion } from './shared';

const CIPHER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CIPHER_LENGTH = 17;
const CIPHER_ROWS = [46.3, 73, 99.7];

/**
 * The corner piece of the RxDB logo locks, the layers go dark and fill
 * with scrambling ciphertext, then decrypt back to the brand colors.
 */
export function EncryptionLogo() {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        const cipherEls = Array.from(root.querySelectorAll('.cipher'));
        const scramble = () => {
            cipherEls.forEach(t => {
                let out = '';
                for (let i = 0; i < CIPHER_LENGTH; i++) {
                    out += CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
                }
                t.textContent = out;
            });
        };
        scramble();
        if (prefersReducedMotion()) {
            return;
        }
        const runner = createRunner(root);
        (async () => {
            while (!runner.isStopped()) {
                await runner.wait(90);
                if (!runner.isStopped()) {
                    scramble();
                }
            }
        })();
        return () => runner.stop();
    }, []);

    return (
        <div className="encryption-logo" ref={rootRef}>
            <style>{`
                .encryption-logo { line-height: 0; }
                .encryption-logo > svg { display: block; width: 100%; height: auto; }
                .encryption-logo .logo { overflow: visible; }
                .encryption-logo .part { transform-box: fill-box; transform-origin: center; }
                .encryption-logo .outline { fill: #FFFFFF; }
                .encryption-logo .b1 { --c: #ED168F; }
                .encryption-logo .b2 { --c: #B2218B; animation-delay: .08s; }
                .encryption-logo .b3 { --c: #752A8A; animation-delay: .16s; }
                .encryption-logo .bar { fill: var(--c); animation: encryption-logo-enc 5s cubic-bezier(.16, 1, .3, 1) infinite; }
                .encryption-logo .corner { fill: #ED168F; }
                .encryption-logo .foot { fill: #752A8A; }
                .encryption-logo .cipher {
                    fill: #ECE9F2;
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 8px;
                    opacity: 0;
                    animation: encryption-logo-cipher 5s infinite;
                }
                .encryption-logo .shackle {
                    fill: none;
                    stroke: #FFFFFF;
                    stroke-width: 3;
                    stroke-linecap: round;
                    transform-box: fill-box;
                    opacity: 0;
                    animation: encryption-logo-shackle 5s cubic-bezier(.2, 1.4, .4, 1) infinite;
                }
                @keyframes encryption-logo-enc { 0%, 18% { fill: var(--c); } 26%, 70% { fill: #2A2E45; } 80%, 100% { fill: var(--c); } }
                @keyframes encryption-logo-cipher { 0%, 20% { opacity: 0; } 28%, 68% { opacity: 1; } 76%, 100% { opacity: 0; } }
                @keyframes encryption-logo-shackle {
                    0%, 12% { opacity: 0; transform: translateY(-6px); }
                    22%, 70% { opacity: 1; transform: none; }
                    78%, 100% { opacity: 0; transform: translateY(-6px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .encryption-logo .bar, .encryption-logo .cipher, .encryption-logo .shackle { animation: none; }
                    .encryption-logo .bar { fill: #2A2E45; }
                    .encryption-logo .cipher, .encryption-logo .shackle { opacity: 1; }
                }
            `}</style>
            <svg viewBox="0 0 300 225" role="img" aria-label="The RxDB logo locks its corner piece, its layers go dark and fill with ciphertext, then decrypt back to the brand colors">
                <svg className="logo" x="0" y="38.25" width="300" height="148.5" viewBox="0 -12 103.33 152">
                    <LogoParts />
                    <path className="shackle" d="M80 6 V1 a6.5 6.5 0 0 1 13 0 V6" />
                    {CIPHER_ROWS.map(y => (
                        <text key={y} className="cipher" x="11" y={y}>{' '}</text>
                    ))}
                </svg>
            </svg>
        </div>
    );
}
