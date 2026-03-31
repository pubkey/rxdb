import React from 'react';
import { Slider } from './slider';

export type NewsItem = {
    title: string;
    slug: string;
    description: string;
    image?: string;
};

export const NEWS_ITEMS: NewsItem[] = [
    {
        title: 'Why Local-First Software Is the Future and its Limitations',
        slug: '/articles/local-first-future.html',
        description: 'Discover how local-first transforms web apps, boosts offline resilience, and why instant user feedback is becoming the new normal.',
        image: 'https://rxdb.info/headers/local-first-future.jpg'
    },
    {
        title: 'RxDB 17.0.0 - Local-First to the Moon',
        slug: '/releases/17.0.0.html',
        description: 'RxDB 17 introduces improved reactivity APIs, better debugging, breaking storage fixes, and multiple plugins graduating from beta.',
        image: 'https://rxdb.info/headers/17.0.0.jpg'
    },
    {
        title: 'LocalStorage vs. IndexedDB vs. Cookies vs. OPFS vs. WASM-SQLite',
        slug: '/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html',
        description: 'Compare LocalStorage, IndexedDB, Cookies, OPFS, and WASM-SQLite for web storage, performance, limits, and best practices for modern web apps.',
        image: 'https://rxdb.info/headers/localstorage-indexeddb-cookies-opfs-sqlite-wasm.jpg'
    },
    {
        title: 'WebSockets vs Server-Sent-Events vs Long-Polling vs WebRTC vs WebTransport',
        slug: '/articles/websockets-sse-polling-webrtc-webtransport.html',
        description: 'Learn the unique benefits and pitfalls of each real-time tech. Make informed decisions on WebSockets, SSE, Polling, WebRTC, and WebTransport.',
        image: 'https://rxdb.info/headers/websockets-sse-polling-webrtc-webtransport.jpg'
    },
    {
        title: 'Local JavaScript Vector Database that works offline',
        slug: '/articles/javascript-vector-database.html',
        description: 'Create a blazing-fast vector database in JavaScript. Leverage RxDB and transformers.js for instant, offline semantic search - no servers required!',
        image: 'https://rxdb.info/headers/javascript-vector-database.jpg'
    }
];

export function NewsBlock() {
    return (
        <>
            <Slider items={
                NEWS_ITEMS.map((item) => (
                    <div className="slider-content" key={item.slug}>
                        <a
                            href={item.slug}
                            style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
                        >
                            {item.image && (
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    loading="lazy"
                                    style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 8, marginBottom: 15 }}
                                />
                            )}
                            <h3 style={{ fontSize: 18, marginBottom: 8, lineHeight: '1.2' }}>{item.title}</h3>
                            <p style={{
                                fontSize: 14,
                                fontStyle: 'normal',
                                fontWeight: 500,
                                lineHeight: '21px',
                                marginBottom: 0,
                                color: 'var(--text-color)'
                            }}>{item.description}</p>
                        </a>
                    </div>
                ))
            } />
        </>
    );
}
