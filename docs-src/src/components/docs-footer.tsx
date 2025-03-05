import type LayoutType from '@theme/DocItem/Layout';
import { useState } from 'react';
import { triggerTrackingEvent } from './trigger-event';
import { lastOfArray } from '../../../plugins/core';

type Props = WrapperProps<typeof LayoutType>;

export function DocsFooter(props: Props) {


    const [voted, setVoted] = useState(false);

    console.log('proooooops:');
    console.dir(props);

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


    let showTitle: string = props.children.type.frontMatter.title;
    if (props.children.type.contentTitle && props.children.type.contentTitle.length < showTitle.length) {
        showTitle = props.children.type.contentTitle;
    }
    const maxTitleLength = 23;
    if (showTitle.length > maxTitleLength) {
        showTitle = showTitle.slice(0, maxTitleLength);
        const words = showTitle.split(' ');
        console.dir(words);
        words.pop();
        showTitle = words.join(' ') + '...';
    }

    function vote(dir: 'up' | 'down') {
        const slug = props.children.type.metadata.slug;
        const name = lastOfArray(slug.split('/'));
        const voteEventId = 'vote_' + name + '_' + dir;
        console.log('vote: ' + voteEventId);
        triggerTrackingEvent(voteEventId, 0.1, true);
        setVoted(true);
    }

    return <ul style={styles.ul}>
        {!voted ?
            <li style={styles.li}>
                Was this page helpful?
                <div style={styles.vote}>
                    <img src="/img/thumbs-up-white.svg" loading="lazy" height="14" onClick={() => vote('up')} />
                </div>
                <div style={{ ...styles.vote, ...styles.down }}>
                    <img src="/img/thumbs-up-white.svg" loading="lazy" height="14" onClick={() => vote('down')} />
                </div>
            </li> : <li style={styles.li}>Thank you for your vote! <div style={styles.heart}>&#x2665;</div></li>
        }
        <li>
            <a href="/chat/" target="_blank" style={styles.a}>
                <img src="/img/community-links/discord-logo.svg" style={styles.img} loading="lazy" />
                Ask a question on the forums about {showTitle}
            </a>
        </li>
    </ul>;
}
