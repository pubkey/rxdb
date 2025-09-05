import { CSSProperties } from "react";

type VideoPlayButtonProps = {
    size?: number; // diameter in px
    onClick?: () => void;
};

export function VideoPlayButton({ size = 50, onClick }: VideoPlayButtonProps) {
    const styles: Record<string, CSSProperties> = {
        container: {
            width: size,
            height: size,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            userSelect: "none",

            border: "2px solid var(--White, #FFF)",
            background: "linear-gradient(90deg, #ED168F 0%, #B2218B 100%)",
        },
        icon: {
            width: 15,
            display: "block",
        },
    };
    return (
        <div style={styles.container} onClick={onClick}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 26"
                style={styles.icon}
                fill="none"
            >
                <path d="M5.5 20.5H10.5V15.5H5.5V20.5Z" fill="white" />
                <path d="M0.5 25.5H5.5V20.5H0.5V25.5Z" fill="white" />
                <path d="M10.5 15.5H15.5V10.5H10.5V15.5Z" fill="white" />
                <path d="M5.5 10.5H10.5V5.5H5.5V10.5Z" fill="white" />
                <path d="M0.5 5.5H5.5V0.5H0.5V5.5Z" fill="white" />
                <path d="M0.5 20.5H5.5V5.5H0.5V20.5Z" fill="white" />
                <path d="M5.5 15.5H10.5V10.5H5.5V15.5Z" fill="white" />
            </svg>
        </div>
    );
}
