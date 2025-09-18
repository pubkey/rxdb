import React from 'react';
import { IconProps } from './arrow-right';


export function IconCheck({ className, style }: IconProps) {
    return (
        <div className={className} style={style}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="37"
                height="26"
                viewBox="0 0 37 26"
                fill="none"
                className={className}
                style={style}
            >
                <g clipPath="url(#clip0_655_2317)">
                    <path
                        d="M34.7911 2.21277L13.2538 23.7872L2.20898 12.7234"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
                <defs>
                    <clipPath id="clip0_655_2317">
                        <rect width="37" height="26" fill="white" />
                    </clipPath>
                </defs>
            </svg>
        </div>
    );
}
