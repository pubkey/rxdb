import React from 'react';
import { IconProps } from './arrow-right';

/**
 * Right arrow with a shaft, drawn on the same
 * 6px square grid as IconArrowRight.
 */
export function IconArrowRightPixel({ style, className }: IconProps) {
    return (
        <div style={style} className={className}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="11"
                height="11"
                viewBox="0 0 30 30"
                fill="none"
                style={{ display: 'block' }}
            >
                <path d="M12 0H18V6H12V0Z" fill="white" />
                <path d="M18 6H24V12H18V6Z" fill="white" />
                <path d="M0 12H30V18H0V12Z" fill="white" />
                <path d="M18 18H24V24H18V18Z" fill="white" />
                <path d="M12 24H18V30H12V24Z" fill="white" />
            </svg>
        </div>
    );
}
