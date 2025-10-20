import { useEffect, useState } from 'react';
import { IconAttachment } from './icons/attachment';
import { IconCompression } from './icons/compression';
import { IconEncryption } from './icons/encryption';
import { IconReplication } from './icons/replication';
import { IconServer } from './icons/server';
import { Tag } from './tag';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { SemPage } from '../pages';

const tags: {
    value: string;
    url: string;
    img?: string | React.ReactNode;
}[] = [
        { value: 'Logging', url: '/logger.html' },
        { value: 'Replication', url: '/replication.html', img: <IconReplication /> },
        { value: 'ORM', url: '/orm.html' },
        { value: 'Conflict Handling', url: '/transactions-conflicts-revisions.html' },
        { value: 'Backup', url: '/backup.html' },
        { value: 'Encryption', url: '/encryption.html', img: <IconEncryption /> },
        { value: 'Middleware', url: '/middleware.html' },
        { value: 'Server', url: '/rx-server.html', img: <IconServer /> },
        { value: 'Compression', url: '/key-compression.html', img: <IconCompression /> },
        { value: 'Signals', url: '/reactivity.html' },
        { value: 'Storages', url: '/rx-storage.html' },
        { value: 'Local Documents', url: '/rx-local-document.html' },
        { value: 'Schema Validation', url: '/schema-validation.html' },
        { value: 'Attachments', url: '/rx-attachment.html', img: <IconAttachment /> },
        { value: 'State', url: '/rx-state.html' },
        { value: 'Migration', url: '/migration-schema.html' },
        { value: 'CRDT', url: '/crdt.html' },
        { value: 'Population', url: '/population.html' },
    ];

export function FeaturesSection(props: {
    dark: boolean;
    sem?: SemPage;
}) {
    const [isMobile, setIsMobile] = useState(() => ExecutionEnvironment.canUseDOM ? window.innerWidth < 900 : false);
    const [showMore, setShowMore] = useState(false);

    useEffect(() => {
        if (!ExecutionEnvironment.canUseDOM) return;
        const handleResize = () => {
            const mobile = window.innerWidth < 900;
            setIsMobile(mobile);

            // Reset "show more" state when switching between desktop <-> mobile
            if (!mobile) {
                setShowMore(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    let visibleTags = tags;

    if (isMobile) {
        if (showMore) {
            visibleTags = tags;
        } else {
            visibleTags = tags.filter(tag => tag.img);
        }
    }

    return (
        <div className={'block features trophy-before' + (props.dark ? ' dark ' : '')}>
            <div className="content">
                <h2 style={{ textAlign: 'center' }}>
                    All the <b>Features</b> You'll Ever Need
                </h2>
                <div
                    style={{
                        marginTop: 35,
                        marginBottom: 0,
                        maxWidth: '90%',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        padding: 10,
                        textAlign: 'center',
                    }}
                >
                    {visibleTags.map((tag, i) => {
                        const el = (
                            <a key={i} href={tag.url} target="_blank" style={{ color: 'white' }}>
                                <Tag img={tag.img} wideMode={true} dark={props.dark}>{tag.value}</Tag>
                            </a>
                        );
                        return el;
                    })}

                    {/* "Show more" only on mobile when collapsed */}
                    {isMobile && !showMore && (
                        <span onClick={() => setShowMore(true)} style={{ cursor: 'pointer' }}>
                            <Tag border={true}>Show more</Tag>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
