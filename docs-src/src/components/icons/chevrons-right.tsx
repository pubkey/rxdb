import React from 'react';
import { IconProps } from './arrow-right';

export function IconChevronsRight({ style, className }: IconProps) {
    return (
        <div style={style} className={className}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-chevrons-right-icon lucide-chevrons-right"
                viewBox="0 0 24 24"
                width="18"
                height="18"
            >
                <path d="m6 17 5-5-5-5M13 17l5-5-5-5" />
            </svg>
        </div>
    );
}
