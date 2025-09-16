import { CSSProperties, ReactNode, MouseEventHandler } from "react";

type ButtonProps = {
  children: ReactNode;
  primary?: boolean;
  icon?: React.ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement | HTMLAnchorElement>;
  style?: CSSProperties;
  className?: string;
  href?: string; // ✅ new prop
};

const styles: Record<string, CSSProperties> = {
  base: {
    display: "inline-flex",
    height: "45px",
    padding: "6px 25px",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",

    fontSize: "1rem",
    fontWeight: 700,
    borderRadius: "2px",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s ease-in-out",
    lineHeight: 'initial',
    userSelect: "none",
    boxSizing: "border-box",
    textDecoration: "none", // ensures <a> looks like button
  },
  primary: {
    background: "linear-gradient(90deg, #ED168F 0%, #B2218B 100%)",
    color: "#fff",
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
  const commonProps = {
    className,
    style: {
      ...styles.base,
      ...(primary ? styles.primary : styles.secondary),
      ...style,
    },
  };

  if (href) {
    // ✅ Render as <a>
    return (
      <a href={href} onClick={onClick} {...commonProps}>
        {icon && <span style={styles.iconWrapper}>{icon}</span>}
        {children}
      </a>
    );
  }

  // ✅ Default: render as <div>
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.(e as any); // simulate click with keyboard
        }
      }}
      {...commonProps}
    >
      {icon && <span style={styles.iconWrapper}>{icon}</span>}
      {children}
    </div>
  );
}
