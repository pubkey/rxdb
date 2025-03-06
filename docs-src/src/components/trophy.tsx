import { triggerTrackingEvent } from './trigger-event';

export const SOCIAL_PROOF_VALUES = {
    github: 21699,
    twitter: 2987,
    discord: 1070
};


export function Trophy(props: {
    href: string;
    title: string;
    subTitle: string;
    valueTitle: string;
    imgUrl: string;
    value: number;
}) {

    return <a
        href={props.href}
        onClick={() => triggerTrackingEvent(props.title.toLowerCase() + '_trophy_click', 0.20)}
        target="_blank"
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
                    <div className="arrow-up"> </div>
                </div>
            </div>
        </div>
    </a>;

}
