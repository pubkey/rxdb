import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

type PerformanceDataPoint = {
    name: string;
    [key: string]: number | string;
};

type PerformanceChartImplProps = {
    data: PerformanceDataPoint[];
    metrics: { key: string; name: string; color: string; }[];
    title: string;
    logScale?: boolean;
};

export default function PerformanceChartImpl({ data, metrics, title, logScale }: PerformanceChartImplProps) {
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Sort payload chronologically according to the metrics array
            const sortedPayload = [...payload].sort((a, b) => {
                const indexA = metrics.findIndex(m => m.key === a.dataKey);
                const indexB = metrics.findIndex(m => m.key === b.dataKey);
                return indexA - indexB;
            });

            return (
                <div style={{
                    backgroundColor: 'color-mix(in srgb, var(--ifm-background-surface-color) 80%, transparent)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid var(--ifm-color-emphasis-200)',
                    color: 'var(--ifm-font-color-base)',
                    borderRadius: '4px',
                    padding: '10px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
                    {sortedPayload.map((entry: any, index: number) => (
                        <div key={index} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ marginRight: '15px' }}>{entry.name}</span>
                            <span>{entry.value}ms</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const handleLegendMouseEnter = (entry: any) => {
        setHoveredKey(entry.dataKey || entry.value);
    };

    const handleLegendMouseLeave = () => {
        setHoveredKey(null);
    };

    const CustomLegend = (props: any) => {
        const { payload } = props;
        if (!payload) return null;

        // Ensure chronological sorting based on metrics array
        const sortedPayload = [...payload].sort((a, b) => {
            const indexA = metrics.findIndex(m => m.key === a.dataKey || m.name === a.value || m.key === a.payload?.dataKey);
            const indexB = metrics.findIndex(m => m.key === b.dataKey || m.name === b.value || m.key === b.payload?.dataKey);
            return indexA - indexB;
        });

        // Try to match the Recharts default legend styling using flexbox
        return (
            <div className="responsive-legend-wrapper" onMouseLeave={handleLegendMouseLeave}>
                <div className="responsive-legend-container">
                    {sortedPayload.map((entry: any, index: number) => (
                        <div
                            key={index}
                            className="responsive-legend-item"
                            onMouseEnter={() => handleLegendMouseEnter(entry)}
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <div style={{ width: '14px', height: '14px', backgroundColor: entry.color, marginRight: '6px' }} />
                            <span
                                className="responsive-legend-text"
                                style={{
                                    color: 'var(--ifm-font-color-base)',
                                    textDecoration: hoveredKey === (entry.dataKey || entry.value) ? 'underline' : 'none'
                                }}
                            >
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const CustomXAxisTick = ({ x, y, payload }: any) => {
        let words: string[] = [];
        if (payload.value.length > 12) {
            const spaceWords = payload.value.split(' ');
            spaceWords.forEach((word: string) => {
                if (word.length > 12 && word.includes('-')) {
                    const parts = word.split('-');
                    for (let i = 0; i < parts.length - 1; i++) {
                        words.push(parts[i] + '-');
                    }
                    words.push(parts[parts.length - 1]);
                } else {
                    words.push(word);
                }
            });
        } else {
            words = [payload.value];
        }

        const lines: string[] = [];
        let currentLine = '';
        words.forEach((word: string) => {
            if ((currentLine + word).length > 15 && currentLine !== '') {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine += word + (word.endsWith('-') ? '' : ' ');
            }
        });
        if (currentLine) lines.push(currentLine.trim());

        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dy={16}
                    textAnchor="end"
                    fill="var(--ifm-font-color-base)"
                    transform="rotate(-45)"
                >
                    {lines.map((line: string, index: number) => (
                        <tspan key={index} x={0} dy={index === 0 ? 0 : 15}>
                            {line}
                        </tspan>
                    ))}
                </text>
            </g>
        );
    };

    return (
        <div style={{ width: '100%', height: isMobile ? 500 : 400, marginTop: '35px', marginBottom: '95px' }}>
            {title && (
                <h3 style={{ textAlign: 'center', marginBottom: '5px', color: 'var(--ifm-font-color-base)' }}>
                    {title}
                </h3>
            )}
            <div style={{ textAlign: 'center', marginBottom: '15px', opacity: 0.8, fontSize: '0.9em', color: 'var(--ifm-font-color-base)' }}>
                (times in milliseconds, lower is better)
            </div>
            <ResponsiveContainer>
                <BarChart
                    data={data}
                    margin={{
                        top: 35,
                        right: isMobile ? 0 : 30,
                        left: isMobile ? 0 : 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                        dataKey="name"
                        stroke="var(--ifm-font-color-base)"
                        tick={<CustomXAxisTick />}
                        tickMargin={10}
                        height={120}
                        interval={0}
                    />
                    <YAxis
                        stroke="var(--ifm-font-color-base)"
                        label={{ value: 'ms', position: 'top', offset: 15, fill: 'var(--ifm-font-color-base)' }}
                        scale={logScale ? 'log' : 'auto'}
                        domain={logScale ? ['auto', 'auto'] : undefined}
                    />
                    <Tooltip
                        wrapperStyle={{ zIndex: 1000 }}
                        content={<CustomTooltip />}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: isMobile ? '20px' : '0px' }}
                        content={<CustomLegend />}
                    />
                    {metrics.map(metric => (
                        <Bar
                            key={metric.key}
                            dataKey={metric.key}
                            name={metric.name}
                            fill={metric.color}
                            radius={[0, 0, 0, 0]}
                            fillOpacity={hoveredKey && hoveredKey !== metric.key ? 0.3 : 1}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
            <style>{`
                .responsive-legend-wrapper {
                    display: flex;
                    justify-content: center;
                    width: 100%;
                    margin-top: 10px;
                }
                .responsive-legend-container {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .responsive-legend-item {
                    margin-right: 15px;
                    margin-bottom: 5px;
                }
                .responsive-legend-text {
                    font-size: 14px;
                }
                @media (max-width: 768px) {
                    .responsive-legend-container {
                        flex-direction: column;
                        align-items: flex-start;
                        padding-left: 0;
                    }
                    .responsive-legend-item {
                        margin-bottom: 8px;
                        margin-right: 0px;
                    }
                    .responsive-legend-text {
                        font-size: 12px;
                        line-height: 1.1;
                    }
                }
            `}</style>
        </div>
    );
}
