import { lastOfArray } from '../../../plugins/core';
import sidebars from '../../sidebars';
import { Block } from '../components/block';


export function Overview() {
    return <>
        {
            (sidebars.tutorialSidebar as any[]).map(
                item => {
                    if (item.type === 'category' && item.label.toLowerCase() !== 'articles') {
                        return <>
                            <h2 style={{ width: '100%' }}>{item.label}</h2>
                            <div className="premium-blocks" key={item.label}>
                                {item.items.map(i => {
                                    if (typeof i === 'string') {
                                        return <Block
                                            key={i}
                                            title={stripDash(i)}
                                            href={'./' + i + '.html'}
                                        ></Block>;
                                    } else {
                                        return <Block
                                            key={i.id}
                                            title={stripDash(i.label)}
                                            href={i.type === 'link' ? i.href : './' + i.id + '.html'}
                                            target={i.type === 'link' ? '_blank' : undefined}
                                        ></Block>;
                                    }
                                })}
                            </div>
                        </>;
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
