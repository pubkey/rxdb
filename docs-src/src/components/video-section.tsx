import { SemPage } from '../pages';
import Slider from 'react-slick';
import { VideoBox, VideoBoxProps } from './video-box';
import { IconArrowLeft } from './icons/arrow-left';
import { IconArrowRight } from './icons/arrow-right';


const YOUTUBE_VIDEOS: VideoBoxProps[] = [
    {
        videoId: 'tDWmfenF2AM',
        title: 'The Easiest Way to Store Data',
        duration: '4:28',
        startAt: 8

    },
    {
        videoId: 'qHWrooWyCYg',
        title: 'This solved a problem I\'ve had in Angular for years',
        duration: '3:45',
        startAt: 2
    },
    {
        videoId: '6t6IansQ7xo',
        title: 'Say goodbye to REST APIs with RxDB',
        duration: '14:23',
        startAt: 21
    },
    {
        videoId: 'm3T0gMuitbI',
        title: 'Build REAL TIME Applications easily 👩‍💻',
        duration: '0:52',
        startAt: 9
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
        startAt: 769
    }
];



function NextArrow(props) {
    const { className, style, onClick } = props;
    return (
        <div
            className={className}
            style={{
                ...style,
                display: "block",
                right: "10px",
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

function PrevArrow(props) {
    const { className, style, onClick } = props;
    return (
        <div
            className={className}
            style={{
                ...style,
                display: "block",
                left: "10px",
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

const padding = 50;
const sliderSettings = {
    dots: false,
    centerMode: true,
    centerPadding: '80px',
    infinite: true,
    arrows: true,
    adaptiveHeight: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    initialSlide: 0,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
};
export function VideoSection(_props: {
    sem?: SemPage;
}) {
    return <div className="block reviews" id="videos" style={{ paddingTop: padding, paddingBottom: 0 }}>
        <div className="content centered">
            <div className="inner" style={{marginBottom: '74px'}}>
                <h2>
                    Trusted by <b>Developers</b>
                </h2>
                <Slider {...sliderSettings}>
                    {YOUTUBE_VIDEOS.map(item => (
                        <div key={item.videoId} style={{
                            float: 'left',
                            margin: 24
                        }}>
                            <VideoBox videoId={item.videoId} duration={item.duration} title={item.title} startAt={item.startAt} />
                        </div>
                    ))}
                </Slider>
            </div>
        </div>
    </div>;

}
