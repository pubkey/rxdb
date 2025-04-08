import { MutableRefObject } from 'react';
import { SemPage, getAppName } from '../pages';

export function OfflineSection(props: {
    dark: boolean;
    sem?: SemPage;
    offlineRef: MutableRefObject<HTMLDivElement>;
}) {
    return <div className={'block offline-first ' + (props.dark ? 'dark' : '')} id="offline" ref={props.offlineRef}>
        <div className="offline-image-wrapper">
            <img
                src={props.dark ? '/files/icons/wifi/wifi_1a202c.svg' : '/files/icons/wifi/wifi_171923.svg'}
                className="offline-image beating-second"
                loading="lazy"
                alt="offline"
            />
        </div>
        <div className="content">
            <h2>
                Online <b className="underline">is Optional</b>
            </h2>
            <div className="full-width">
                <div className="half left">
                    <p>
                        RxDB adopts an <a href="/offline-first.html" target="_blank">offline-first</a> approach, keeping your app fully functional even without a connection.
                        Data is stored locally on the {getAppName(props)} client and seamlessly <b>replicated in the background</b>, and you can even skip the backend entirely if you choose.
                    </p>
                </div>
                <div className="half right">
                    <ul className="checked">
                        <li>
                            Keep your {getAppName(props)} app running <b>offline</b>
                        </li>
                        <li>
                            Run local queries with <a href="https://rxdb.info/articles/zero-latency-local-first.html" target="_blank"><b>zero latency</b></a>
                        </li>
                        <li>
                            Simplify and <b>speed up development</b>
                        </li>
                        <li>
                            Reduces backend load and <b>scales better</b>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>;
}
