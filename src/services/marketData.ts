
export interface PriceData {
    symbol: string;
    name?: string;
    price: number;
    change: number;
    changePercent: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
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

export interface SymbolSearch {
    symbol: string;
    name: string;
    exchange?: string;
    type?: string;
}

const API_BASE = 'http://localhost:3001/api';

class MarketDataService {
    private static instance: MarketDataService;

    private constructor() { }

    public static getInstance(): MarketDataService {
        if (!MarketDataService.instance) {
            MarketDataService.instance = new MarketDataService();
        }
        return MarketDataService.instance;
    }

    private formatSymbol(symbol: string): string {
        let clean = symbol.trim().toUpperCase();
        if (!clean.includes('.') && clean.length > 0) {
            return `${clean}.NS`;
        }
        return clean;
    }

    public getFormattedSymbol(symbol: string): string {
        return this.formatSymbol(symbol);
    }

    public async getLatestPrice(symbol: string): Promise<PriceData> {
        const formatted = this.formatSymbol(symbol);

        try {
            const resp = await fetch(`${API_BASE}/stock/${formatted}`);
            const data = await resp.json();

            if (data.error) {
                throw new Error(data.message || 'Failed to fetch price');
            }

            return {
                symbol: data.symbol,
                name: data.name,
                price: data.price,
                change: data.change,
                changePercent: data.changePercent,
                open: data.open,
                high: data.high,
                low: data.low,
                volume: data.volume,
                lastUpdated: data.lastUpdated,
            };
        } catch (error: any) {
            console.error('MarketData Error:', error);
            throw error;
        }
    }

    public async getHistoricalData(symbol: string, interval: string = '5m'): Promise<CandleData[]> {
        const formatted = this.formatSymbol(symbol);

        try {
            const resp = await fetch(`${API_BASE}/stock/${formatted}`);
            const data = await resp.json();

            if (data.error) {
                throw new Error(data.message || 'Failed to fetch chart data');
            }

            if (!data.chartData || data.chartData.length === 0) {
                throw new Error('No chart data available for this symbol');
            }

            return data.chartData;
        } catch (error: any) {
            console.error('Chart Data Error:', error);
            throw error;
        }
    }

    public async searchSymbols(keywords: string): Promise<SymbolSearch[]> {
        if (!keywords || keywords.length < 2) return [];

        try {
            const resp = await fetch(`${API_BASE}/search/${keywords}`);
            const data = await resp.json();
            return data || [];
        } catch (error) {
            console.error('Symbol Search Error:', error);
            return [];
        }
    }
}

export const marketData = MarketDataService.getInstance();
