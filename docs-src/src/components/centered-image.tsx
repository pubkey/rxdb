/**
 * Centered image for docs pages. Replaces the raw
 * <p align="center"><img ... /></p> pattern and enforces
 * alt text and lazy loading in one place.
 *
 * Usage in .md/.mdx files:
 *
 * <CenteredImage src="./files/logo.png" alt="RxDB replication" width={450} />
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
}) {
    const image = (
        <img
            src={props.src}
            alt={props.alt}
            width={props.width}
            loading="lazy"
            style={{ maxWidth: '100%', height: 'auto' }}
        />
    );
    return (
        <p style={{ textAlign: 'center' }}>
            {props.href ? <a href={props.href}>{image}</a> : image}
        </p>
    );
}
