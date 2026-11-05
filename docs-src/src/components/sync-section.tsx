import { MutableRefObject } from 'react';
import { SemPage, getAppName } from '../pages';
import React from 'react';
import { ReplicationDiagram } from './replication-diagram';
import { Tag } from './tag';
import { replicationLinks } from './replication-links';


export function SyncSection(props: {
  dark: boolean;
  sem?: SemPage;
  order?: number;
  replicationRef: MutableRefObject<HTMLDivElement>;
}) {
  return (
    <div
      className={'block replication ' + (props.dark ? 'dark' : '') + ' trophy-after'}
      id="replication"
      ref={props.replicationRef}
      style={{ order: props.order }}
    >
      <div className="content">
        <h2>
          Sync with <b>any Backend</b>
        </h2>

        <div className="inner" >
          <div className="half left">
            <p className='font-16-14 centered-mobile-p'>
              RxDB's easy-to-use {' '}
              <a href="/replication.html" target="_blank">
                Sync Engine
              </a>{' '}
              powers realtime synchronization between {getAppName(props)} clients and servers.
              Either use one of our prebuild replication plugins...
            </p>

            <div className='centered-mobile-p'>
              {replicationLinks.map(link => (
                <a key={link.url} href={link.url} target="_blank">
                  <Tag img={link.iconUrl}>{link.label}</Tag>
                </a>
              ))}
            </div>

            <p
              className='font-30-20'
              style={{
                marginTop: 12,
                lineHeight: '100%',
                fontWeight: 800,
              }}
            >
              OR
            </p>
            <p className='font-16-14 centered-mobile-p'>
              ...sync with your <b>custom server</b> by implementing only{' '}
              <a href="/replication-http.html" target="_blank">
                three simple endpoints
              </a>
              .
            </p>
          </div>
          <div className="half right">
            <ReplicationDiagram dark={props.dark} />
          </div>
        </div>
      </div>
    </div>
  );
}
