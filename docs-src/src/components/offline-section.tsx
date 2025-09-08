import { MutableRefObject } from 'react';
import { SemPage, getAppName } from '../pages';
import { CheckedList } from './checked-list';

export function OfflineSection(props: {
    dark: boolean;
    sem?: SemPage;
    order?: number;
    offlineRef: MutableRefObject<HTMLDivElement>;
}) {
    return <div className={'block offline-first ' + (props.dark ? 'dark' : '')} id="offline" ref={props.offlineRef} style={{ order: props.order }}>
        <div className="content">
            <h2>
                Online <b>is Optional</b>
            </h2>
            <div className="full-width">
                <div className="half left">
                    <p>
                        RxDB adopts an <a href="/offline-first.html" target="_blank">offline-first</a> approach, keeping your app fully functional even without a connection.
                        Data is stored locally on the {getAppName(props)} client and seamlessly <b>replicated in the background</b>, and you can even skip the backend entirely if you choose.
                    </p>

                    <CheckedList>
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
                    </CheckedList>

                </div>
                <div className="half right">

                </div>
            </div>
        </div>
    </div>;
}
