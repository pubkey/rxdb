import React, {
    CSSProperties,
    ReactNode,
    MouseEventHandler,
    useState,
  } from "react";
  
  type EmojiMessageBoxProps = {
    /** Emoji to display (string or custom React node). */
    emoji: string | ReactNode;
    /** Direction of the message: "left", "right", or "button". */
    direction: "left" | "right" | "button";
    /** Optional click handler (used when direction = "button"). */
    onClick?: MouseEventHandler<HTMLDivElement>;
  };
  
  export function EmojiMessageBox({
    emoji,
    direction,
    onClick,
  }: EmojiMessageBoxProps) {
    const [isClicked, setIsClicked] = useState(false);
  
    const wrapper: CSSProperties = {
      display: "flex",
      justifyContent:
        direction === "right"
          ? "flex-end"
          : direction === "left"
          ? "flex-start"
          : "center",
      width: "100%",
    };
  
    const base: CSSProperties = {
      display: "flex",
      width: "48px",
      height: "48px",
      padding: "10px",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      userSelect: "none",
      boxShadow:
        "0 1px 2px 0 rgba(0, 0, 0, 0.30), 0 2px 6px 2px rgba(0, 0, 0, 0.15)",
      transition: "transform 100ms ease", // smooth animation
    };
  
    let container: CSSProperties;
    if (direction === "left") {
      container = {
        ...base,
        borderRadius: "0 24px 24px 24px",
        background: "var(--40-grey, #666)",
        cursor: "default",
      };
    } else if (direction === "right") {
      container = {
        ...base,
        borderRadius: "24px 0 24px 24px",
        background: "var(--40-grey, #666)",
        cursor: "default",
      };
    } else {
      // button style
      container = {
        ...base,
        borderRadius: "24px",
        background: "var(--Section-Dark, #0D0F18)",
        cursor: "pointer",
        transform: isClicked ? "scale(1.2)" : "scale(1)", // grow briefly
      };
    }
  
    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
      if (direction === "button") {
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 100);
      }
      onClick?.(e);
    }
  
    return (
      <div style={wrapper}>
        <div style={container} onClick={handleClick}>
          {emoji}
        </div>
      </div>
    );
  }
  