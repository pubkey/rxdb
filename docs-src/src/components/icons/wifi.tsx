import { IconProps } from './arrow-right';

export function IconWifi({ style, className }: IconProps) {
    return <div style={style} className={className}>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={26}
            height={21}
            fill="none"
        >
            <g
                stroke="#fff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                clipPath="url(#a)"
            >
                <path d="M2 6.909a15.714 15.714 0 0 1 22 0M7.5 13.869a7.857 7.857 0 0 1 11 0M12.992 18.583h.016" />
            </g>
            <defs>
                <clipPath id="a">
                    <path fill="#fff" d="M0 .417h26v20.167H0z" />
                </clipPath>
            </defs>
        </svg>
    </div >;
}
