import React from 'react';

/**
 * Intrinsic aspect ratio of files/logo/rxdb_javascript_database.svg
 * (viewBox "0 0 282.19 140"). Used to derive an explicit height from the
 * given width so the browser reserves space and we avoid layout shift (CLS).
 */
const LOGO_ASPECT_RATIO = 282.19 / 140;

type RxdbLogoProps = {
    alt?: string;
    width?: number;
    href?: string;
};

/**
 * Centered, linked RxDB logo used at the top of many articles.
 * Renders the image with explicit width and height to prevent
 * Cumulative Layout Shift.
 */
export function RxdbLogo({
    alt = 'RxDB JavaScript Database',
    width = 220,
    href = 'https://rxdb.info/',
}: RxdbLogoProps) {
    const height = Math.round(width / LOGO_ASPECT_RATIO);
    return (
        <p style={{ textAlign: 'center' }}>
            <a href={href}>
                <img
                    src="/files/logo/rxdb_javascript_database.svg"
                    alt={alt}
                    width={width}
                    height={height}
                    loading="lazy"
                />
            </a>
        </p>
    );
}

export default RxdbLogo;
