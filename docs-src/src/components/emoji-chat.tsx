import React, { CSSProperties, useRef } from "react";
import { EmojiMessageBox } from "./emoji-chat-message";

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
};

export function EmojiChat({ items, onButtonClick }: EmojiChatProps) {
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

    // Fixed set of 3 button emojis
    const buttonEmojis = ["👾", "👨‍💻", "💡"];

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


export function EmojiChatStateful() {
    const idRef = useRef<string>(
        Math.random().toString(36).substring(2, 10) // short random id
    );
    const chatId = idRef.current;

    return <EmojiChat
        items={[]}
        onButtonClick={(i, emoji) => addEmojiChatState(emoji, chatId)}
    />;
}



const STORAGE_ID = 'emoji-chat-state';
export function getEmojiChatState(): ChatItem[] {
    const data = localStorage.getItem(STORAGE_ID);
    if (!data) {
        return [];
    }
    return JSON.parse(data);
}

export function addEmojiChatState(emoji: string, creatorId: string) {
    const state = getEmojiChatState();
    state.push({
        creatorId,
        emoji,
        unixTime: Date.now()
    });
}
