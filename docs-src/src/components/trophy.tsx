import { triggerTrackingEvent } from './trigger-event';

export const SOCIAL_PROOF_VALUES = {
    // @link https://www.star-history.com/#pubkey/rxdb&Date
    github: 22590,
    // @link https://x.com/rxdbjs
    twitter: 3003,
    // @link https://discord.com/invite/tqt9ZttJfD
    discord: 1251
} as const;


type TrophyProps = {
    href: string;
    title: string;
    subTitle: string;
    valueTitle: string;
    icon: string | React.ReactNode; // can be URL or React component
    value: number;
    order?: number;
};

export function Trophy({
    href,
    title,
    subTitle,
    valueTitle,
    icon,
    value,
    order
}: TrophyProps) {
    const isIconUrl = typeof icon === 'string';

    return (
        <a
            href={href}
            onClick={() =>
                triggerTrackingEvent(title.toLowerCase() + '_trophy_click', 0.2)
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{ order }}
        >
            <div className={'trophy ' + title.toLowerCase()}>
                {isIconUrl ? (
                    <img loading="lazy" src={icon} alt={'RxDB ' + title} />
                ) : (
                    <div className="trophy-icon">{icon}</div>
                )}

                <div style={{ flex: 1 }}>
                    <div className="subtitle">{subTitle}</div>
                    <div className="title">{title}</div>
                </div>

                <div>
                    <div className="valuetitle">{valueTitle}</div>
                    <div className="value">
                        {value.toLocaleString()}
                        <div className="arrow-up">▲</div>
                    </div>
                </div>
            </div>
        </a>
    );
}

export function PartnerTrophy(props: {
    href: string;
    title: string;
    imgUrl: string;
    order?: number;
}) {
    return <a
        href={props.href}
        onClick={() => triggerTrackingEvent(props.title.toLowerCase() + '_trophy_click', 0.20)}
        target="_blank"
        style={{ order: props.order }}
    >
        <div className={'trophy ' + props.title.toLowerCase()} style={{
            width: 'auto'
        }}>
            <img loading="lazy" src={props.imgUrl} alt={'RxDB ' + props.title} />
            <div style={{ flex: 1 }}>
                <div className="subtitle">Official Partner</div>
                <div className="title">{props.title}</div>
            </div>
        </div>
    </a>;
}
