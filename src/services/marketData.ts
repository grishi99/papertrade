
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

export interface SymbolSearch {
    symbol: string;
    name: string;
    type: string;
    region: string;
    matchScore: string;
}

interface CacheItem<T> {
    data: T;
    timestamp: number;
}

class MarketDataService {
    private static instance: MarketDataService;
    private apikey = import.meta.env.VITE_ALPHA_API_KEY;
    private baseUrl = 'https://www.alphavantage.co/query';

    private quoteCache: Map<string, CacheItem<PriceData>> = new Map();
    private chartCache: Map<string, CacheItem<CandleData[]>> = new Map();
    private searchCache: Map<string, CacheItem<SymbolSearch[]>> = new Map();
    private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    public async getLatestPrice(symbol: string): Promise<PriceData> {
        const formatted = this.formatSymbol(symbol);
        const cached = this.quoteCache.get(formatted);

        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.data;
        }

        try {
            const resp = await fetch(`${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${formatted}&apikey=${this.apikey}`);
            const data = await resp.json();

            if (data['Error Message']) throw new Error('Symbol not found');
            if (data['Note']) throw new Error('API rate limit reached');

            const quote = data['Global Quote'];
            if (!quote || !quote['05. price']) throw new Error('No data found for this symbol');

            const result: PriceData = {
                symbol: formatted,
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
                lastUpdated: quote['07. latest trading day']
            };

            this.quoteCache.set(formatted, { data: result, timestamp: Date.now() });
            return result;
        } catch (error) {
            console.error('MarketData Extra Error:', error);
            throw error;
        }
    }

    public async getHistoricalData(symbol: string, interval: string = '5min'): Promise<CandleData[]> {
        const formatted = this.formatSymbol(symbol);
        const cacheKey = `${formatted}_${interval}`;
        const cached = this.chartCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.data;
        }

        try {
            const resp = await fetch(`${this.baseUrl}?function=TIME_SERIES_INTRADAY&symbol=${formatted}&interval=${interval}&apikey=${this.apikey}&outputsize=compact`);
            const data = await resp.json();

            if (data['Note']) throw new Error('API rate limit reached');

            const timeSeries = data[`Time Series (${interval})`];
            if (!timeSeries) throw new Error('No chart data found for this symbol');

            const result: CandleData[] = Object.entries(timeSeries).map(([time, vals]: [string, any]) => ({
                time: Math.floor(new Date(time).getTime() / 1000),
                open: parseFloat(vals['1. open']),
                high: parseFloat(vals['2. high']),
                low: parseFloat(vals['3. low']),
                close: parseFloat(vals['4. close']),
                volume: parseInt(vals['5. volume'])
            })).sort((a, b) => (a.time as number) - (b.time as number));

            this.chartCache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;
        } catch (error) {
            console.error('Chart Data Error:', error);
            throw error;
        }
    }

    public getFormattedSymbol(symbol: string) {
        return this.formatSymbol(symbol);
    }

    public async searchSymbols(keywords: string): Promise<SymbolSearch[]> {
        if (!keywords || keywords.length < 2) return [];

        const cached = this.searchCache.get(keywords);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.data;
        }

        try {
            const resp = await fetch(`${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${this.apikey}`);
            const data = await resp.json();

            if (data['Note']) throw new Error('API rate limit reached');

            const bestMatches = data['bestMatches'];
            if (!bestMatches) return [];

            const result: SymbolSearch[] = bestMatches.map((item: any) => ({
                symbol: item['1. symbol'],
                name: item['2. name'],
                type: item['3. type'],
                region: item['4. region'],
                matchScore: item['9. matchScore']
            }));

            // Filter for NSE/BSE and specific Indian stocks if needed, or return all
            this.searchCache.set(keywords, { data: result, timestamp: Date.now() });
            return result;
        } catch (error) {
            console.error('Symbol Search Error:', error);
            return [];
        }
    }
}

export const marketData = MarketDataService.getInstance();
