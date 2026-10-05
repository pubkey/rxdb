import React, { useEffect, useId, useRef } from 'react';
import { LogoParts, OUT, SVGNS, createRunner, logoColorsCss, prefersReducedMotion } from './shared';

type StorageCall = [method: string, answer: string, emitsChange: boolean];

const CALLS: StorageCall[] = [
    ['bulkWrite', 'ok', true],
    ['query', '3 docs', false],
    ['count', '42', false],
    ['bulkWrite', 'ok', true],
    ['findDocumentsById', '1 doc', false]
];
const TICKS = Array.from({ length: 24 }, (_, i) => 14 + i * 12);

/**
 * Moves a labeled pill from one point to another and removes it afterwards.
 * The returned promise also resolves when the animation is cancelled.
 */
function flyPacket(
    parent: SVGGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    duration: number,
    label: string
): Promise<void> {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'ws-pill');
    const w = label.length * 4.3 + 8;
    const h = 11;
    const rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', String(x1 - w / 2));
    rect.setAttribute('y', String(y1 - h / 2));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '5.5');
    rect.setAttribute('fill', '#0D0F18');
    rect.setAttribute('stroke', color);
    const text = document.createElementNS(SVGNS, 'text');
    text.setAttribute('x', String(x1));
    text.setAttribute('y', String(y1 + 2.4));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', color);
    text.textContent = label;
    g.appendChild(rect);
    g.appendChild(text);
    parent.appendChild(g);
    const d = 'translate(' + (x2 - x1) + 'px, ' + (y2 - y1) + 'px)';
    const anim = g.animate([
        { transform: 'none', opacity: 0 },
        { transform: 'none', opacity: 1, offset: .08 },
        { transform: d, opacity: 1, offset: .92 },
        { transform: d, opacity: 0 }
    ], { duration, easing: 'ease-in-out' });
    return anim.finished.catch(() => { }).then(() => g.remove());
}

/**
 * RxDB runs on the main thread and sends every storage call as a message
 * with a request id to a worker. The worker runs it on the wrapped IndexedDB
 * storage, answers by id and streams change events back,
 * while the UI frames on the main thread never stall.
 */
