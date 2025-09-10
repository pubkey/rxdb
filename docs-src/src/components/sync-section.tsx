import { MutableRefObject } from 'react';
import { SemPage, getAppName } from '../pages';

import React from 'react';
import { ReplicationDiagram } from './replication-diagram';
import { Tag } from './tag';


export function SyncSection(props: {
  dark: boolean;
  sem?: SemPage;
  order?: number;
  replicationRef: MutableRefObject<HTMLDivElement>;
}) {
  return <div className={'block replication ' + (props.dark ? 'dark' : '')} id="replication" ref={props.replicationRef} style={{ order: props.order }}>
    <div className="content">
      <h2>
        Sync with <b>any Backend</b>
      </h2>

      <div className="inner">

        <div className="half left">
          <p>
            RxDB's simple and high-performance <a href="/replication.html" target="_blank">Sync Engine</a> powers real-time synchronization between {getAppName(props)} clients and servers.
            Either use one of our prebuild replication plugins...
          </p>
          <p>
            <a href="/replication-server.html" target="_blank">
              <Tag img="/files/logo/logo.svg">RxServer</Tag>
            </a>

            <a href="/replication-graphql.html" target="_blank">
              <Tag img="/files/icons/graphql.svg">GraphQL</Tag>
            </a>

            <a href="/replication-firestore.html" target="_blank">
              <Tag img="/files/icons/firebase.svg" >Firebase</Tag>
            </a>

            <a href="/replication-supabase.html" target="_blank">
              <Tag img="/files/icons/supabase.svg" >Supabase</Tag>
            </a>

            <a href="/replication-nats.html" target="_blank">
              <Tag img="/files/icons/nats.svg" >NATS</Tag>
            </a>

            <a href="/replication-http.html" target="_blank">
              <Tag img="/files/icons/http.svg" >HTTP</Tag>
            </a>

            <a href="/replication-couchdb.html" target="_blank">
              <Tag img="/files/icons/couchdb.svg" >CouchDB</Tag>
            </a>

            <a href="/replication-webrtc.html" target="_blank">
              <Tag img="/files/icons/webrtc.svg" >WebRTC (P2P)</Tag>
            </a>

            <a href="/replication-appwrite.html" target="_blank">
              <Tag img="/files/icons/appwrite-small.svg">appwrite</Tag>
            </a>

          </p>
          <p style={{
            fontSize: '30px',
            fontWeight: 800
          }}>OR</p>
          <p>...sync with your <b>custom server</b> by implementing <a href="/replication-http.html" target="_blank">three simple endpoints</a>.</p>
        </div>
        <div className="half right">
          <ReplicationDiagram></ReplicationDiagram>
        </div>
      </div>
    </div>
  </div>;
}
