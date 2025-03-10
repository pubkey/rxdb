import { useState } from 'react';
import { Modal } from 'antd';
import { triggerTrackingEvent } from './trigger-event';

export type YoutubeVideoData = {
  videoId: string;
  title: string;
  duration: string;
  // in seconds
  startAt?: number;
};

const PlayCircle = ({ isHovered }: { isHovered: boolean; }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="56"
    height="56"
    style={{ opacity: isHovered ? 1 : 0.7, transition: 'opacity 0.1s ease' }}
    viewBox="0 0 24 24"
    strokeWidth={isHovered ? 2.5 : 2}
  >
    <circle cx="12" cy="12" r="10" stroke="white" fill="rgba(255,20,147,0.8)" />
    <polygon points="10 8 16 12 10 16" fill="white" />
  </svg>
);

export const YouTubeVideoBox = ({ videoId, title, duration, startAt }: YoutubeVideoData) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        width: '260px',
        borderRadius: '16px',
        borderStyle: 'solid',
        borderWidth: 0,
        borderColor: 'black',
        backgroundColor: 'black',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.25)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        setIsOpen(true);
        triggerTrackingEvent('open_video', 0.10);
        triggerTrackingEvent('open_video_' + videoId, 0.05, 1);
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '146px',
          backgroundImage: `url(http://img.youtube.com/vi/${videoId}/0.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlayCircle isHovered={isHovered} />
        </div>

        <span
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            fontSize: '12px',
            padding: '4px 6px',
            borderRadius: '4px',
            zIndex: 2,
          }}
        >
          {duration}
        </span>
      </div>

      <div
        style={{
          padding: '0px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            backgroundColor: 'white',
            padding: 8,
            paddingTop: 4,
            height: 55
          }}
        >
          {title}
        </span>
      </div>
      {isOpen ?
        <Modal
          open={isOpen}
          onCancel={(e) => {
            e.stopPropagation();
            console.log('CANCEL');
            setIsOpen(false);
          }}
          onClose={(e) => {
            e.stopPropagation();
            console.log('CLOSSSSSE');
            setIsOpen(false);
          }}
          onOk={(e) => {
            e.stopPropagation();
            console.log('OKKK');
            setIsOpen(false);
          }}
          footer={null}
          width={'auto'}
          style={{
            maxWidth: 800
          }}
        >

          <br />
          <br />
          <br />
          <center>
            <iframe className="img-radius" style={{ width: '100%', borderRadius: '15px' }}
              height="515" src={'https://www.youtube.com/embed/' + videoId + '?autoplay=1&start=' + (startAt ? startAt : 0)}
              title="YouTube video player" frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
            ></iframe>
          </center>
        </Modal> : <></>}

    </div>
  );
};
