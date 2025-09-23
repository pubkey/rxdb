import React, {
  CSSProperties,
  FC,
  useEffect,
  useState
} from 'react';
import { replicationLinks } from './sync-section';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

interface CloudProps {
  darkMode?: boolean;
  style?: CSSProperties;
  className?: string;
}

// No animations: just swap the icon
export const Cloud: FC<CloudProps> = ({ darkMode = false, style, className }) => {
  const [, setIconIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string>(replicationLinks[0].iconUrl);

  // Handle "heartbeat": advance to next icon (no transitions)
  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) return;

    const handleHeartbeat = () => {
      setIconIndex(prev => {
        const next = (prev + 1) % replicationLinks.length;
        const nextUrl = replicationLinks[next].iconUrl;
        setCurrentUrl(nextUrl);
        return next;
      });
    };

    window.addEventListener('heartbeat', handleHeartbeat);
    return () => window.removeEventListener('heartbeat', handleHeartbeat);
  }, []);

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    // keep composited
    transformStyle: 'preserve-3d',
    ...style, // merge custom style
  };

  const badgeStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -10%)',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    // keep composited
    transformStyle: 'preserve-3d',
  };

  const circleColor: string = darkMode ? 'var(--bg-color)' : 'var(--bg-color-dark)';
  const circleBorder: string = darkMode ? 'var(--bg-color-dark)' : 'var(--bg-color)';

  const badgeInnerStyle: CSSProperties = {
    width: '56px',
    height: '56px',
    background: circleColor,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `4px solid ${circleBorder}`,
    position: 'relative',
    overflow: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    // keep composited
    transformStyle: 'preserve-3d',
  };

  const iconStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    margin: 'auto',
    maxWidth: '60%',
    maxHeight: '60%',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    // keep composited
    transformStyle: 'preserve-3d',
  };

  return (
    <div style={wrapperStyle} className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="126"
        height="96"
        viewBox="0 0 126 96"
        fill="none"
      >
        <path
          d="M99.6095 31.2864H92.5913C91.846 31.2864 91.1939 30.799 90.961 30.0949C86.2952 16.3386 73.3224 7.00012 58.6573 7.00012C39.8154 7.00012 24.537 22.211 24.537 40.9885V41.004C24.537 41.9634 23.7684 42.7525 22.8057 42.7525H20.5621C11.7894 42.7525 4.32097 49.5533 4.01043 58.2883C3.68437 67.4566 11.0441 75.0001 20.1739 75.0001H100.067C112.388 75.0001 122.333 64.8802 121.991 52.532C121.65 40.1839 111.565 31.2864 99.6095 31.2864Z"
          fill="white"
          stroke="white"
          strokeWidth={4}
        />
      </svg>
      <div style={badgeStyle}>
        <div style={badgeInnerStyle}>
          {currentUrl && (
            <img
              src={currentUrl}
              alt="icon"
              style={iconStyle}
            />
          )}
        </div>
      </div>
    </div>
  );
};
