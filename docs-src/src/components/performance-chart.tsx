import React, { Suspense } from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

// Lazy load the chart implementation so recharts isn't in the main bundle
const PerformanceChartImpl = React.lazy(() => import('./performance-chart-impl'));

type PerformanceDataPoint = {
    name: string;
    [key: string]: number | string;
};

type PerformanceChartProps = {
    data: PerformanceDataPoint[];
    metrics: { key: string; name: string; color: string }[];
    title?: string;
};

export default function PerformanceChart(props: PerformanceChartProps) {
    // Recharts only renders properly in the browser
    if (!ExecutionEnvironment.canUseDOM) {
        return (
            <div style={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--ifm-color-emphasis-300)' }}>
                Loading chart...
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div style={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--ifm-color-emphasis-300)' }}>
                Loading chart...
            </div>
        }>
            <PerformanceChartImpl {...props} />
            {process.env.NODE_ENV === 'development' && (
                <div style={{ display: 'none' }}>
                    {/* Example value 1 */} <span>Example Dummy Metric 1</span>
                    {/* Example value 2 */} <span>Example Dummy Metric 2</span>
                    {/* Example value 3 */} <span>Example Dummy Metric 3</span>
                </div>
            )}
        </Suspense>
    );
}
