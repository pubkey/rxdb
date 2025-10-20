import { triggerTrackingEvent } from './trigger-event';

export const SOCIAL_PROOF_VALUES = {
    // @link https://www.star-history.com/#pubkey/rxdb&Date
    github: 22590,
    // @link https://x.com/rxdbjs
    twitter: 3003,
    // @link https://discord.com/invite/tqt9ZttJfD
    discord: 1251
} as const;


export function Trophy(props: {
    href: string;
    title: string;
    subTitle: string;
    valueTitle: string;
    imgUrl: string;
    value: number;
    order?: number;
}) {

    return <a
        href={props.href}
        onClick={() => triggerTrackingEvent(props.title.toLowerCase() + '_trophy_click', 0.20)}
        target="_blank"
        style={{ order: props.order }}
    >
        <div className={'trophy ' + props.title.toLowerCase()}>
            <img loading="lazy" src={props.imgUrl} alt={'RxDB ' + props.title} />
            <div style={{ flex: 1 }}>
                <div className="subtitle">{props.subTitle}</div>
                <div className="title">{props.title}</div>
            </div>
            <div>
                <div className="valuetitle">{props.valueTitle}</div>
                <div className="value">
                    {props.value.toLocaleString()}
                    {/* <CountUp
                        end={props.value}
                        start={props.value - 30}
                        duration={2}
                    ></CountUp> */}
                    <div className="arrow-up">▲</div>
                </div>
            </div>
        </div>
    </a>;
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
