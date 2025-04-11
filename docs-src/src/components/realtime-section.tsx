import { MutableRefObject } from 'react';
import { SemPage } from '../pages';
import { DevicesSync } from './devices-sync';
import { ObserveCodeExample } from './observe-code-example';

export function RealtimeSection(props: {
    dark: boolean;
    sem?: SemPage;
    order?: number;
    realtimeRef: MutableRefObject<HTMLDivElement>;
}) {
    return <div className={'block second ' + (props.dark ? 'dark' : '')} id="realtime" ref={props.realtimeRef} style={{ order: props.order }}>
        <div className="content">
            <h2>
                Realtime Applications <b className="underline">made easy</b>
            </h2>
            <p>
                In RxDB, everything is observable. <b>Query Results</b>, <b>Documents</b>, <b>Document Fields</b>, <b>Events</b>.
            </p>
            <ul className="checked">
                <li>Whenever data changes, the UI updates.</li>
                <li>Realtime events across components, browser tabs and user devices</li>
                {
                    props.sem && props.sem.appName ?
                        <li>Supports {props.sem.appName} and all major frameworks:</li> :
                        ''
                }
            </ul>
            <div className="inner">
                {/*
  Use https://www.programiz.com/html/online-compiler/
  to craft html from code. (inspect the element)
*/}
                <div className="code half">
                    <ObserveCodeExample sem={props.sem} dark={props.dark} />
                </div>
                <div className="canvas half">
                    <DevicesSync sem={props.sem} />
                </div>
            </div>
        </div>
    </div>;
}
