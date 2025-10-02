import * as React from 'react';

type IconDevicePhoneProps = React.SVGProps<SVGSVGElement> & {
  iconUrl?: string;
  /** Icon size in viewBox units (default ~12) */
  iconVb?: number;
  dark?: boolean;
};

export function IconDevicePhone({
  iconUrl,
  iconVb = 20,
  dark,
  ...props
}: IconDevicePhoneProps) {
  // Phone screen: x=1.78..41.78, y=2.22..74.22
  const cx = (1.78 + 41.78) / 2; // ~21.78
  const cy = (8.22 + 74.22) / 2; // ~38.22
  const w = iconVb;
  const h = iconVb;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width ?? 44}
      height={props.height ?? 76}
      viewBox="0 0 44 76"
      fill="none"
      {...props}
    >
      <defs>
        <clipPath id="phoneScreenClip">
          <path d="M35.08 2.22003H8.48003C4.77972 2.22003 1.78003 5.21972 1.78003 8.92003V67.52C1.78003 71.2203 4.77972 74.22 8.48003 74.22H35.08C38.7803 74.22 41.78 71.2203 41.78 67.52V8.92003C41.78 5.21972 38.7803 2.22003 35.08 2.22003Z" />
        </clipPath>
      </defs>

      <g clipPath="url(#clip0)">
        <path
          d="M35.08 2.22003H8.48003C4.77972 2.22003 1.78003 5.21972 1.78003 8.92003V67.52C1.78003 71.2203 4.77972 74.22 8.48003 74.22H35.08C38.7803 74.22 41.78 71.2203 41.78 67.52V8.92003C41.78 5.21972 38.7803 2.22003 35.08 2.22003Z"
          fill={dark ? '#2C3547' : '#0D0F18'}
          stroke="white"
          strokeWidth="3.56"
          strokeMiterlimit="10"
          strokeLinecap="round"
        />
        <path
          d="M16.78 9.72003H26.78"
          stroke="white"
          strokeWidth="4"
          strokeMiterlimit="10"
          strokeLinecap="round"
        />
      </g>

      {/* Centered icon */}
      {iconUrl && (
        <g clipPath="url(#phoneScreenClip)">
          <g transform={`translate(${cx} ${cy})`}>
            <image
              href={iconUrl}
              x={-w / 2}
              y={-h / 2}
              width={w}
              height={h}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        </g>
      )}

      <defs>
        <clipPath id="clip0">
          <rect
            width="43.56"
            height="75.56"
            fill="white"
            transform="translate(0 0.440002)"
          />
        </clipPath>
      </defs>
    </svg>
  );
}
