import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { EmojiMessageBox } from './emoji-chat-message';
import { Subject } from 'rxjs';
import useIsBrowser from '@docusaurus/useIsBrowser';

type ChatItem = {
  emoji: string;
  creatorId: string;
  unixTime: number;
};

type EmojiChatProps = {
  /** Array of chat items (messages) */
  items: {
    emoji: string;
    direction: 'left' | 'right';
  }[];
  /** Fired when one of the 3 bottom buttons is clicked */
  onButtonClick?: (index: number, emoji: string) => void;
  buttonEmojis?: [string, string, string];
  /** Optional class for the outer frame */
  className?: string;
  simulateClicks: boolean;
};

export function EmojiChat({
  items,
  onButtonClick,
  buttonEmojis = ['👾', '👨‍💻', '💡'],
  className,
  simulateClicks
}: EmojiChatProps) {
  const frame: CSSProperties = {
    width: 230,
    height: 435,
    position: 'relative',
    borderRadius: 40,
    border: '4px solid var(--White, #FFF)',
    boxShadow:
      '0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px 0 rgba(0, 0, 0, 0.30)',
    overflow: 'hidden',
    padding: 8,
    flexShrink: 0,
  };

  const screen: CSSProperties = {
    position: 'absolute',
    inset: 4,
    borderRadius: 32,
    overflow: 'hidden',
  };

  const notchWrap: CSSProperties = {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 80,
    height: 20,
    borderRadius: 10,
    background: 'var(--Section-Dark, #0D0F18)',
    zIndex: 2,
  };

  const content: CSSProperties = {
    position: 'absolute',
    inset: '50px 12px 60px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const bottomBar: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    display: 'flex',
    justifyContent: 'space-around',
    padding: '0 12px',
  };

  const visibleItems = items.slice(-5);

  return (
    <div style={frame} className={className}>
      <div style={screen} className="chat-background">
        <div style={notchWrap} />

        <div style={content}>
          {visibleItems.map((item, i) => (
            <EmojiMessageBox
              key={i}
              direction={item.direction}
              emoji={item.emoji}
              simulateClicks={false}
            />
          ))}
        </div>

        {/* Always render 3 buttons at bottom */}
        <div style={bottomBar}>
          {buttonEmojis.map((emoji, i) => (
            <EmojiMessageBox
              key={`btn-${i}`}
              direction="button"
              emoji={emoji}
              onClick={() => onButtonClick?.(i, emoji)}
              simulateClicks={simulateClicks}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type EmojiChatStatefulProps = {
  online: boolean;
  chatId: string;
  buttonEmojis?: [string, string, string];
  className?: string;
  simulateClicks: boolean;
};

export function EmojiChatStateful({
  online,
  chatId,
  buttonEmojis,
  className,
  simulateClicks
}: EmojiChatStatefulProps) {
  const isBrowser = useIsBrowser();

  const unsynced = useRef<ChatItem[]>([]);
  const lastOnlineAt = useRef<number | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);

  function refreshItems() {
    // Safe on SSR: returns [] when not in browser
    const stored = getEmojiChatState();
    const merged = [...stored, ...unsynced.current];
    merged.sort((a, b) => a.unixTime - b.unixTime);
    setItems(merged);
    lastOnlineAt.current = Date.now();
  }

  useEffect(() => {
    if (!isBrowser) return;

    refreshItems();

    // Register storage listener only in the browser
    const onStorage = () => chatStateSubject.next();
    window.addEventListener('storage', onStorage);

    const sub = chatStateSubject.subscribe(() => {
      refreshItems();
    });

    return () => {
      window.removeEventListener('storage', onStorage);
      sub.unsubscribe();
    };
  }, [isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;

    if (online && unsynced.current.length > 0) {
      addEmojiChatStates(
        unsynced.current.map(({ emoji, creatorId }) => ({ emoji, creatorId }))
      );
      unsynced.current = [];
      refreshItems();
    }
  }, [online, isBrowser]);

  function handleAdd(emoji: string) {
    const entry: ChatItem = {
      emoji,
      creatorId: chatId,
      unixTime: Date.now(),
    };

    if (isBrowser && online) {
      addEmojiChatStates([{ emoji: entry.emoji, creatorId: entry.creatorId }]);
      refreshItems();
    } else {
      // Safe to update local ref even during SSR; only read on client
      unsynced.current.push(entry);
      refreshItems();
    }
  }

  const mappedItems = items.map((item) => ({
    emoji: item.emoji,
    direction: item.creatorId === chatId ? ('right' as const) : ('left' as const),
  }));

  return (
    <EmojiChat
      items={mappedItems}
      buttonEmojis={buttonEmojis}
      className={className}
      simulateClicks={simulateClicks}
      onButtonClick={(_, emoji) => {
        handleAdd(emoji);
      }}
    />
  );
}

const STORAGE_ID = 'emoji-chat-state';
const chatStateSubject = new Subject<void>();

export function getEmojiChatState(): ChatItem[] {
  // Guard for SSR
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(STORAGE_ID);
    if (!data) return [];
    let list: ChatItem[] = JSON.parse(data);
    if (list.length > 20) {
      list = list.sort((a, b) => a.unixTime - b.unixTime).slice(-10);
      window.localStorage.setItem(STORAGE_ID, JSON.stringify(list));
    }
    return list;
  } catch {
    return [];
  }
}

export function addEmojiChatStates(list: { emoji: string; creatorId: string; }[]) {
  // Guard for SSR
  if (typeof window === 'undefined') return;
  const state = getEmojiChatState();
  list.forEach(i => {
    state.push({ creatorId: i.creatorId, emoji: i.emoji, unixTime: Date.now() });
  });
  // eslint-disable-next-line no-console
  console.log('addEmojiChatStates set item!');
  window.localStorage.setItem(STORAGE_ID, JSON.stringify(state));
  chatStateSubject.next();
}
