/**
 * PaperTrade Backend Server
 * 
 * A Node.js proxy server that fetches real Indian stock data from Yahoo Finance.
 * Supports NSE (.NS) and BSE (.BO) symbols like RELIANCE.NS, HDFCBANK.NS.
 * 
 * Run: npm install && node server.js
 * Endpoint: GET http://localhost:3001/api/stock/:symbol
 */

import express from 'express';
import cors from 'cors';
import yahooFinance from 'yahoo-finance2';

const app = express();
const PORT = 3001;

// Enable CORS for React dev server
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET'],
}));

app.use(express.json());

// ============================================
// In-Memory Cache (5-minute TTL)
// ============================================
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getFromCache(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[CACHE HIT] ${key}`);
        return cached.data;
    }
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// ============================================
// Helper: Format Symbol for Yahoo Finance
// ============================================
function formatSymbol(symbol) {
    let clean = symbol.trim().toUpperCase();
    // If no suffix, default to NSE
    if (!clean.includes('.') && clean.length > 0) {
        return `${clean}.NS`;
    }
    return clean;
}

// ============================================
// GET /api/stock/:symbol
// Query Params: ?interval=5m&range=1d
// Returns: quote data, historical candlesticks
// ============================================
app.get('/api/stock/:symbol', async (req, res) => {
    try {
        const symbol = formatSymbol(req.params.symbol);
        const interval = req.query.interval || '5m';
        const range = req.query.range || '1d';

        // Validate allowed intervals to prevent abuse
        const allowedIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
        if (!allowedIntervals.includes(interval)) {
            return res.status(400).json({ error: true, message: `Invalid interval: ${interval}` });
        }

        console.log(`[REQUEST] Fetching data for: ${symbol} (Int: ${interval}, Range: ${range})`);

        // Cache key includes interval and range
        const cacheKey = `${symbol}_${interval}_${range}`;
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        // Fetch real-time quote
        const quote = await yahooFinance.quote(symbol);

        if (!quote || !quote.regularMarketPrice) {
            console.warn(`[WARN] No regularMarketPrice found for ${symbol}`);
            return res.status(404).json({
                error: true,
                message: `No data found for symbol: ${symbol}.`
            });
        }

        // Fetch historical data with dynamic options
        let chartData = [];
        try {
            const queryOptions = { period1: range, interval: interval };
            // yahoo-finance2 chart() uses 'period1' as 'range' if string (e.g. '1d', '5d', '1y')
            // but actually strictly it's queryOptions: { range: '1d', interval: '5m' } for convenience wrappers
            // or using period1/period2. Let's use the 'validation' safe way:
            // If range is a validity string like '1d','5d','1mo','3mo','6mo','1y','5y','10y','ytd','max'
            // we can pass proper queryOptions.

            const historical = await yahooFinance.chart(symbol, {
                range: range,
                interval: interval,
            });

            if (historical && historical.quotes) {
                chartData = historical.quotes
                    .filter(q => q.open && q.high && q.low && q.close)
                    .map(q => ({
                        time: Math.floor(new Date(q.date).getTime() / 1000),
                        open: q.open,
                        high: q.high,
                        low: q.low,
                        close: q.close,
                        volume: q.volume || 0,
                    }));
            }
        } catch (chartError) {
            console.warn(`[WARN] Chart data not available for ${symbol}:`, chartError.message);
        }

        // Build response
        const response = {
            symbol: symbol,
            name: quote.shortName || quote.longName || symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            open: quote.regularMarketOpen || quote.regularMarketPrice,
            high: quote.regularMarketDayHigh || quote.regularMarketPrice,
            low: quote.regularMarketDayLow || quote.regularMarketPrice,
            close: quote.regularMarketPreviousClose || quote.regularMarketPrice,
            volume: quote.regularMarketVolume || 0,
            lastUpdated: new Date().toISOString(),
            chartData: chartData,
        };

        // Cache the response
        setCache(cacheKey, response);

        console.log(`[SUCCESS] Returned data for ${symbol}: ₹${response.price}`);
        res.json(response);

    } catch (error) {
        console.error(`[ERROR] Failed to fetch ${req.params.symbol}:`, error.message);
        res.status(500).json({
            error: true,
            message: `Failed to fetch data: ${error.message}`
        });
    }
});

// ============================================
// GET /api/search/:query
// Returns: symbol suggestions
// ============================================
app.get('/api/search/:query', async (req, res) => {
    try {
        const query = req.params.query.trim();
        if (query.length < 2) {
            return res.json([]);
        }

        console.log(`[SEARCH] Searching for: ${query}`);

        const results = await yahooFinance.search(query, { quotesCount: 10 });

        // Filter for Indian markets (NSE/BSE) or no suffix (often defaulting to US but here we want Indian)
        const suggestions = (results.quotes || [])
            .filter(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                exchange: q.exchange || 'NSE',
                type: q.quoteType || 'Equity',
            }));

        res.json(suggestions);

    } catch (error) {
        console.error(`[ERROR] Search failed for ${req.params.query}:`, error.message);
        res.json([]);
    }
});

// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log(`\n🚀 PaperTrade Server running at http://localhost:${PORT}`);
    console.log(`📈 Example: http://localhost:${PORT}/api/stock/RELIANCE.NS`);
    console.log(`🔍 Search: http://localhost:${PORT}/api/search/tata\n`);

    // Suppress the maintenance warning from yahoo-finance2
    const originalEmit = process.emit;
    process.emit = function (name, data, ...args) {
        if (name === `warning` && typeof data === `object` && data.name === `DeprecationWarning` && data.message.includes(`yahoo-finance2`)) {
            return false;
        }
        return originalEmit.apply(process, [name, data, ...args]);
    };
});
