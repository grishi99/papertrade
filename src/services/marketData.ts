import { createClient } from '@supabase/supabase-js'

// Market Data Utility using Yahoo Finance (unofficial) or Alpha Vantage
// For this demo, we will use a mixed approach or mock data if API keys are missing.

export interface PriceData {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    lastUpdated: string;
}

export interface CandleData {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

class MarketDataService {
    private static instance: MarketDataService;
    private cache: Map<string, PriceData> = new Map();

    private constructor() { }

    public static getInstance(): MarketDataService {
        if (!MarketDataService.instance) {
            MarketDataService.instance = new MarketDataService();
        }
        return MarketDataService.instance;
    }

    // NSE symbols usually end with .NS, BSE with .BO
    public async getLatestPrice(symbol: string): Promise<PriceData> {
        // In a real app, this would call Alpha Vantage or a proxy to Yahoo Finance
        // For the blueprint demo, we'll simulate real-time movement if it's in our "active" list

        // Mocking for now to ensure UI works immediately
        const basePrice = symbol.includes('.NS') ? 2200 + Math.random() * 100 : 150 + Math.random() * 50;
        const change = (Math.random() - 0.5) * 10;

        return {
            symbol,
            price: basePrice,
            change: change,
            changePercent: (change / basePrice) * 100,
            lastUpdated: new Date().toISOString()
        };
    }

    public async getHistoricalData(symbol: string, interval: string = '1D'): Promise<CandleData[]> {
        // Simulation of historical data for the chart
        const data: CandleData[] = [];
        let prevClose = symbol.includes('.NS') ? 2150 : 145;
        const now = Math.floor(Date.now() / 1000);
        const dayInSecs = 24 * 60 * 60;

        for (let i = 100; i >= 0; i--) {
            const open = prevClose + (Math.random() - 0.5) * 20;
            const close = open + (Math.random() - 0.5) * 20;
            const high = Math.max(open, close) + Math.random() * 10;
            const low = Math.min(open, close) - Math.random() * 10;

            data.push({
                time: now - (i * dayInSecs),
                open,
                high,
                low,
                close,
                volume: Math.floor(Math.random() * 1000000)
            });
            prevClose = close;
        }
        return data;
    }
}

export const marketData = MarketDataService.getInstance();
