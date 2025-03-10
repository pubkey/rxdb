import { SemPage } from '../pages';
import Slider from 'react-slick';
import { YouTubeVideoBox, YoutubeVideoData } from './youtube-video-box';


const YOUTUBE_VIDEOS: YoutubeVideoData[] = [
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
        duration: '0:52'
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



const padding = 50;
const sliderSettings = {
    dots: true,
    centerMode: true,
    centerPadding: '180px',
    infinite: true,
    arrows: false,
    adaptiveHeight: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    initialSlide: 0
};
export function VideoSection(_props: {
    sem?: SemPage;
}) {
    return <div className="block reviews" id="videos" style={{ paddingTop: padding, paddingBottom: 0 }}>
        <div className="content centered">
            <div className="inner">
                {/* {YOUTUBE_VIDEOS.map(item => (
                    <div key={item.videoId} style={{
                        float: 'left',
                        margin: 20
                    }}>
                        <YouTubeVideoBox videoId={item.videoId} duration={item.duration} title={item.title} />
                    </div>
                ))}
                <div className='clear'></div> */}
                <Slider {...sliderSettings}>
                    {YOUTUBE_VIDEOS.map(item => (
                        <div key={item.videoId} style={{
                            float: 'left',
                            margin: 20
                        }}>
                            <YouTubeVideoBox videoId={item.videoId} duration={item.duration} title={item.title} startAt={item.startAt} />
                        </div>
                    ))}
                </Slider>
            </div>
        </div>
    </div>;

}
