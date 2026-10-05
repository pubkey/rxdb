import type { ReactNode } from 'react';

/**
 * Frame for embedding an animation into a docs page.
 * Centers the animation, limits its width and gives it the dark
 * background that the animation components are designed for.
 * The animation itself should scale to 100% of the frame width.
 * Animation components live in docs-src/src/components/animations/.
 *
 * Usage in .md/.mdx files:
 *
 * import {DocsAnimation} from '@site/src/components/docs-animation';
 * import {PartialSyncChunks} from '@site/src/components/animations/partial-sync-chunks';
 *
 * <DocsAnimation subtitle="Partial sync in a voxel game that only syncs the chunks near the player.">
 * <PartialSyncChunks />
 * </DocsAnimation>
 */
export function DocsAnimation(props: {
    children: ReactNode;
    /**
     * (optional) Maximum width of the animation in pixels.
     * [default=480]
     */
    maxWidth?: number;
    /**
     * One-line caption shown centered below the animation that
     * describes what it shows, like the text below an image on Wikipedia.
     */
    subtitle: ReactNode;
}) {
    return (
        <figure style={{ margin: '24px auto', maxWidth: props.maxWidth ?? 480, textAlign: 'center' }}>
            <div style={{ borderRadius: 8, background: '#0D0F18', overflow: 'hidden', lineHeight: 0 }}>
                {props.children}
            </div>
            <figcaption style={{ marginTop: 8, fontSize: '0.9em', opacity: 0.8, textAlign: 'center' }}>
                {props.subtitle}
            </figcaption>
        </figure>
    );
}
