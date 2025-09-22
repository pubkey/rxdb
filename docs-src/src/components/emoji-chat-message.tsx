import React, {
  CSSProperties,
  ReactNode,
  MouseEventHandler,
  useState,
  useEffect,
} from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

type EmojiMessageBoxProps = {
  /** Emoji to display (string or custom React node). */
  emoji: string | ReactNode;
  /** Direction of the message: "left", "right", or "button". */
  direction: 'left' | 'right' | 'button';
  /** Optional click handler (used when direction = "button"). */
  onClick?: MouseEventHandler<HTMLDivElement>;
  simulateClicks: boolean;
};

const usedEvents = new WeakSet<CustomEvent>();

export function EmojiMessageBox({
  emoji,
  direction,
  onClick,
  simulateClicks
}: EmojiMessageBoxProps) {
  const [isClicked, setIsClicked] = useState(false);

  function triggerClick() {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 100);
    onClick?.({} as any); // simulate a click event (you can pass null if not needed)
  }

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return;
    }

    function handleHeartbeat(e) {
      if (
        simulateClicks &&
        direction === 'button' &&
        Math.random() < 0.16
      ) {
        if (usedEvents.has(e)) {
          return;
        }
        usedEvents.add(e);
        // 20% chance each tick
        triggerClick();
      }
    }
    window.addEventListener('heartbeat', handleHeartbeat);
    return () => window.removeEventListener('heartbeat', handleHeartbeat);
  }, []);

  const wrapper: CSSProperties = {
    display: 'flex',
    justifyContent:
      direction === 'right'
        ? 'flex-end'
        : direction === 'left'
          ? 'flex-start'
          : 'center',
    width: '100%',
  };

  const base: CSSProperties = {
    display: 'flex',
    width: '48px',
    height: '48px',
    padding: '10px',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    userSelect: 'none',
    boxShadow:
      '0 1px 2px 0 rgba(0, 0, 0, 0.30), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
    transition: 'transform 200ms ease', // smooth animation
  };

  let container: CSSProperties;
  if (direction === 'left') {
    container = {
      ...base,
      borderRadius: '0 24px 24px 24px',
      background: 'var(--40-grey, #666)',
      cursor: 'default',
    };
  } else if (direction === 'right') {
    container = {
      ...base,
      borderRadius: '24px 0 24px 24px',
      background: 'var(--40-grey, #666)',
      cursor: 'default',
    };
  } else {
    // button style
    container = {
      ...base,
      borderRadius: '24px',
      background: 'var(--bg-color-dark)',
      cursor: 'pointer',
      transform: isClicked ? 'scale(1.2)' : 'scale(1)', // grow briefly
    };
  }



  return (
    <div style={wrapper}>
      <div style={container} onClick={triggerClick}>
        {emoji}
      </div>
    </div>
  );
}
