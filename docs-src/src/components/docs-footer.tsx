import type { WrapperProps } from '@docusaurus/types';
import type LayoutType from '@theme/DocItem/Layout';
import { useState } from 'react';
import { triggerTrackingEvent } from './trigger-event';
import { lastOfArray } from '../../../plugins/core';

type Props = WrapperProps<typeof LayoutType>;

/**
 * The children of the doc item layout are the compiled MDX content component.
 * Docusaurus attaches the metadata of the page to that component.
 */
type MDXContentComponent = {
    frontMatter: {
        title?: string;
    };
    contentTitle?: string;
    metadata: {
        slug: string;
    };
};

export function DocsFooter(props: Props) {
    const [voted, setVoted] = useState(false);
    const styles = {
        ul: {
            marginTop: 25,
            listStyleType: 'none'
        },
        li: {
            lineHeight: 4,
            color: 'var(--expo-theme-text-secondary)',
        },
        a: {
            color: 'var(--fontColor-offwhite)'
        },
        img: {
            paddingRight: 16,
            height: 18,
            verticalAlign: 'middle'
        },
        vote: {
            borderRadius: 3,
            borderColor: 'var(--fontColor-offwhite)',
            borderStyle: 'solid',
            borderWidth: 1,
            verticalAlign: 'middle',
            padding: 5,
            paddingLeft: 8,
            paddingRight: 8,
            textAlign: 'center',
            justifyContent: 'center',
            display: 'inline-flex',
            marginLeft: 20,
            cursor: 'pointer'
        },
        down: {
            transform: 'scale(1, -1)'
        },
        heart: {
            color: 'var(--color-top)',
            display: 'inline-block',
            transform: 'scale(2)',
            paddingLeft: 10
        }
    } as const;


    const content = (props.children as any).type as MDXContentComponent;

    let showTitle: string = content.frontMatter.title ? content.frontMatter.title : '';
    if (content.contentTitle && content.contentTitle.length < showTitle.length) {
        showTitle = content.contentTitle;
    }
    const maxTitleLength = 23;
    if (showTitle.length > maxTitleLength) {
        showTitle = showTitle.slice(0, maxTitleLength);
        const words = showTitle.split(' ');
        words.pop();
        showTitle = words.join(' ') + '...';
    }

    function vote(dir: 'up' | 'down') {
        const slug = content.metadata.slug;
        const name = lastOfArray(slug.split('/'));
        const voteEventId = 'vote_' + name + '_' + dir;
        console.log('vote: ' + voteEventId);
        triggerTrackingEvent(voteEventId, 0.1, 1);
        setVoted(true);
    }

    return <ul style={styles.ul}>
        {!voted ?
            <li style={styles.li}>
                Was this page helpful?
                <div style={styles.vote}>
                    <img src="/img/thumbs-up-white.svg" alt="Thumbs up" loading="lazy" width="14" height="14" onClick={() => vote('up')} />
                </div>
                <div style={{ ...styles.vote, ...styles.down }}>
                    <img src="/img/thumbs-up-white.svg" alt="Thumbs down" loading="lazy" width="14" height="14" onClick={() => vote('down')} />
                </div>
            </li> : <li style={styles.li}>Thank you for your vote! <div style={styles.heart}>&#x2665;</div></li>
        }
        <li>
            <a href="/chat/" target="_blank" style={styles.a}>
                <img src="/img/community-links/discord-logo.svg" alt="Discord" width="22" height="18" style={styles.img} loading="lazy" />
                Ask a question on the forums about {showTitle}
            </a>
        </li>
    </ul>;
}
