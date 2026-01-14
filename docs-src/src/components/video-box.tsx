import { CSSProperties, useEffect, useRef, useState } from 'react';
import { triggerTrackingEvent } from './trigger-event';
import { VideoPlayButton } from './video-button';
import { Modal } from './modal';

export type VideoBoxProps = {
    dark: boolean;
    videoId: string;
    title: string;
    duration: string;
    // in seconds
    startAt?: number;
};

type VideoModalProps = {
    open: boolean;
    videoId: string;
    title: string;
    startAt?: number;
    onClose: (e: React.MouseEvent) => void;
};


const styles: Record<string, CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 12px 6px 12px',
        width: '275px',
        cursor: 'pointer',
        boxSizing: 'content-box',
    },
    thumbnailWrapper: {
        position: 'relative',
        width: '100%',
        height: '155px',
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        display: 'block',
        userDrag: 'none',
        userSelect: 'none',
        WebkitUserDrag: 'none',
    } as any,
    playButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: '#ED168F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translate(-50%, -50%)',
    },
    duration: {
        position: 'absolute',
        bottom: '0px',
        right: 0,
        fontSize: '0.875rem',
        fontWeight: 'bold',
        paddingLeft: 8,
        paddingRight: 2,
    },
    title: {
        marginTop: 5,
        fontSize: 16,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};

export function VideoBox({ videoId, title, duration, startAt, dark }: VideoBoxProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            style={{
                ...styles.container,
                backgroundColor: dark ? 'var(--bg-color)' : 'var(--bg-color-dark)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                setIsOpen(true);
            }}
        >
            <div style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ ...styles.thumbnailWrapper }}>
                    <img
                        src={`https://i3.ytimg.com/vi/${videoId}/mqdefault.jpg`}
                        alt={title}
                        style={styles.thumbnail}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        fetchPriority="low"
                    />
                    <div
                        style={{
                            ...styles.playButton,
                            transform: `translate(-50%, -50%) scale(${isHovered ? 1.2 : 1})`,
                            transition: 'transform 0.1s ease-in-out',
                        }}
                    >
                        <VideoPlayButton />
                    </div>
                    <div
                        style={{
                            ...styles.duration,
                            backgroundColor: dark ? 'var(--bg-color)' : 'var(--bg-color-dark)',
                        }}
                    >
                        {duration}
                    </div>
                </div>
                <div style={styles.title}>{title}</div>
            </div>

            {isOpen ? (
                <VideoModal
                    open={isOpen}
                    videoId={videoId}
                    title={title}
                    startAt={startAt}
                    onClose={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                />
            ) : null}
        </div>
    );
}



export function VideoModal({ open, videoId, title, startAt, onClose }: VideoModalProps) {
    const watchTimeoutRef = useRef<number | null>(null);
    const openedTrackedRef = useRef(false);
    const watchSeconds = 20;

    // Track "open_video" once per open session + start the 20s timer
    useEffect(() => {
        if (!open) {
            // reset per-session state when closed
            openedTrackedRef.current = false;

            if (watchTimeoutRef.current !== null) {
                clearTimeout(watchTimeoutRef.current);
                watchTimeoutRef.current = null;
            }
            return;
        }

        // modal just opened (or is open)
        if (!openedTrackedRef.current) {
            openedTrackedRef.current = true;
            triggerTrackingEvent('open_video', 0.10);
            triggerTrackingEvent('open_video_' + videoId, 0.05, 1);
        }

        watchTimeoutRef.current = window.setTimeout(() => {
            triggerTrackingEvent('watch_video_x_secs', 1, 3, true);
            triggerTrackingEvent('watch_video_' + watchSeconds + '_secs', 1, 0);
            triggerTrackingEvent('watch_video_' + videoId + '_' + watchSeconds + '_secs', 1, 0);
        }, watchSeconds * 1000);

        return () => {
            if (watchTimeoutRef.current !== null) {
                clearTimeout(watchTimeoutRef.current);
                watchTimeoutRef.current = null;
            }
        };
    }, [open, videoId]);

    if (!open) return null;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onClose={onClose}
            onOk={onClose}
            footer={null}
            width="auto"
            style={{ maxWidth: '90%' }}
            title={title}
        >
            <center>
                <iframe
                    style={{
                        width: '100%',
                        maxWidth: '90vw',
                        maxHeight: '80vh',
                        aspectRatio: '16 / 9',
                        height: 'auto',
                        borderRadius: '0px',
                    }}
                    src={
                        'https://www.youtube.com/embed/' +
                        videoId +
                        '?autoplay=1&modestbranding=1&rel=0&start=' +
                        (startAt ? startAt : 0)
                    }
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                />
            </center>
        </Modal>
    );
}
