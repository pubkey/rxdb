import React from 'react';
import { IconProps } from './arrow-right';

export function IconArrowUpRight({ style, className }: IconProps) {
    return (
        <div style={style} className={className}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-arrow-up-right-icon lucide-arrow-up-right"
                viewBox="0 0 24 24"
                width="18"
                height="18"
            >
                <path d="M7 7h10v10M7 17 17 7" />
            </svg>
        </div>
    );
}
