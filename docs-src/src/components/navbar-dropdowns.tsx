import BrowserIcon from '@site/static/files/icons/browser.svg';
import MobileIcon from '@site/static/files/icons/mobile.svg';
import DesktopIcon from '@site/static/files/icons/desktop.svg';
import ServerIcon from '@site/static/files/icons/server.svg';
import { replicationLinks } from './sync-section';
import { useState } from 'react';


export function NavbarDropdownSyncList() {
    return <div className="dropdown-content-sync-integrations">
        {replicationLinks.map((item) => (
            <SyncTag img={item.iconUrl} href={item.url} key={item.label}>{item.label}</SyncTag>
        ))}
        <div className='clear'></div>
    </div>;
}

export function NavbarDropdown(props: { which: 'sync' | 'storages'; }) {
    switch (props.which) {
        case 'sync':
            return <div className="dropdown-content dropdown-content-sync" >
                <a
                    className="dropdown-content-sync-title"
                    href="/replication.html"
                >
                    <div className="dropdown-content-sync-card">
                        <span
                            className="dropdown-content-sync-title underline-link"
                        >
                            RxDB's realtime Sync Engine for Local-First Apps
                        </span>

                        <p className="dropdown-content-sync-subtitle">
                            The RxDB Sync Engine provides the ability to sync the database state in
                            realtime between the clients and the server. The backend server does not
                            have to be ...
                        </p>
                    </div>
                </a>
                <NavbarDropdownSyncList />
            </div>;
        case 'storages':
            return <div className="dropdown-content dropdown-content-storages">
                {
                    [
                        {
                            title: 'Browser',
                            sub: 'All browsers',
                            icon: <BrowserIcon style={{ height: 26 }} />,
                            links: [
                                {
                                    href: '/rx-storage-indexeddb.html',
                                    text: 'IndexedDB'
                                },
                                {
                                    href: '/rx-storage-localstorage.html',
                                    text: 'LocalStorage'
                                },
                                {
                                    href: '/rx-storage-opfs.html',
                                    text: 'OPFS'
                                },
                                {
                                    href: '/rx-storage-dexie.html',
                                    text: 'Dexie.js'
                                },
                                {
                                    href: '/rx-storage-memory.html',
                                    text: 'Memory'
                                },
                            ]
                        },
                        {
                            title: 'Mobile',
                            sub: 'React Native, Capacitor',
                            icon: <MobileIcon style={{ height: 26 }} />,
                            links: [
                                {
                                    href: '/rx-storage-sqlite.html',
                                    text: 'SQLite'
                                },
                                {
                                    href: '/rx-storage-memory.html',
                                    text: 'Memory'
                                },
                                {
                                    href: '/rx-storage-indexeddb.html',
                                    text: 'IndexedDB'
                                },
                                {
                                    href: '/rx-storage-opfs.html',
                                    text: 'OPFS'
                                },
                            ]
                        },
                        {
                            title: 'Desktop',
                            sub: 'Electron, Tauri',
                            icon: <DesktopIcon style={{ height: 26 }} />,
                            links: [
                                {
                                    href: '/rx-storage-sqlite.html',
                                    text: 'SQLite'
                                },
                                {
                                    href: '/rx-storage-filesystem-node.html',
                                    text: 'Fileystem Node'
                                },
                                {
                                    href: '/rx-storage-memory.html',
                                    text: 'Memory'
                                }
                            ]
                        },
                        {
                            title: 'Server',
                            sub: 'Node.js, Bun, Deno',
                            icon: <ServerIcon style={{ height: 26 }} />,
                            links: [
                                {
                                    href: '/rx-storage-sqlite.html',
                                    text: 'SQLite'
                                },
                                {
                                    href: '/rx-storage-filesystem-node.html',
                                    text: 'Fileystem Node'
                                },
                                {
                                    href: '/rx-storage-mongodb.html',
                                    text: 'MongoDB'
                                },
                                {
                                    href: '/rx-storage-denokv.html',
                                    text: 'DenoKV'
                                }, {
                                    href: '/rx-storage-foundationdb.html',
                                    text: 'FoundationDB'
                                },
                                {
                                    href: '/rx-storage-memory.html',
                                    text: 'Memory'
                                },
                            ]
                        },
                    ].map(({ icon, title, sub, links }) => {
                        return <div key={title}>
                            <div className="dropdown-grid-top">
                                <div style={{
                                    height: 53,
                                    float: 'left',
                                    display: 'grid',
                                    placeItems: 'center',
                                    paddingRight: 10,
                                    paddingLeft: 1
                                }}>
                                    {icon}
                                </div>
                                <div style={{
                                    float: 'right'
                                }}>
                                    <span className='dropdown-grid-top-title'>{title}</span><br />
                                    <span className='dropdown-grid-top-sub'>{sub}</span>
                                </div>
                                <div className='clear'></div>
                            </div>
                            <ul className="dropdown-grid-top-links">
                                {links.map(({ href, text }) => {
                                    return <li key={text}>
                                        <a
                                            href={href}
                                            className='navbar__link'
                                        >{text}</a>
                                    </li>;
                                })}
                            </ul>
                        </div>;
                    })
                }
            </div >;
        default:
            throw new Error('no which ' + props.which);
    }
}


export function SyncTag(props: {
    img?: string;
    border?: boolean;
    children?: React.ReactNode;
    href: string;
}) {
    const hasImg = !!props.img;
    const [hovered, setHovered] = useState(false);

    return (
        <a
            href={props.href}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'bottom',
                height: props.border ? 37 : 41,
                paddingTop: 0,
                paddingBottom: 0,
                textAlign: 'center',
                color: 'white',
                fontWeight: hasImg ? 800 : 500,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'all 0.2s ease-in-out',
                lineHeight: '100%',
                textDecoration: 'none'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <img
                draggable={false}
                src={props.img}
                loading="lazy"
                alt=""
                className={'margin-right-6-8'}
                style={{
                    height: '60%',
                    width: 24,
                    marginRight: 6,
                    display: 'block',
                    objectFit: 'contain',
                    filter: !hovered ? 'grayscale(100%) brightness(1.8)' : undefined,
                    transition: 'filter 0.1s ease-in-out',
                }}
            />

            <div style={{
                display: 'flex',
                marginLeft: 1,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: 'none !important'
            }}>{props.children}</div>
        </a>
    );
}
