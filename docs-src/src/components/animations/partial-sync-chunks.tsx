import React, { useEffect, useRef } from 'react';
import { LogoParts } from '../glitch-logo';

const SVGNS = 'http://www.w3.org/2000/svg';
const GRID = { cols: 6, rows: 4, size: 24, pitch: 27, x: 12, y: 34 };
const TARGET = { x: 224, y: 87 };
const PATH: [number, number][] = [
    [0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2],
    [5, 3], [4, 3], [3, 3], [2, 3], [1, 3], [1, 2], [0, 2], [0, 1]
];
const COLORS = ['#ED168F', '#B2218B', '#752A8A'];
const POP = 'cubic-bezier(.2, 1.4, .4, 1)';
const OUT = 'cubic-bezier(.16, 1, .3, 1)';

type ChunkState = {
    c: number;
    r: number;
    el: SVGGElement;
    link: SVGLineElement;
    on: boolean;
    seen: boolean;
};

function center(c: number, r: number) {
    return {
        x: GRID.x + c * GRID.pitch + GRID.size / 2,
        y: GRID.y + r * GRID.pitch + GRID.size / 2
    };
}

/**
 * A blocky avatar walks across a voxel world. Every chunk within its
 * render distance runs its own replication into the RxDB collection.
 * Chunks it leaves are cancelled but keep their checkpoint (dashed outline).
 */
