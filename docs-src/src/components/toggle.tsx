import React, { CSSProperties, useCallback, useId } from 'react';

type PixelToggleProps = {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  className?: string;
};

export function PixelToggle({
  checked = false,
  onChange,
  className,
}: PixelToggleProps) {
  const handleToggle = useCallback(() => {
    onChange?.(!checked);
  }, [checked, onChange]);

  const gradientId = useId(); // ✅ unique per component instance

  const W = 52;
  const H = 27;
  const THUMB_W = 21;
  const THUMB_H = 22;

  const TOP = (H - THUMB_H) / 2 + 0.5;
  const LEFT_ON = W - 5 - THUMB_W;
  const LEFT_OFF = 5;

  const container: CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    width: W,
    height: H,
    cursor: 'pointer',
    outline: 'none',
  };

  const thumbStyle: CSSProperties = {
    position: 'absolute',
    top: TOP,
    left: checked ? LEFT_ON : LEFT_OFF,
    width: THUMB_W,
    height: THUMB_H,
    transition: 'left 140ms ease',
    pointerEvents: 'none',
  };

  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleToggle();
        }
      }}
      style={container}
      className={className}
    >
      {/* Track SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={W}
        height={H}
        viewBox="0 0 52 27"
        fill="none"
        style={{ display: 'block' }}
      >
        <path
          d="M46.8 5.78331V0.583313H5.20003V5.78331H0V21.3833H5.20003V26.5833L46.8 26.5833V21.3833H52V5.78331H46.8Z"
          fill={checked ? `url(#${gradientId})` : '#5a5a6a'}
        />
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="13.5833"
            x2="52"
            y2="13.5833"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ED168F" />
            <stop offset="1" stopColor="#B2218B" />
          </linearGradient>
        </defs>
      </svg>

      {/* Thumb SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 21 22"
        width={THUMB_W}
        height={THUMB_H}
        style={thumbStyle}
      >
        <path
          d="M16.8 4.29344V0.0934448H4.2V4.29344H0V16.8934H4.2V21.0934H16.8V16.8934H21V4.29344H16.8Z"
          fill="white"
        />
      </svg>
    </div>
  );
}
