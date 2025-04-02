import { MutableRefObject } from 'react';
import { SemPage, getAppName } from '../pages';

import React from 'react';
import { ReplicationDiagram } from './replication-diagram';


export function SyncSection(props: {
  sem?: SemPage;
  replicationRef: MutableRefObject<HTMLDivElement>
}) {
  return <div className="block replication" id="replication" ref={props.replicationRef}>
    <div className="content">
      <div className="half left">
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <h2>
          Sync with <b className="underline">any Backend</b>
        </h2>
        <p>
          RxDB's high-performance <a href="/replication.html" target="_blank">Sync Engine</a> powers real-time synchronization between {getAppName(props)} clients and servers.
          While specialized plugins exist for <a href="/replication-graphql.html" target="_blank">GraphQL</a>
          , <a href="/replication-couchdb.html" target="_blank">CouchDB</a>, <a href="/replication-webrtc.html">P2P</a>, <a href="/replication-firestore.html" target="_blank">Firestore</a>, and <a href="/replication-nats.html" target="_blank">NATS</a>,
          it remains <b>backend-agnostic</b> — seamlessly integrating with <a href="/replication-http.html" target="_blank">any infrastructure over HTTP</a> for unmatched flexibility and speed.

        </p>
      </div>
      <div className="half right">
        <ReplicationDiagram></ReplicationDiagram>

        {/* <div className="replication-icons">
          <img
            src="/files/logo/logo.svg"
            alt="RxDB"
            className="replicate-logo tilt-to-mouse"
            loading="lazy"
          />
          <a href="/replication-graphql.html" target="_blank">
            <div className="neumorphism-circle-xl centered replicate-graphql enlarge-on-mouse">
              <img
                src="/files/icons/graphql-text.svg"
                alt="GraphQL"
                className="protocol"
                loading="lazy"
              />
            </div>
          </a>
          <a href="/replication-firestore.html" target="_blank">
            <div className="neumorphism-circle-s centered replicate-firestore enlarge-on-mouse">
              <img
                src="/files/icons/firebase.svg"
                alt="Firebase"
                className="protocol"
                loading="lazy"
              />
            </div>
          </a>
          <a href="https://github.com/pubkey/rxdb/tree/master/examples/supabase" target="_blank">
            <div className="neumorphism-circle-s centered replicate-supabase enlarge-on-mouse">
              <img
                src="/files/icons/supabase.svg"
                alt="supabase"
                className="protocol"
                loading="lazy"
              />
            </div>
          </a>
          <a href="/replication-couchdb.html" target="_blank">
            <div className="neumorphism-circle-xl centered replicate-couchdb enlarge-on-mouse">
              <img
                src="/files/icons/couchdb-text.svg"
                alt="CouchDB"
                className="protocol"
                loading="lazy"
              />
            </div>
          </a>
          <a href="/replication-http.html" target="_blank">
            <div className="neumorphism-circle-xs centered replicate-rest enlarge-on-mouse">
              {'{'} HTTP {'}'}
            </div>
          </a>
          <a href="/replication-websocket.html" target="_blank">
            <div className="neumorphism-circle-xs centered replicate-websocket enlarge-on-mouse">
              WebSocket
            </div>
          </a>
          <a href="/replication-webrtc.html" target="_blank">
            <div className="neumorphism-circle-xs centered replicate-webrtc enlarge-on-mouse">
              WebRTC
            </div>
          </a>
        </div> */}
      </div>
      <div className="clear" />
    </div>
  </div>;
}