export function PartialSyncChunks() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) {
            return;
        }
        const grid = svg.querySelector('.psc-grid') as SVGGElement;
        const links = svg.querySelector('.psc-links') as SVGGElement;
        const pkts = svg.querySelector('.psc-pkts') as SVGGElement;
        const avatar = svg.querySelector('.psc-avatar') as SVGGElement;
        const mover = avatar.querySelector('.psc-mover') as SVGGElement;
        const sprite = avatar.querySelector('.psc-sprite') as SVGGElement;
        const logo = svg.querySelector('.psc-logo') as SVGSVGElement;

        let stopped = false;
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const wait = (ms: number) => new Promise<void>(res => {
            const t = setTimeout(() => {
                timers.delete(t);
                res();
            }, ms);
            timers.add(t);
        });

        grid.innerHTML = '';
        links.innerHTML = '';
        pkts.innerHTML = '';
        const state: ChunkState[] = [];
        let seed = 7;
        const rnd = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        for (let r = 0; r < GRID.rows; r++) {
            for (let c = 0; c < GRID.cols; c++) {
                const x = GRID.x + c * GRID.pitch;
                const y = GRID.y + r * GRID.pitch;
                const g = document.createElementNS(SVGNS, 'g');
                g.setAttribute('class', 'psc-chunk');
                let html = '<rect class="psc-base" x="' + x + '" y="' + y + '" width="' + GRID.size + '" height="' + GRID.size + '" rx="2"/>';
                for (let k = 0; k < 3; k++) {
                    html += '<rect class="psc-px" x="' + (x + 3 + Math.floor(rnd() * 5) * 3.6) + '" y="' + (y + 3 + Math.floor(rnd() * 5) * 3.6) + '" width="3.6" height="3.6"/>';
                }
                g.innerHTML = html;
                grid.appendChild(g);
                const p = center(c, r);
                const line = document.createElementNS(SVGNS, 'line');
                line.setAttribute('class', 'psc-link');
                line.setAttribute('x1', String(p.x));
                line.setAttribute('y1', String(p.y));
                line.setAttribute('x2', String(TARGET.x));
                line.setAttribute('y2', String(TARGET.y));
                links.appendChild(line);
                state.push({ c, r, el: g, link: line, on: false, seen: false });
            }
        }

        const reconcile = (pc: number, pr: number, animate: boolean) => {
            state.forEach(s => {
                const near = Math.abs(s.c - pc) <= 1 && Math.abs(s.r - pr) <= 1;
                if (near && !s.on) {
                    s.on = true;
                    const base = s.el.querySelector('.psc-base');
                    if (animate && base) {
                        base.animate(
                            [{ transform: 'scale(.82)' }, { transform: 'none' }],
                            { duration: 420, easing: POP }
                        );
                    }
                } else if (!near && s.on) {
                    s.on = false;
                    s.seen = true;
                }
                s.el.classList.toggle('on', s.on);
                s.el.classList.toggle('seen', s.seen && !s.on);
                s.link.classList.toggle('on', s.on);
            });
        };

        const place = (c: number, r: number) => {
            const p = center(c, r);
            avatar.setAttribute('transform', 'translate(' + p.x + ' ' + (p.y + 8) + ')');
        };

        place(PATH[0][0], PATH[0][1]);
        reconcile(PATH[0][0], PATH[0][1], false);

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || typeof svg.animate !== 'function') {
            return;
        }

        const packet = () => {
            const active = state.filter(s => s.on);
            if (!active.length) {
                return;
            }
            const chunk = active[Math.floor(Math.random() * active.length)];
            const p = center(chunk.c, chunk.r);
            const push = Math.random() < .25;
            const color = push ? '#FFFFFF' : COLORS[Math.floor(Math.random() * 3)];
            const rect = document.createElementNS(SVGNS, 'rect');
            rect.setAttribute('class', 'psc-pkt');
            rect.setAttribute('x', String(p.x - 2.5));
            rect.setAttribute('y', String(p.y - 2));
            rect.setAttribute('width', '5');
            rect.setAttribute('height', '4');
            rect.setAttribute('rx', '1');
            rect.setAttribute('fill', color);
            pkts.appendChild(rect);
            const d = 'translate(' + (TARGET.x - p.x) + 'px, ' + (TARGET.y - p.y) + 'px)';
            const frames = push
                ? [{ transform: d, opacity: 0 }, { transform: d, opacity: 1, offset: .1 }, { transform: 'none', opacity: 1, offset: .9 }, { transform: 'none', opacity: 0 }]
                : [{ transform: 'none', opacity: 0 }, { transform: 'none', opacity: 1, offset: .1 }, { transform: d, opacity: 1, offset: .9 }, { transform: d, opacity: 0 }];
            rect.animate(frames, { duration: 1000, easing: 'ease-in-out' }).finished.then(() => {
                rect.remove();
                if (!push && !stopped) {
                    const bar = logo.querySelector('.b' + (COLORS.indexOf(color) + 1));
                    bar?.animate(
                        [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'none' }],
                        { duration: 320, easing: OUT }
                    );
                }
            }).catch(() => rect.remove());
        };

        const limbs: [string, number][] = [['.leg-l', 1], ['.leg-r', -1], ['.arm-l', -1], ['.arm-r', 1]];
        let swings: Animation[] = [];
        const walk = (on: boolean) => {
            swings.forEach(a => a.cancel());
            swings = [];
            if (!on) {
                return;
            }
            limbs.forEach(([sel, dir]) => {
                const limb = avatar.querySelector(sel);
                if (limb) {
                    swings.push(limb.animate(
                        [{ transform: 'rotate(' + (30 * dir) + 'deg)' }, { transform: 'rotate(' + (-30 * dir) + 'deg)' }],
                        { duration: 260, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
                    ));
                }
            });
        };

        (async () => {
            let i = 0;
            while (!stopped) {
                await wait(i % 4 === 0 ? 1400 : 250);
                if (stopped) {
                    return;
                }
                const from = PATH[i];
                const to = PATH[(i + 1) % PATH.length];
                const a = center(from[0], from[1]);
                const b = center(to[0], to[1]);
                if (to[0] !== from[0]) {
                    sprite.setAttribute('transform', to[0] < from[0] ? 'scale(-1 1)' : '');
                }
                walk(true);
                const step = mover.animate(
                    [{ transform: 'none' }, { transform: 'translate(' + (b.x - a.x) + 'px, ' + (b.y - a.y) + 'px)' }],
                    { duration: 650, easing: 'linear', fill: 'forwards' }
                );
                await wait(325);
                if (stopped) {
                    return;
                }
                reconcile(to[0], to[1], true);
                await step.finished.catch(() => { });
                step.cancel();
                place(to[0], to[1]);
                walk(false);
                i = (i + 1) % PATH.length;
            }
        })();

        (async () => {
            while (!stopped) {
                await wait(220);
                if (!stopped) {
                    packet();
                }
            }
        })();

        return () => {
            stopped = true;
            timers.forEach(t => clearTimeout(t));
            timers.clear();
            walk(false);
            svg.getAnimations?.({ subtree: true }).forEach(a => a.cancel());
        };
    }, []);

    return (
        <div className="partial-sync-chunks">
            <style>{`
                .partial-sync-chunks { line-height: 0; }
                .partial-sync-chunks > svg { display: block; width: 100%; height: auto; }
                .partial-sync-chunks .psc-base { transform-box: fill-box; transform-origin: center; fill: #191C2C; stroke: #262B40; stroke-width: 1; transition: fill .35s, stroke .35s; }
                .partial-sync-chunks .psc-px { fill: #262B40; transition: fill .35s; }
                .partial-sync-chunks .psc-chunk.seen .psc-base { fill: #1F2234; stroke: #752A8A; stroke-dasharray: 3 2; }
                .partial-sync-chunks .psc-chunk.on .psc-base { fill: #2B1A34; stroke: #ED168F; stroke-dasharray: none; }
                .partial-sync-chunks .psc-chunk.on .psc-px { fill: #B2218B; }
                .partial-sync-chunks .psc-link { stroke: #ED168F; stroke-width: .8; stroke-dasharray: 2 3; opacity: 0; transition: opacity .35s; animation: psc-flow .6s linear infinite; }
                .partial-sync-chunks .psc-link.on { opacity: .5; }
                .partial-sync-chunks .psc-pkt { transform-box: fill-box; }
                .partial-sync-chunks .psc-label { fill: #A29DB6; font-size: 8px; letter-spacing: .04em; }
                .partial-sync-chunks .limb { transform-box: fill-box; transform-origin: 50% 0; }
                .partial-sync-chunks .psc-logo .part { transform-box: fill-box; transform-origin: center; }
                .partial-sync-chunks .psc-logo .outline { fill: #FFFFFF; }
                .partial-sync-chunks .psc-logo .b1, .partial-sync-chunks .psc-logo .corner { fill: #ED168F; }
                .partial-sync-chunks .psc-logo .b2 { fill: #B2218B; }
                .partial-sync-chunks .psc-logo .b3, .partial-sync-chunks .psc-logo .foot { fill: #752A8A; }
                @keyframes psc-flow { to { stroke-dashoffset: -5; } }
                @media (prefers-reduced-motion: reduce) {
                    .partial-sync-chunks .psc-link { animation: none; }
                }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 300 150"
                role="img"
                aria-label="A blocky avatar walks across voxel world chunks. Chunks within its render distance start syncing to the RxDB database and chunks it leaves stop syncing but keep their checkpoint."
            >
                <g className="psc-grid"></g>
                <g className="psc-links"></g>
                <g className="psc-pkts"></g>
                <g className="psc-avatar">
                    <g className="psc-mover">
                        <g className="psc-sprite">
                            <rect className="limb leg-l" x="-4" y="-7" width="4" height="7" fill="#3B47A8" />
                            <rect className="limb leg-r" x="0" y="-7" width="4" height="7" fill="#323C91" />
                            <rect className="limb arm-l" x="-6" y="-15" width="2" height="7" fill="#C99A6E" />
                            <rect className="limb arm-r" x="4" y="-15" width="2" height="7" fill="#B88A5F" />
                            <rect x="-4" y="-15" width="8" height="8" fill="#3FB6C2" />
                            <rect x="-4" y="-23" width="8" height="8" fill="#C99A6E" />
                            <rect x="-4" y="-23" width="8" height="2.5" fill="#4B3220" />
                            <rect x="-4" y="-21" width="1.2" height="2" fill="#4B3220" />
                            <rect x="1.2" y="-19.5" width="1.6" height="1.4" fill="#FFFFFF" />
                            <rect x="2.2" y="-19.5" width=".8" height="1.4" fill="#3B2A8A" />
                        </g>
                    </g>
                </g>
                <svg className="psc-logo" x="222" y="46" width="60" height="81" viewBox="0 0 103.33 140">
                    <LogoParts />
                </svg>
                <text className="psc-label" x="252" y="140" textAnchor="middle">db.voxels</text>
            </svg>
        </div>
    );
}
