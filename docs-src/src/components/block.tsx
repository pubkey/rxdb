import { ucfirst } from '../../../plugins/core';

export function Block(props: {
    title: string;
    text?: string | any;
    href?: string;
    target?: '_blank';
}) {
    const ret =
        <div className="premium-block hover-shadow-middle bg-gradient-right-top">
            <div className="premium-block-inner">
                <h4 style={{ textDecoration: 'none' }}>{ucfirst(props.title)}</h4>
                <p>{props.text}</p>
            </div>
        </div>;
    if (props.href) {
        return <a href={props.href} target={props.target} style={{ textDecoration: 'none' }}>
            {ret}
        </a>;
    }

    return ret;
}
