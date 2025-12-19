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
// Returns: quote data, historical candlesticks
// ============================================
app.get('/api/stock/:symbol', async (req, res) => {
    try {
        const symbol = formatSymbol(req.params.symbol);
        console.log(`[REQUEST] Fetching data for: ${symbol}`);

        // Check cache first
        const cachedData = getFromCache(symbol);
        if (cachedData) {
            return res.json(cachedData);
        }

        // Fetch real-time quote
        const quote = await yahooFinance.quote(symbol);

        if (!quote || !quote.regularMarketPrice) {
            return res.status(404).json({
                error: true,
                message: `No data found for symbol: ${symbol}. Try RELIANCE.NS, HDFCBANK.NS, or SBIN.NS.`
            });
        }

        // Fetch historical data for candlestick chart (last 7 days, 5-min interval)
        let chartData = [];
        try {
            const historical = await yahooFinance.chart(symbol, {
                period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                period2: new Date(),
                interval: '5m',
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
            // Continue without chart data
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
        setCache(symbol, response);

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

        const suggestions = (results.quotes || [])
            .filter(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO') || !q.symbol.includes('.')))
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
});
