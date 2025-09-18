import { useEffect, useState } from 'react';
import { IconAttachment } from './icons/attachment';
import { IconCompression } from './icons/compression';
import { IconEncryption } from './icons/encryption';
import { IconReplication } from './icons/replication';
import { IconServer } from './icons/server';
import { Tag } from './tag';

const tags: {
    value: string;
    url: string;
    img?: string | React.ReactNode;
    break?: boolean;
}[] = [
        { value: 'Logging', url: '/logger.html' },
        { value: 'Attachments', url: '/rx-attachment.html', img: <IconAttachment /> },
        { value: 'ORM', url: '/orm.html' },
        { value: 'Conflict Handling', url: '/transactions-conflicts-revisions.html', break: true },
        { value: 'Middleware', url: '/middleware.html' },
        { value: 'Signals', url: '/reactivity.html' },
        { value: 'Server', url: '/rx-server.html', img: <IconServer /> },
        { value: 'Backup', url: '/backup.html', break: true },
        { value: 'Storages', url: '/rx-storage.html' },
        { value: 'Replication', url: '/replication.html', img: <IconReplication /> },
        { value: 'Local Documents', url: '/rx-local-document.html' },
        { value: 'Schema Validation', url: '/schema-validation.html' },
        { value: 'State', url: '/rx-state.html', break: true },
        { value: 'Migration', url: '/migration-schema.html' },
        { value: 'CRDT', url: '/crdt.html' },
        { value: 'Compression', url: '/key-compression.html', img: <IconCompression /> },
        { value: 'Population', url: '/population.html' },
        { value: 'Encryption', url: '/encryption.html', img: <IconEncryption /> },
    ];

export function FeaturesSection() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
    const [showMore, setShowMore] = useState(false);

    useEffect(() => {
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
            visibleTags = tags; // show everything
        } else {
            visibleTags = tags.filter(tag => tag.img); // only icon tags
        }
    }

    return (
        <div className="block features dark trophy-before">
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
                                <Tag img={tag.img}>{tag.value}</Tag>
                            </a>
                        );

                        if (tag.break) {
                            return (
                                <span key={i}>
                                    {el}
                                    <div className="clear"></div>
                                </span>
                            );
                        } else {
                            return el;
                        }
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
