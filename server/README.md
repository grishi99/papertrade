# PaperTrade Backend Server

A Node.js proxy server that fetches real Indian stock data from Yahoo Finance.

## Quick Start

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

The server will run at `http://localhost:3001`.

## Endpoints

### GET /api/stock/:symbol
Fetches real-time quote and 5-minute candlestick data.

**Example:**
```
http://localhost:3001/api/stock/RELIANCE.NS
```

**Response:**
```json
{
  "symbol": "RELIANCE.NS",
  "name": "Reliance Industries Limited",
  "price": 2450.50,
  "change": 12.35,
  "changePercent": 0.51,
  "open": 2438.15,
  "high": 2455.00,
  "low": 2430.00,
  "volume": 5234567,
  "chartData": [
    { "time": 1702980300, "open": 2440, "high": 2445, "low": 2438, "close": 2443, "volume": 10000 }
  ]
}
```

### GET /api/search/:query
Search for stock symbols.

**Example:**
```
http://localhost:3001/api/search/tata
```

## Usage from React

```typescript
// Fetch stock data
const response = await fetch('http://localhost:3001/api/stock/RELIANCE.NS');
const data = await response.json();
console.log(data.price);
```

## Supported Symbols
- NSE: `RELIANCE.NS`, `HDFCBANK.NS`, `SBIN.NS`, `TCS.NS`
- BSE: `RELIANCE.BO`, `HDFCBANK.BO`
