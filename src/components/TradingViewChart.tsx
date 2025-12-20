import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { marketData, CandleData } from '../services/marketData';

interface TradingViewChartProps {
    symbol: string;
    interval?: string;
    range?: string;
    onError?: (msg: string) => void;
    isDarkMode?: boolean;
}

export const TradingViewChart = ({ symbol, interval = '5m', range = '1d', onError, isDarkMode = true }: TradingViewChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: isDarkMode ? '#0a0a0a' : '#ffffff' },
                textColor: isDarkMode ? '#d1d5db' : '#374151',
            },
            grid: {
                vertLines: { color: isDarkMode ? '#171717' : '#f3f4f6' },
                horzLines: { color: isDarkMode ? '#171717' : '#f3f4f6' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            timeScale: {
                borderColor: isDarkMode ? '#171717' : '#e5e7eb',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: isDarkMode ? '#171717' : '#e5e7eb',
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        seriesRef.current = candlestickSeries;
        chartRef.current = chart;

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await marketData.getHistoricalData(symbol, interval, range);
                candlestickSeries.setData(data as any);
                chart.timeScale().fitContent();
            } catch (err: any) {
                const msg = err.message || 'Failed to load chart';
                setError(msg);
                if (onError) onError(msg);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [symbol, interval, range, onError, isDarkMode]);

    return (
        <div className="relative w-full h-full">
            {loading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Loading Chart Data...</p>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-8 text-center">
                    <div className="bg-red-500/20 p-4 rounded-full mb-4">
                        <div className="text-red-500 font-bold text-xl">!</div>
                    </div>
                    <h3 className="text-foreground font-bold mb-2">Service Alert</h3>
                    <p className="text-neutral-500 text-xs mb-6 max-w-xs">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-primary"
                    >
                        Retry Connection
                    </button>
                </div>
            )}
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
};
