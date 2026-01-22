import { MutableRefObject, useState } from 'react';
import { SemPage, getAppName } from '../pages';
import { CheckedList } from './checked-list';
import { IconWifi } from './icons/wifi';
import { PixelToggle } from './toggle';
import { EmojiChatStateful } from './emoji-chat';
import { Cloud } from './cloud';
import { ReplicationDiagram } from './replication-diagram';

export function OfflineSection(props: {
  dark: boolean;
  sem?: SemPage;
  order?: number;
  offlineRef: MutableRefObject<HTMLDivElement>;
}) {
  const [online, setOnline] = useState(true);

  return (
    <div
      className={'block offline-first ' + (props.dark ? 'dark' : '') + ' trophy-before trophy-after'}
      id="offline"
      ref={props.offlineRef}
      style={{
        order: props.order,
      }}
    >
      <div className="content" style={{
        paddingBottom: 20
      }}>
        <h2>
          Online <b>is Optional</b>
        </h2>
        <div className="inner">
          <div className="half left">
            <p className='font-16-14 centered-mobile-p'>
              RxDB adopts the{' '}
              <a href="/articles/local-first-future.html" target="_blank">
                local-first
              </a>{' '} approach by storing data locally on the {getAppName(props)} client and managing continuous synchronization.{' '}
              You can even run your app entirely without a backend.
            </p>

            <CheckedList className='centered-mobile padding-right-20-0' style={{
              paddingLeft: 0,
              paddingBottom: 0,
              maxWidth: 360
            }}>
              <>
                Keep your {getAppName(props)} app running <b>offline</b>
              </>
              <>
                Run local queries with{' '}
                <a
                  href="https://rxdb.info/articles/zero-latency-local-first.html"
                  target="_blank"
                >
                  <b>zero latency</b>
                </a>
              </>
              <>
                Simplify and <b>speed up development</b>
              </>
              <>
                Reduces backend load and <b>scales better</b>
              </>
            </CheckedList>
          </div>

          <div
            className="half right justify-center-mobile gap-30-16"
            style={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'start',
            }}
          >
            <ReplicationDiagram dark={props.dark} hasIcon={false} demoOffline={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
