import { CSSProperties, useState } from 'react';
import { triggerTrackingEvent } from './trigger-event';
import { VideoPlayButton } from './video-button';
import { Modal } from './modal';

export type VideoBoxProps = {
    videoId: string;
    title: string;
    duration: string;
    // in seconds
    startAt?: number;
};

const styles: Record<string, CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 12px 6px 12px',
        width: '300px',
        backgroundColor: '#0D0F18',
        // backgroundColor: 'red',
        cursor: 'pointer'
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
        backgroundSize: 'cover',
        backgroundPosition: 'center -25px',
        backgroundRepeat: 'no-repeat',
        display: 'block',
        userDrag: 'none',
        userSelect: 'none',
        WebkitUserDrag: 'none'
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
    },
    duration: {
        position: 'absolute',
        bottom: '0px',
        right: 0,
        fontSize: '0.875rem',
        fontWeight: 'bold',
        paddingLeft: 8,
        paddingRight: 2,
        backgroundColor: '#0D0F18'
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

export function VideoBox({ videoId, title, duration, startAt }: VideoBoxProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            style={styles.container}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
                setIsOpen(true);
                triggerTrackingEvent('open_video', 0.10);
                triggerTrackingEvent('open_video_' + videoId, 0.05, 1);
            }}
        >
            <div style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                    style={{
                        ...styles.thumbnailWrapper,
                    }}
                >
                    <div
                        style={{
                            ...styles.thumbnail,
                            backgroundImage: `url(http://img.youtube.com/vi/${videoId}/0.jpg)`
                        }}
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
                    <div style={styles.duration}>{duration}</div>
                </div>
                <div style={styles.title}>{title}</div>
            </div>

            {isOpen ? (
                <Modal
                    open={isOpen}
                    onCancel={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                    onClose={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                    onOk={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                    footer={null}
                    width={'auto'}
                    style={{
                        maxWidth: 800
                    }}
                    title={title}
                >
                    <center>
                        <iframe
                            style={{ borderRadius: '0px', width: '90vw', maxWidth: '100%' }}
                            height="515"
                            src={
                                'https://www.youtube.com/embed/' +
                                videoId +
                                '?autoplay=1&start=' +
                                (startAt ? startAt : 0)
                            }
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    </center>
                </Modal>
            ) : null}
        </div>
    );
}
