import React, {
  CSSProperties,
  FC,
  useEffect,
  useRef,
  useState
} from 'react';
import { replicationLinks } from './sync-section';
import useIsBrowser from '@docusaurus/useIsBrowser';

interface CloudProps {
  darkMode?: boolean;
}

// Old icon slides out to the RIGHT; new icon slides in from the LEFT
export const Cloud: FC<CloudProps> = ({ darkMode = false }) => {
  const [, setIconIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string>(replicationLinks[0].iconUrl);
  const [prevUrl, setPrevUrl] = useState<string | undefined>(undefined);

  const prevRef = useRef<HTMLImageElement | null>(null);
  const currRef = useRef<HTMLImageElement | null>(null);


  const isBrowser = useIsBrowser();

  // Handle "heartbeat": advance to next icon and trigger slide transition
  useEffect(() => {
    if (isBrowser) { return; }
    const handleHeartbeat = () => {
      setIconIndex(prev => {
        const next = (prev + 1) % replicationLinks.length;
        const nextUrl = replicationLinks[next].iconUrl;

        setPrevUrl(currentUrl);
        setCurrentUrl(nextUrl);

        return next;
      });
    };

    window.addEventListener('heartbeat', handleHeartbeat);
    return () => window.removeEventListener('heartbeat', handleHeartbeat);
  }, [currentUrl]);

  // Kick off the slide animation when there's a prev icon
  useEffect(() => {
    if (isBrowser) { return; }
    if (!prevUrl) return;

    const raf = requestAnimationFrame(() => {
      if (prevRef.current) {
        prevRef.current.style.transform = 'translateX(100%)'; // out to RIGHT
        prevRef.current.style.opacity = '0';
      }
      if (currRef.current) {
        currRef.current.style.transform = 'translateX(0)'; // in to center
        currRef.current.style.opacity = '1';
      }
    });

    const tid = window.setTimeout(() => setPrevUrl(undefined), 340);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(tid);
    };
  }, [prevUrl]);

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  };

  const badgeStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -10%)',
  };

  const circleColor: string = darkMode ? 'var(--bg-color)' : 'var(--bg-color-dark)';
  const circleBorder: string = darkMode ? 'var(--bg-color-dark)' : 'var(--bg-color)';

  const badgeInnerStyle: CSSProperties = {
    width: 'clamp(10px, 8vw, 56px)',
    height: 'clamp(10px, 8vw, 56px)',
    background: circleColor,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `4px solid ${circleBorder}`,
    position: 'relative',
    overflow: 'hidden',
  };

  const iconBase: CSSProperties = {
    position: 'absolute',
    inset: 0,
    margin: 'auto',
    maxWidth: '60%',
    maxHeight: '60%',
    transition: 'transform 300ms ease, opacity 300ms ease',
  };

  return (
    <div style={wrapperStyle}>
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
          {prevUrl && (
            <img
              ref={prevRef}
              src={prevUrl}
              alt="previous icon"
              style={{
                ...iconBase,
                transform: 'translateX(0)', // start centered
                opacity: 1,
              }}
            />
          )}
          {currentUrl && (
            <img
              ref={currRef}
              src={currentUrl}
              alt="icon"
              style={{
                ...iconBase,
                transform: prevUrl ? 'translateX(-100%)' : 'translateX(0)', // come from LEFT
                opacity: prevUrl ? 0 : 1,
              }}
              onLoad={() => {
                if (!prevUrl && currRef.current) {
                  currRef.current.style.transform = 'translateX(0)';
                  currRef.current.style.opacity = '1';
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
