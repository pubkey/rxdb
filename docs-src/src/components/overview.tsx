import { lastOfArray } from '../../../plugins/core';
import sidebars from '../../sidebars';
import { Block } from '../components/block';


export function Overview() {
    return <>
        {
            (sidebars.tutorialSidebar as any[]).map(
                item => {
                    if (item.type === 'category' && item.label.toLowerCase() !== 'articles') {
                        const keyTop = item.type + '--' + item.label;
                        return <div key={keyTop}>
                            <br />
                            <br />
                            <h2 style={{ width: '100%' }}>{item.label}</h2>
                            <div className="premium-blocks" key={item.label}>
                                {item.items.map(i => {
                                    if (typeof i === 'string') {
                                        return <Block
                                            key={i}
                                            title={stripDash(i)}
                                            href={'./' + i + '.html'}
                                        ></Block>;
                                    } else if (i.type === 'category') {
                                        return i.items.map(i2 => {
                                            return <Block
                                                key={i2.id}
                                                title={stripDash(i2.label)}
                                                href={i2.type === 'link' ? i2.href : './' + i2.id + '.html'}
                                                target={i2.type === 'link' ? '_blank' : undefined}
                                            ></Block>;
                                        });
                                    } else {
                                        const key = i.type === 'link' ? i.label : i.id;
                                        return <Block
                                            key={key}
                                            title={stripDash(i.label)}
                                            href={i.type === 'link' ? i.href : './' + i.id + '.html'}
                                            target={i.type === 'link' ? '_blank' : undefined}
                                        ></Block>;
                                    }
                                })}
                            </div>
                        </div>;
                    }
                }
            )
        }
    </>;
}


function stripDash(str: string): string {
    const split = str.split('/');
    return lastOfArray(split);
}
