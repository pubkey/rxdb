import {
  CSSProperties,
  ReactNode,
  MouseEventHandler,
  useState,
} from "react";

type ButtonProps = {
  children: ReactNode;
  primary?: boolean;
  icon?: React.ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement | HTMLAnchorElement>;
  style?: CSSProperties;
  className?: string;
  href?: string;
};

const styles: Record<string, CSSProperties> = {
  base: {
    display: "inline-flex",
    height: "45px",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",

    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s ease-in-out",
    lineHeight: "initial",
    userSelect: "none",
    boxSizing: "border-box",
    textDecoration: "none",
    position: "relative", // so gradient anchor works
    overflow: "hidden",
  },
  primary: {
    background: "linear-gradient(90deg, var(--color-top) 0%, var(--color-middle) 100%)",
    color: "#fff",
    fontWeight: 800,
  },
  secondary: {
    background: "transparent",
    color: "#fff",
    border: "2px solid #fff",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    transition: "filter 0.2s ease-in-out",
  },
};

export function Button({
  children,
  primary,
  icon,
  onClick,
  style,
  className,
  href,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );

  const mergedClassName = `padding-button${className ? ` ${className}` : ""}`;

  const baseStyle = {
    ...styles.base,
    ...(primary ? styles.primary : styles.secondary),
    ...style,
  };

  // Primary hover gradient following mouse
  const primaryHoverStyle =
    primary && hovered && mousePos
      ? {
        background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, var(--color-middle), var(--color-top))`,
      }
      : {};

  // Secondary hover (your existing effect)
  const secondaryHoverStyle =
    !primary && hovered
      ? {
        background: "#fff",
        color: "var(--bg-color-dark)",
      }
      : {};

  const hoverStyle = { ...primaryHoverStyle, ...secondaryHoverStyle };

  const iconStyle =
    !primary && hovered
      ? { ...styles.iconWrapper, filter: "invert(1)" }
      : styles.iconWrapper;

  const commonProps = {
    className: mergedClassName,
    style: { ...baseStyle, ...hoverStyle },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => {
      setHovered(false);
      setMousePos(null);
    },
    onMouseMove: (e: React.MouseEvent<HTMLDivElement | HTMLAnchorElement>) => {
      if (primary) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
  };

  const content = (
    <>
      {icon && <span style={iconStyle}>{icon}</span>}
      {children}
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} {...commonProps}>
        {content}
      </a>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.(e as any);
        }
      }}
      {...commonProps}
    >
      {content}
    </div>
  );
}
