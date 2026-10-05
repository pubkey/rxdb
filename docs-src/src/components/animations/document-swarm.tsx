import React, { useEffect, useRef } from 'react';
import { createRunner, prefersReducedMotion } from './shared';

const OUTLINE = 'M98.33 10c-2.76 0-5-2.24-5-5s-2.24-5-5-5H75c-2.76 0-5 2.24-5 5v16.67c0 2.76-2.24 5-5 5H5c-2.76 0-5 2.24-5 5V125c0 2.76 2.24 5 5 5s5 2.24 5 5 2.24 5 5 5h13.33c2.76 0 5-2.24 5-5v-16.67c0-2.76 2.24-5 5-5h60c2.76 0 5-2.24 5-5V15c0-2.76-2.24-5-5-5';
const SWARM_COLORS: [number, number, number][] = [[255, 255, 255], [237, 22, 143], [178, 33, 139], [117, 42, 138]];
const PATHS: [string, string][] = [
    [OUTLINE, '#FFFFFF'],
    ['M6.67 60h90v20h-90z', '#B2218B'],
    ['M96.66 53.34h-90v-20h90z', '#ED168F'],
    ['M96.66 106.66h-90v-20h90zM26.67 113.33v20h-10v-10h-10v-10z', '#752A8A'],
    ['M86.67 6.67v10h10v10h-20v-20z', '#ED168F']
];
const SAMPLE_OFFSETS: [number, number][] = [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
const SPRING = .06;
const DAMPING = .82;
const REPEL_RADIUS = 70;
const SCATTER_STRENGTH = 26;

type Doc = {
    tx: number;
    ty: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    c: string;
};

function nearestColor(r: number, g: number, b: number) {
    let best = 0;
    let bestDistance = Infinity;
    SWARM_COLORS.forEach((c, idx) => {
        const dist = (c[0] - r) * (c[0] - r) + (c[1] - g) * (c[1] - g) + (c[2] - b) * (c[2] - b);
        if (dist < bestDistance) {
            bestDistance = dist;
            best = idx;
        }
    });
    return 'rgb(' + SWARM_COLORS[best].join(',') + ')';
}

/**
 * The RxDB logo rebuilt from small squares where each square stands
 * for one document. The pointer pushes documents away, a click throws
 * them all, and every few seconds the swarm scatters on its own before
 * every document springs back to its place in the logo.
 */
export function DocumentSwarm() {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stage = rootRef.current;
        if (!stage) {
            return;
        }
        const cv = stage.querySelector('canvas');
        const countEl = stage.querySelector('.dsw-count');
        const ctx = cv ? cv.getContext('2d') : null;
        if (!cv || !ctx) {
            return;
        }
        const reduce = prefersReducedMotion();
        const runner = createRunner(stage);

        let docs: Doc[] = [];
        let W = 0;
        let H = 0;
        let size = 4;
        const mouse = { x: -1e4, y: -1e4 };
        let visible = typeof IntersectionObserver === 'undefined';
        let running = false;
        let entered = false;
        let disposed = false;
        let rafId = 0;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            for (const doc of docs) {
                ctx.fillStyle = doc.c;
                ctx.fillRect(doc.x, doc.y, size, size);
            }
        };

        const build = () => {
            const rect = stage.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                return;
            }
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            W = rect.width;
            H = rect.height;
            cv.width = Math.round(W * dpr);
            cv.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const scale = (H * .8) / 140;
            const ox = (W - 103.33 * scale) / 2;
            const oy = (H - 140 * scale) / 2;
            const off = document.createElement('canvas');
            off.width = Math.ceil(W);
            off.height = Math.ceil(H);
            const o = off.getContext('2d');
            if (!o) {
                return;
            }
            o.setTransform(scale, 0, 0, scale, ox, oy);
            PATHS.forEach(([d, fill]) => {
                o.fillStyle = fill;
                o.fill(new Path2D(d));
            });
            const data = o.getImageData(0, 0, off.width, off.height).data;
            const step = Math.max(5, scale * 3.2);
            size = step + .5;
            const old = docs;
            const next: Doc[] = [];
            for (let y = oy; y < oy + 140 * scale; y += step) {
                for (let x = ox; x < ox + 103.33 * scale; x += step) {
                    const cx = Math.round(x + step / 2);
                    const cy = Math.round(y + step / 2);
                    if (cx >= off.width || cy >= off.height) {
                        continue;
                    }
                    if (data[(cy * off.width + cx) * 4 + 3] < 200) {
                        continue;
                    }
                    // the color of a square is the majority vote of five samples inside of it
                    const q = step / 4;
                    const votes: Record<string, number> = {};
                    let color = '#FFFFFF';
                    let top = 0;
                    SAMPLE_OFFSETS.forEach(([mx, my]) => {
                        const sx = Math.round(cx + mx * q);
                        const sy = Math.round(cy + my * q);
                        if (sx < 0 || sy < 0 || sx >= off.width || sy >= off.height) {
                            return;
                        }
                        const j = (sy * off.width + sx) * 4;
                        if (data[j + 3] < 200) {
                            return;
                        }
                        const c = nearestColor(data[j], data[j + 1], data[j + 2]);
                        votes[c] = (votes[c] || 0) + 1;
                        if (votes[c] > top) {
                            top = votes[c];
                            color = c;
                        }
                    });
                    const prev = old[next.length];
                    next.push({
                        tx: x,
                        ty: y,
                        x: prev ? prev.x : x,
                        y: prev ? prev.y : y,
                        vx: 0,
                        vy: 0,
                        c: color
                    });
                }
            }
            docs = next;
            if (countEl) {
                countEl.textContent = docs.length.toLocaleString('en-US') + ' documents';
            }
            draw();
        };

        const tick = () => {
            if (disposed || !visible || reduce) {
                running = false;
                return;
            }
            const r2 = REPEL_RADIUS * REPEL_RADIUS;
            for (const doc of docs) {
                doc.vx += (doc.tx - doc.x) * SPRING;
                doc.vy += (doc.ty - doc.y) * SPRING;
                const dx = doc.x - mouse.x;
                const dy = doc.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < r2 && d2 > .01) {
                    const dist = Math.sqrt(d2);
                    const force = (1 - dist / REPEL_RADIUS) * 7;
                    doc.vx += dx / dist * force;
                    doc.vy += dy / dist * force;
                }
                doc.vx *= DAMPING;
                doc.vy *= DAMPING;
                doc.x += doc.vx;
                doc.y += doc.vy;
            }
            draw();
            rafId = requestAnimationFrame(tick);
        };

        const start = () => {
            if (disposed || running || !visible || reduce) {
                return;
            }
            running = true;
            rafId = requestAnimationFrame(tick);
        };

        const scatter = (strength: number) => {
            docs.forEach(doc => {
                const angle = Math.random() * Math.PI * 2;
                const s = (.4 + Math.random()) * strength;
                doc.vx += Math.cos(angle) * s;
                doc.vy += Math.sin(angle) * s;
            });
            start();
        };

        const onMove = (e: PointerEvent) => {
            const r = stage.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
        };
        const onLeave = () => {
            mouse.x = -1e4;
            mouse.y = -1e4;
        };
        const onClick = () => scatter(SCATTER_STRENGTH);

        build();
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(build) : null;
        resizeObserver?.observe(stage);

        if (reduce) {
            return () => {
                disposed = true;
                resizeObserver?.disconnect();
            };
        }

        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerleave', onLeave);
        stage.addEventListener('click', onClick);

        const enter = () => {
            if (!entered) {
                entered = true;
                docs.forEach(doc => {
                    doc.x = Math.random() * W;
                    doc.y = Math.random() * H;
                });
            }
        };
        let intersectionObserver: IntersectionObserver | null = null;
        if (typeof IntersectionObserver !== 'undefined') {
            intersectionObserver = new IntersectionObserver(entries => {
                visible = entries[0].isIntersecting;
                if (visible) {
                    enter();
                }
                start();
            }, { threshold: .2 });
            intersectionObserver.observe(stage);
        } else {
            enter();
            start();
        }

        (async () => {
            while (!runner.isStopped()) {
                await runner.wait(6000);
                if (!runner.isStopped() && visible) {
                    scatter(SCATTER_STRENGTH);
                }
            }
        })();

        return () => {
            disposed = true;
            runner.stop();
            cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            intersectionObserver?.disconnect();
            stage.removeEventListener('pointermove', onMove);
            stage.removeEventListener('pointerleave', onLeave);
            stage.removeEventListener('click', onClick);
        };
    }, []);

    return (
        <div className="document-swarm">
            <style>{`
                .document-swarm { container-type: inline-size; line-height: 0; }
                .document-swarm > .dsw-stage { position: relative; width: 100%; aspect-ratio: 21 / 9; cursor: crosshair; touch-action: pan-y; }
                .document-swarm canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
                .document-swarm .dsw-count { position: absolute; left: 12px; bottom: 10px; font-size: 11px; line-height: 1.4; letter-spacing: .04em; color: #A29DB6; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; pointer-events: none; }
                @container (max-width: 700px) {
                    .document-swarm > .dsw-stage { aspect-ratio: 4 / 3; }
                }
            `}</style>
            <div
                className="dsw-stage"
                ref={rootRef}
                role="img"
                aria-label="The RxDB logo made of small squares, one per document. The squares scatter and then spring back into the logo, and they move away from the pointer."
            >
                <canvas aria-hidden="true"></canvas>
                <span className="dsw-count">documents</span>
            </div>
        </div>
    );
}
