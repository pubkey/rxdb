import React from 'react';
import { IconProps } from './arrow-right';


export function IconArrowLeft({ style, className }: IconProps) {
    return (
        <div style={style} className={className}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="30"
                viewBox="0 0 18 30"
                fill="none"
            >
                <path d="M12 24H6L6 18H12V24Z" fill="white" />
                <path d="M18 30H12V24H18V30Z" fill="white" />
                <path d="M6 18H0L0 12H6L6 18Z" fill="white" />
                <path d="M12 12H6L6 6L12 6V12Z" fill="white" />
                <path d="M18 6L12 6V0L18 0V6Z" fill="white" />
            </svg>
        </div>
    );
}
