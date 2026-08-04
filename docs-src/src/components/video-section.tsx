import { SemPage } from '../pages';
import { VideoBox, VideoBoxProps } from './video-box';
import { IconArrowLeft } from './icons/arrow-left';
import { IconArrowRight } from './icons/arrow-right';
import { Slider } from './slider';



export const YOUTUBE_VIDEO_MAIN: Omit<VideoBoxProps, 'dark'> = {
    videoId: 'tj7AaDDHv2g',
    title: 'RxDB in 100 Seconds',
    duration: '01:28',
    startAt: 0,
    uploadDate: '2026-05-04',
    description: 'RxDB is a JavaScript database that runs directly inside your application to provide local-first data that works offline and syncs automatically.'
};

const YOUTUBE_VIDEOS: Omit<VideoBoxProps, 'dark'>[] = [
    YOUTUBE_VIDEO_MAIN,
    {
        videoId: 'tDWmfenF2AM',
        title: 'The Easiest Way to Store Data',
        duration: '04:28',
        startAt: 8,
        uploadDate: '2024-04-26',
        description: 'This video demonstrates how to quickly prototype a security-first, peer-to-peer messaging app using Solid JS, RxDB, and WebRTC.'
    },
    {
        videoId: 'qHWrooWyCYg',
        title: 'This solved a problem I\'ve had in Angular for years',
        duration: '03:45',
        startAt: 2,
        uploadDate: '2023-08-09',
        description: 'The creator explains how RxDB solves the problem of keeping client-side data reactive in Angular applications by making the storage itself an observable stream.'
    },
    {
        videoId: '6t6IansQ7xo',
        title: 'Say goodbye to REST APIs with RxDB',
        duration: '14:23',
        startAt: 21,
        uploadDate: '2023-12-10',
        description: 'This video provides a technical walkthrough of building a real-time collaborative to-do list application using RxDB instead of relying on a traditional REST API.'
    },
    {
        videoId: 'm3T0gMuitbI',
        title: 'Build REAL TIME Applications easily 👩‍💻',
        duration: '00:52',
        startAt: 9,
        uploadDate: '2024-09-27',
        description: 'A developer showcases an application they built using RxDB that allows users to watch and synchronize video playback in real-time with friends globally.'
    },
    // {
    //     youtubeId: 'guP1Lz6JgaY',
    //     title: 'Qué es RxDB?',
    //     duration: '10:28'
    // },
    {
        videoId: 'qRKWD1T5CD4',
        title: 'Nuxt Nation 2024: Ben Hong - Embracing Local-First Apps with Nuxt',
        duration: '34:17',
        startAt: 769,
        uploadDate: '2024-11-27',
        description: 'Ben Hong speaks at Nuxt Nation 2024 about the advantages of local-first software and demonstrates building a real-time offline-capable app using Nuxt and RxDB.'
    }
];



export function NextArrow(props) {
    const { className, style, onClick } = props;
    return (
        <div
            className={className}
            style={{
                ...style,
                display: 'block',
                right: '10px',
                zIndex: 10,
                height: 'calc(100% - 50px)',
                // top: 0,
                // backgroundColor: 'red',
                paddingLeft: 20,
                paddingRight: 40
            }}
            onClick={onClick}
        >
            <IconArrowRight style={{ marginTop: 100 }} />
        </div>
    );
}

export function PrevArrow(props) {
    const { className, style, onClick } = props;
    return (
        <div
            className={className}
            style={{
                ...style,
                display: 'block',
                left: '10px',
                zIndex: 10,
                height: 'calc(100% - 50px)',
                // top: 0,
                // backgroundColor: 'red',
                paddingLeft: 20,
                paddingRight: 40
            }}
            onClick={onClick}
        >
            <IconArrowLeft style={{ marginTop: 100 }} />
        </div>
    );
}

export function VideoSection(props: {
    dark: boolean;
    sem?: SemPage;
}) {
    return <div className={'block reviews trophy-before trophy-after ' + (props.dark ? ' dark ' : '')} id="videos">
        <div className="content centered" style={{
            marginBottom: 50
        }}>
            <h2>
                Trusted by <b>Developers</b>
            </h2>
            <div className="inner" style={{

            }}>
                <Slider
                    items={
                        YOUTUBE_VIDEOS.map(item => (
                            <div key={item.videoId} style={{
                                float: 'left',
                            }}>
                                <VideoBox dark={props.dark} {...item} />
                            </div>
                        ))
                    }
                ></Slider>
            </div>
        </div>
    </div>;

}




