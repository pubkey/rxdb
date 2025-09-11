import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { EmojiMessageBox } from "./emoji-chat-message";
import { Subject } from 'rxjs';

type ChatItem = {
  emoji: string;
  creatorId: string;
  unixTime: number;
};

type EmojiChatProps = {
  /** Array of chat items (messages) */
  items: {
    emoji: string;
    direction: "left" | "right";
  }[];
  /** Fired when one of the 3 bottom buttons is clicked */
  onButtonClick?: (index: number, emoji: string) => void;
  buttonEmojis?: [string, string, string];
};

export function EmojiChat({ items, onButtonClick, buttonEmojis = ["👾", "👨‍💻", "💡"] }: EmojiChatProps) {
  const frame: CSSProperties = {
    width: 230,
    height: 435,
    position: "relative",
    borderRadius: 40,
    border: "4px solid var(--White, #FFF)",
    boxShadow:
      "0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px 0 rgba(0, 0, 0, 0.30)",
    overflow: "hidden",
    padding: 8,
    flexShrink: 0,
  };

  const screen: CSSProperties = {
    position: "absolute",
    inset: 4,
    borderRadius: 32,
    overflow: "hidden",
  };

  const notchWrap: CSSProperties = {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    width: 80,
    height: 20,
    borderRadius: 10,
    background: "var(--Section-Dark, #0D0F18)",
    zIndex: 2,
  }

  const content: CSSProperties = {
    position: "absolute",
    inset: "50px 12px 60px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const bottomBar: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    display: "flex",
    justifyContent: "space-around",
    padding: "0 12px",
  };

  // Only show the last 5 messages
  const visibleItems = items.slice(-5);

  return (
    <div style={frame}>
      <div style={screen} className="chat-background">
        <div style={notchWrap} />

        <div style={content}>
          {visibleItems.map((item, i) => (
            <EmojiMessageBox
              key={i}
              direction={item.direction}
              emoji={item.emoji}
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
};

export function EmojiChatStateful({ online, chatId, buttonEmojis }: EmojiChatStatefulProps) {
  // holds unsynced chat items for THIS instance (with timestamps so we can show them)
  const unsynced = useRef<ChatItem[]>([]);

  // remembers the last time items were refreshed
  const lastOnlineAt = useRef<number | null>(null);

  // local state for visible messages
  const [items, setItems] = useState<ChatItem[]>([]);

  // helper to reload items from storage AND include our unsynced items
  function refreshItems() {
    const stored = getEmojiChatState();
    const merged = [...stored, ...unsynced.current];

    // ✅ sort by unixTime ascending for consistent order
    merged.sort((a, b) => a.unixTime - b.unixTime);

    setItems(merged);
    lastOnlineAt.current = Date.now(); // track last refresh time
  }

  // initial load + subscribe to subject (emits on local writes and cross-tab updates)
  useEffect(() => {
    refreshItems();

    const sub = chatStateSubject.subscribe(() => {
      refreshItems();
    });

    return () => sub.unsubscribe();
  }, []);

  // flush unsynced items when switching to online
  useEffect(() => {
    if (online && unsynced.current.length > 0) {
      addEmojiChatStates(
        unsynced.current.map(({ emoji, creatorId }) => ({ emoji, creatorId }))
      );
      unsynced.current = [];
      refreshItems();
    }
  }, [online]);

  function handleAdd(emoji: string) {
    const entry: ChatItem = {
      emoji,
      creatorId: chatId,
      unixTime: Date.now(),
    };

    if (online) {
      // write-through and emit via subject
      addEmojiChatStates([{ emoji: entry.emoji, creatorId: entry.creatorId }]);
      refreshItems();
    } else {
      // queue locally and show immediately
      unsynced.current.push(entry);
      refreshItems();
    }
  }

  // map persisted+unsynced items into EmojiChat's format
  const mappedItems = items.map((item) => ({
    emoji: item.emoji,
    direction: item.creatorId === chatId ? ("right" as const) : ("left" as const),
  }));

  return (
    <EmojiChat
      items={mappedItems}
      buttonEmojis={buttonEmojis}
      onButtonClick={(_, emoji) => {
        handleAdd(emoji);
      }}
    />
  );
}


const STORAGE_ID = 'emoji-chat-state';
const chatStateSubject = new Subject<void>();
window.addEventListener("storage", () => {
  chatStateSubject.next();
});


export function getEmojiChatState(): ChatItem[] {
  const data = localStorage.getItem(STORAGE_ID);
  if (!data) {
    return [];
  }
  let list: ChatItem[] = JSON.parse(data);

  /**
   * To not fill up the locale storage over time,
   * clean up the list if it becomes too big.
   */
  if (list.length > 20) {
    list = list.sort((a, b) => a.unixTime - b.unixTime);
    list = list.slice(-10);
    localStorage.setItem(STORAGE_ID, JSON.stringify(list));
  }

  return list;
}

export function addEmojiChatStates(list: { emoji: string, creatorId: string }[]) {
  const state = getEmojiChatState();
  list.forEach(i => {
    state.push({
      creatorId: i.creatorId,
      emoji: i.emoji,
      unixTime: Date.now()
    });
  });
  console.log('addEmojiChatStates set item!');
  localStorage.setItem(STORAGE_ID, JSON.stringify(state));
  chatStateSubject.next();
}
