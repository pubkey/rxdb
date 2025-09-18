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
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="25" viewBox="0 0 15 25" fill="none">
                <path d="M10 10V5H5V0H0V5V20V25H5V20H10V15H15V10H10Z" fill="white" />
            </svg>
        </div>
    );
}
