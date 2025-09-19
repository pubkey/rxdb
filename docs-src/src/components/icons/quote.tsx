import { IconProps } from './arrow-right';

export function IconQuoteStartSingle({ style, className }: IconProps) {
    return <div style={style} className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="15" viewBox="0 0 10 15" fill="none">
            <path d="M5 5V0H0V5V10V15H5H10V5H5Z" fill="#ED168F" />
        </svg>
    </div>;
}

export function IconQuoteStart({ style, className }: IconProps) {
    return <div style={{
        display: 'flex',
        gap: 5,
        ...style
    }}>
        <IconQuoteStartSingle />
        <IconQuoteStartSingle />
    </div>;
}

export function IconQuoteEndSingle({ style, className }: IconProps) {
    return <div style={style} className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="15" viewBox="0 0 10 15" fill="none">
            <path d="M5 0H0V5V10H5V15H10V10V5V0H5Z" fill="#ED168F" />
        </svg>
    </div>;
}


export function IconQuoteEnd({ style, className }: IconProps) {
    return <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 5,
        ...style
    }}>
        <IconQuoteEndSingle />
        <IconQuoteEndSingle />
    </div>;
}
