import { CSSProperties, useState } from "react";
import { triggerTrackingEvent } from './trigger-event';
import { VideoPlayButton } from './video-button';

export type VideoBoxProps = {
    videoId: string;
    title: string;
    duration: string;
    // in seconds
    startAt?: number;
};

const styles: Record<string, CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",

        padding: '12px 12px 9px 12px',
        gap: 8,

        width: "320px",
        backgroundColor: "#0D0F18",
    },
    thumbnailWrapper: {
        position: "relative",
        width: "100%",
        height: "180px",
        overflow: "hidden",
        backgroundColor: "#000",
    },
    thumbnail: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    playButton: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        backgroundColor: "#ED168F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    playIcon: {
        width: "20px",
        height: "20px",
        borderLeft: "14px solid white",
        borderTop: "8px solid transparent",
        borderBottom: "8px solid transparent",
    },
    duration: {
        position: "absolute",
        bottom: "6px",
        right: 0,
        fontSize: "0.875rem",
        fontWeight: "bold",
        paddingLeft: 8,
        paddingRight: 2,
        backgroundColor: '#0D0F18'
    },
    title: {
        marginTop: 0,
        fontSize: 16,
        fontWeight: 700,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
};

export function VideoBox({ videoId, title, duration, startAt }: VideoBoxProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={styles.container}

            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                setIsOpen(true);
                triggerTrackingEvent('open_video', 0.10);
                triggerTrackingEvent('open_video_' + videoId, 0.05, 1);
            }}
        >
            <div
                style={{ textDecoration: "none", color: "inherit" }}
            >
                <div style={styles.thumbnailWrapper}>
                    <img src={'http://img.youtube.com/vi/' + videoId + '/0.jpg'} style={styles.thumbnail} />
                    <div style={styles.playButton}>
                        <VideoPlayButton />
                    </div>
                    <div style={styles.duration}>{duration}</div>
                </div>
                <div style={styles.title}>{title}</div>
            </div>
        </div>
    );
}
