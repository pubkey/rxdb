import { MutableRefObject, useState, useEffect } from 'react';
import { SemPage, getAppName } from '../pages';
import { CheckedList } from './checked-list';
import { IconWifi } from './icons/wifi';
import { PixelToggle } from './toggle';
import { EmojiChatStateful } from './emoji-chat';
import { Cloud } from './cloud';
import { replicationLinks } from './sync-section';

export function OfflineSection(props: {
  dark: boolean;
  sem?: SemPage;
  order?: number;
  offlineRef: MutableRefObject<HTMLDivElement>;
}) {
  const [online, setOnline] = useState(true);

  return (
    <div
      className={'block offline-first ' + (props.dark ? 'dark' : '')}
      id="offline"
      ref={props.offlineRef}
      style={{ order: props.order }}
    >
      <div className="content">
        <h2>
          Online <b>is Optional</b>
        </h2>
        <div className="inner">
          <div className="half left">
            <p>
              RxDB adopts an{' '}
              <a href="/offline-first.html" target="_blank">
                offline-first
              </a>{' '}
              approach, keeping your app fully functional even without a connection.
              Data is stored locally on the {getAppName(props)} client and seamlessly{' '}
              <b>replicated in the background</b>, and you can even skip the backend entirely if you
              choose.
            </p>

            <CheckedList>
              <li>
                Keep your {getAppName(props)} app running <b>offline</b>
              </li>
              <li>
                Run local queries with{' '}
                <a
                  href="https://rxdb.info/articles/zero-latency-local-first.html"
                  target="_blank"
                >
                  <b>zero latency</b>
                </a>
              </li>
              <li>
                Simplify and <b>speed up development</b>
              </li>
              <li>
                Reduces backend load and <b>scales better</b>
              </li>
            </CheckedList>
          </div>

          <div
            className="half right"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'start',
            }}
          >
            <Cloud />
            <div
              style={{
                textAlign: 'center',
                padding: 41,
              }}
            >
              <IconWifi
                style={{
                  width: '100%',
                  paddingBottom: 3,
                }}
              />
              <PixelToggle checked={online} onChange={setOnline} />
            </div>
            <EmojiChatStateful online={online} chatId="offline" />
          </div>
        </div>
      </div>
    </div>
  );
}