export function WorkerStorage() {
    const svgRef = useRef<SVGSVGElement>(null);
    const clipId = 'worker-storage-strip-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || prefersReducedMotion() || typeof svg.animate !== 'function') {
            return;
        }
        const msgs = svg.querySelector<SVGGElement>('.ws-msgs');
        const cyl = svg.querySelector('.ws-cyl');
        const cpu = svg.querySelector('.ws-cpu');
        const db = svg.querySelector('.ws-db');
        if (!msgs || !cyl || !cpu || !db) {
            return;
        }
        const runner = createRunner(svg);
        (async () => {
            let id = 11;
            let k = 0;
            while (!runner.isStopped()) {
                await runner.wait(500);
                if (runner.isStopped()) {
                    return;
                }
                const [method, answerText, emitsChange] = CALLS[k++ % CALLS.length];
                id++;
                await flyPacket(msgs, 92, 56, 208, 56, '#FFFFFF', 900, method + ' #' + id);
                if (runner.isStopped()) {
                    return;
                }
                cyl.classList.add('busy');
                cpu.animate(
                    [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)', offset: .7 }, { transform: 'scaleX(.15)' }],
                    { duration: 700, easing: 'ease-out' }
                );
                await runner.wait(700);
                if (runner.isStopped()) {
                    return;
                }
                cyl.classList.remove('busy');
                const answer = flyPacket(msgs, 208, 92, 92, 92, '#ED168F', 900, '#' + id + ' ' + answerText);
                if (emitsChange) {
                    await runner.wait(260);
                    if (runner.isStopped()) {
                        return;
                    }
                    flyPacket(msgs, 208, 92, 92, 92, '#B2218B', 900, 'changeStream');
                }
                await answer;
                if (runner.isStopped()) {
                    return;
                }
                ['b1', 'b2', 'b3'].forEach((name, i) => {
                    db.querySelector('.' + name)?.animate(
                        [{ transform: 'none' }, { transform: 'translateX(4px)' }, { transform: 'none' }],
                        { duration: 380, delay: i * 70, easing: OUT }
                    );
                });
            }
        })();
        return () => {
            runner.stop();
            msgs.innerHTML = '';
            cyl.classList.remove('busy');
        };
    }, []);

    return (
        <div className="worker-storage">
            <style>{`
                .worker-storage { line-height: 0; }
                .worker-storage > svg { display: block; width: 100%; height: auto; }
                .worker-storage .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.worker-storage .ws-db')}
                .worker-storage text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                .worker-storage .ws-lane { fill: none; stroke: #A29DB6; stroke-width: 1; stroke-dasharray: 4 3; }
                .worker-storage .ws-label { fill: #A29DB6; font-size: 8px; letter-spacing: .06em; }
                .worker-storage .ws-sub { fill: #A29DB6; font-size: 7px; }
                .worker-storage .ws-chan { stroke: #262B40; stroke-width: 1; stroke-dasharray: 2 3; }
                .worker-storage .ws-strip { fill: #0D0F18; stroke: #262B40; }
                .worker-storage .ws-tick { fill: #B2218B; }
                .worker-storage .ws-ticks { animation: worker-storage-ticks .25s linear infinite; }
                .worker-storage .ws-cyl { fill: #20243A; stroke: #A29DB6; stroke-width: 1.2; transition: stroke .2s; }
                .worker-storage .ws-cyl-line { fill: none; stroke: #A29DB6; stroke-width: 1; opacity: .6; }
                .worker-storage .ws-cyl.busy { stroke: #ED168F; }
                .worker-storage .ws-cpu-bg { fill: #0D0F18; stroke: #262B40; }
                .worker-storage .ws-cpu { fill: #ED168F; transform-box: fill-box; transform-origin: 0 50%; transform: scaleX(0); }
                .worker-storage .ws-pill rect { stroke-width: 1; }
                .worker-storage .ws-pill text { font-size: 7px; }
                @keyframes worker-storage-ticks { from { transform: none; } to { transform: translateX(-12px); } }
                @media (prefers-reduced-motion: reduce) {
                    .worker-storage .ws-ticks { animation: none; }
                    .worker-storage .ws-cyl { transition: none; }
                }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 300 160"
                role="img"
                aria-label="RxDB on the main thread sends storage calls as messages to a worker, where the wrapped IndexedDB storage runs them and answers, while the main thread keeps rendering UI frames."
            >
                <defs>
                    <clipPath id={clipId}><rect x="14" y="132" width="98" height="10" rx="2" /></clipPath>
                </defs>
                <rect className="ws-lane" x="6" y="6" width="114" height="148" rx="6" />
                <rect className="ws-lane" x="180" y="6" width="114" height="148" rx="6" />
                <text className="ws-label" x="14" y="20">main thread</text>
                <text className="ws-label" x="188" y="20">worker</text>
                <svg className="ws-db" x="35" y="30" width="56" height="75.9" viewBox="0 0 103.33 140" overflow="visible">
                    <LogoParts />
                </svg>
                <text className="ws-sub" x="63" y="118" textAnchor="middle">RxDatabase</text>
                <rect className="ws-strip" x="14" y="132" width="98" height="10" rx="2" />
                <g clipPath={'url(#' + clipId + ')'}>
                    <g className="ws-ticks">
                        {TICKS.map(x => <rect key={x} className="ws-tick" x={x} y="134" width="6" height="6" rx="1" />)}
                    </g>
                </g>
                <text className="ws-sub" x="14" y="128">UI frames</text>
                <line className="ws-chan" x1="120" y1="56" x2="180" y2="56" />
                <line className="ws-chan" x1="120" y1="92" x2="180" y2="92" />
                <text className="ws-sub" x="150" y="76" textAnchor="middle">postMessage</text>
                <path className="ws-cyl" d="M215 46v40a22 6 0 0 0 44 0V46a22 6 0 0 0-44 0a22 6 0 0 0 44 0" />
                <path className="ws-cyl-line" d="M215 59a22 6 0 0 0 44 0M215 72a22 6 0 0 0 44 0" />
                <text className="ws-sub" x="237" y="108" textAnchor="middle">IndexedDB</text>
                <rect className="ws-cpu-bg" x="188" y="132" width="98" height="10" rx="2" />
                <rect className="ws-cpu" x="189" y="133" width="96" height="8" rx="1.5" />
                <text className="ws-sub" x="188" y="128">CPU</text>
                <g className="ws-msgs"></g>
            </svg>
        </div>
    );
}
