import { CSSProperties, ReactNode, MouseEventHandler } from "react";

type ButtonProps = {
    children: ReactNode;
    primary?: boolean;
    onClick?: MouseEventHandler<HTMLDivElement>;
};

const styles: Record<string, CSSProperties> = {
    base: {
        display: "flex",
        height: "45px",
        padding: "6px 25px",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "10px",

        fontSize: "1rem",
        fontWeight: 700,
        borderRadius: "2px",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.2s ease-in-out",
        userSelect: "none",
        boxSizing: "border-box", 
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
};

export function Button({ children, primary, onClick }: ButtonProps) {
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
            style={{
                ...styles.base,
                ...(primary ? styles.primary : styles.secondary),
            }}
        >
            {children}
        </div>
    );
}
