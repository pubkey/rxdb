import React, { useState } from 'react';
import { Modal } from './modal';

/**
 * Centered image for docs pages. Replaces the raw
 * <p align="center"><img ... /></p> pattern and enforces
 * alt text and lazy loading in one place.
 *
 * Usage in .md/.mdx files:
 *
 * <CenteredImage src="./files/logo.png" alt="RxDB replication" width={450} />
 *
 * With zoomable, a click on the image opens it in full size in a modal.
 * Use this for screenshots that contain details which are too small
 * to read at the width of the docs page.
 */
export function CenteredImage(props: {
    src: string;
    /**
     * Short keyword phrase describing the image, used for SEO.
     */
    alt: string;
    width?: number | string;
    /**
     * (optional) Wraps the image in a link to this URL.
     */
    href?: string;
    /**
     * (optional) Opens the image in full size in a modal when it is clicked.
     * Ignored when href is set.
     * [default=false]
     */
    zoomable?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const zoomable = props.zoomable && !props.href;
    const image = (
        <img
            src={props.src}
            alt={props.alt}
            width={props.width}
            loading="lazy"
            style={{ maxWidth: '100%', height: 'auto' }}
        />
    );

    let content: React.ReactNode = image;
    if (props.href) {
        content = <a href={props.href}>{image}</a>;
    } else if (zoomable) {
        content = (
            <button
                type="button"
                className="centered-image__zoom"
                aria-label={'Open larger image: ' + props.alt}
                onClick={() => setOpen(true)}
            >
                {image}
            </button>
        );
    }

    return (
        <p style={{ textAlign: 'center' }}>
            {content}
            {zoomable ? (
                <Modal
                    open={open}
                    onCancel={() => setOpen(false)}
                    title={props.alt}
                    width="auto"
                    className="centered-image__modal"
                >
                    <img
                        src={props.src}
                        alt={props.alt}
                        className="centered-image__full"
                    />
                </Modal>
            ) : null}
        </p>
    );
}
