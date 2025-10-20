import * as React from 'react';

type IconDeviceDesktopProps = React.SVGProps<SVGSVGElement> & {
  iconUrl?: string;
  /** Icon size in viewBox units (default ~18) */
  iconVb?: number;
  dark?: boolean;
};

export function IconDeviceDesktop({
  iconUrl,
  iconVb = 21,
  dark,
  ...props
}: IconDeviceDesktopProps) {
  // Monitor screen rectangle path: x=10.67..69.33, y=4.2..54.6
  const cx = (10.67 + 69.33) / 2; // ~40
  const cy = (4.2 + 54.6) / 2;    // ~29.4
  const w = iconVb;
  const h = iconVb;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width ?? 80}
      height={props.height ?? 73}
      viewBox="0 0 80 73"
      fill="none"
      {...props}
    >
      <defs>
        <clipPath id="desktopScreenClip">
          <path d="M69.33 4.20001H10.67C6.98626 4.20001 4 7.18627 4 10.87V47.93C4 51.6138 6.98626 54.6 10.67 54.6H69.33C73.0137 54.6 76 51.6138 76 47.93V10.87C76 7.18627 73.0137 4.20001 69.33 4.20001Z" />
        </clipPath>
      </defs>

      <path
        d="M69.33 4.20001H10.67C6.98626 4.20001 4 7.18627 4 10.87V47.93C4 51.6138 6.98626 54.6 10.67 54.6H69.33C73.0137 54.6 76 51.6138 76 47.93V10.87C76 7.18627 73.0137 4.20001 69.33 4.20001Z"
        fill={dark ? '#2C3547' : '#0D0F18'}
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25.6001 69H54.4001"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 54.6V69"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Centered icon inside the monitor screen */}
      {iconUrl && (
        <g clipPath="url(#desktopScreenClip)">
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
