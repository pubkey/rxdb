import * as React from 'react';

type IconDeviceSmartwatchProps = React.SVGProps<SVGSVGElement> & {
  iconUrl?: string;
  /** Icon size in viewBox units (default ~10) */
  iconVb?: number;
};

export function IconDeviceSmartwatch({
  iconUrl,
  iconVb = 16,
  ...props
}: IconDeviceSmartwatchProps) {
  // Watch screen rectangle path: x=10.67..37.33, y=18.37..61.63
  const cx = (10.67 + 37.33) / 2; // ~24
  const cy = (18.37 + 61.63) / 2; // ~40
  const w = iconVb;
  const h = iconVb;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width ?? 56}
      height={props.height ?? 80}
      viewBox="0 0 56 80"
      fill="none"
      {...props}
    >
      <defs>
        <clipPath id="smartwatchScreenClip">
          <path d="M37.33 18.37H10.67C6.98626 18.37 4 21.3563 4 25.04V54.96C4 58.6437 6.98626 61.63 10.67 61.63H37.33C41.0137 61.63 44 58.6437 44 54.96V25.04C44 21.3563 41.0137 18.37 37.33 18.37Z" />
        </clipPath>
      </defs>

      <path
        d="M10.23 18.42L11.89 9.8C12.57 6.37 15.61 3.93 19.1 4H28.76C32.25 3.93 35.29 6.38 35.97 9.8L37.69 18.42"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M37.9601 61.69L36.2601 70.2C35.5801 73.63 32.5401 76.07 29.0501 76H19.2401C15.7501 76.07 12.7101 73.62 12.0301 70.2L10.3301 61.69"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M37.33 18.37H10.67C6.98626 18.37 4 21.3563 4 25.04V54.96C4 58.6437 6.98626 61.63 10.67 61.63H37.33C41.0137 61.63 44 58.6437 44 54.96V25.04C44 21.3563 41.0137 18.37 37.33 18.37Z"
        fill="#2C3547"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 36.44V29.24"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Centered icon */}
      {iconUrl && (
        <g clipPath="url(#smartwatchScreenClip)">
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
    </svg>
  );
}
