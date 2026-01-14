import * as React from 'react';

type IconDeviceTabletProps = React.SVGProps<SVGSVGElement> & {
  iconUrl?: string;
  /** Icon size in viewBox units (default ~14) */
  iconVb?: number;
  dark?: boolean;
};

export function IconDeviceTablet({
  iconUrl,
  iconVb = 24,
  dark,
  ...props
}: IconDeviceTabletProps) {
  // Tablet screen rectangle from path: x=2..52.4, y=2..74 → width ~50.4, height ~72
  const cx = 27.2; // horizontal center
  const cy = 32;   // vertical center
  const w = iconVb;
  const h = iconVb;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.width ?? 55}
      height={props.height ?? 76}
      viewBox="0 0 55 76"
      fill="none"
      {...props}
    >
      <defs>
        {/* ClipPath to keep icon inside tablet body */}
        <clipPath id="tabletScreenClip">
          <path d="M45.7 2H8.7C4.99969 2 2 4.99969 2 8.7V67.3C2 71.0003 4.99969 74 8.7 74H45.7C49.4003 74 52.4 71.0003 52.4 67.3V8.7C52.4 4.99969 49.4003 2 45.7 2Z" />
        </clipPath>
      </defs>

      <g clipPath="url(#clip0_752_214)">
        <path
          d="M45.7 2H8.7C4.99969 2 2 4.99969 2 8.7V67.3C2 71.0003 4.99969 74 8.7 74H45.7C49.4003 74 52.4 71.0003 52.4 67.3V8.7C52.4 4.99969 49.4003 2 45.7 2Z"
          fill={dark ? '#20293C' : '#0D0F18'}
          stroke="white"
          strokeWidth="4"
          strokeMiterlimit="10"
          strokeLinecap="round"
        />
        <path
          d="M27.2 66.34C26.15 66.34 25.12 65.91 24.37 65.17C24.19 64.98 24.0199 64.78 23.8799 64.56C23.7299 64.34 23.61 64.11 23.51 63.87C23.41 63.63 23.33 63.37 23.28 63.12C23.23 62.86 23.2 62.6 23.2 62.34C23.2 62.08 23.23 61.81 23.28 61.56C23.33 61.3 23.41 61.05 23.51 60.81C23.61 60.57 23.7299 60.34 23.8799 60.12C24.0199 59.9 24.19 59.69 24.37 59.51C25.3 58.58 26.6799 58.15 27.9799 58.42C28.24 58.47 28.49 58.54 28.7299 58.64C28.9699 58.74 29.2 58.87 29.42 59.01C29.64 59.16 29.85 59.33 30.03 59.51C30.21 59.69 30.38 59.9 30.53 60.12C30.67 60.34 30.7899 60.57 30.8899 60.81C30.9899 61.05 31.07 61.3 31.12 61.56C31.17 61.81 31.2 62.08 31.2 62.34C31.2 62.6 31.17 62.86 31.12 63.12C31.07 63.37 30.9899 63.63 30.8899 63.87C30.7899 64.11 30.67 64.34 30.53 64.56C30.38 64.78 30.21 64.98 30.03 65.17C29.28 65.91 28.25 66.34 27.2 66.34Z"
          fill="white"
        />
      </g>

      {/* Centered icon in screen */}
      {iconUrl && (
        <g clipPath="url(#tabletScreenClip)">
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
        <clipPath id="clip0_752_214">
          <rect width="54.4" height="76" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
