import React from 'react';

export function LinkedinBox({ url, textAlign = 'right' }: { url: string; textAlign?: 'right' | 'center'; }) {
    const isCenter = textAlign === 'center';
    return (
        <>
            <style>{`
                .linkedin-box-container {
                    overflow: hidden;
                    height: 475px;
                }
                .linkedin-box-right {
                    float: right;
                    margin: 0 0 20px 20px;
                    width: 403px;
                }
                .linkedin-box-center {
                    display: flex;
                    justify-content: center;
                    margin: 20px 0;
                }
                .linkedin-box-iframe-right {
                    transform: scale(0.8);
                    transform-origin: top left;
                }
                .linkedin-box-iframe-center {
                    transform: scale(0.8);
                    transform-origin: top center;
                }
                
                @media (max-width: 1249px) {
                    .linkedin-mobile-bottom-container {
                        display: flex;
                        flex-direction: column;
                    }
                    .linkedin-box-right {
                        float: none;
                        display: flex;
                        justify-content: center;
                        margin: 20px 0;
                        width: auto;
                        order: 99;
                    }
                    .linkedin-box-iframe-right {
                        transform-origin: top center;
                    }
                }
            `}</style>
            <div className={'linkedin-box-container ' + (isCenter ? 'linkedin-box-center' : 'linkedin-box-right')}>
                <iframe
                    className={isCenter ? 'linkedin-box-iframe-center' : 'linkedin-box-iframe-right'}
                    src={url}
                    height="593"
                    width="504"
                    frameBorder="0"
                    allowFullScreen={true}
                    title="Eingebetteter Beitrag"
                    loading="lazy"
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts"
                ></iframe>
            </div >
        </>
    );
}
