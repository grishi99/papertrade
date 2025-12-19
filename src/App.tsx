import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Wallet, LayoutDashboard, List, History, Settings, Bot, ChevronUp, ChevronDown, Search, CheckCircle2, MessageSquare, Tag, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { TradingViewChart } from './components/TradingViewChart'
import { AIChatbot } from './components/AIChatbot'
import { marketData, PriceData } from './services/marketData'
import { orderEngine, Position, Order } from './services/orderEngine'

function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS')
    const [priceInfo, setPriceInfo] = useState<PriceData | null>(null)
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
    const [side, setSide] = useState<'buy' | 'sell'>('buy')
    const [quantity, setQuantity] = useState(1)

    // App State
    const [isPriceLoading, setIsPriceLoading] = useState(false)
    const [priceError, setPriceError] = useState<string | null>(null)
    const [balance, setBalance] = useState(orderEngine.getBalance())
    const [positions, setPositions] = useState<Position[]>(orderEngine.getPositions())
    const [trades, setTrades] = useState<Order[]>(orderEngine.getOrders())
    const [showNotification, setShowNotification] = useState(false)

    const fetchPrice = useCallback(async (symbol: string) => {
        setIsPriceLoading(true)
        setPriceError(null)
        try {
            const data = await marketData.getLatestPrice(symbol)
            setPriceInfo(data)

            // Update portfolio prices in engine for real P&L
            // Note: In a production app, the engine would have its own service connection
            positions.forEach(pos => {
                if (pos.symbol === data.symbol) {
                    pos.currentPrice = data.price
                    pos.pnl = (pos.currentPrice - pos.averagePrice) * pos.quantity
                    pos.pnlPercent = (pos.pnl / (pos.averagePrice * pos.quantity)) * 100
                }
            })
            setPositions([...positions])

        } catch (err: any) {
            setPriceError(err.message || 'Failed to fetch price')
        } finally {
            setIsPriceLoading(false)
        }
    }, [positions])

    useEffect(() => {
        fetchPrice(selectedSymbol)
        const interval = setInterval(() => fetchPrice(selectedSymbol), 15000)
        return () => clearInterval(interval)
    }, [selectedSymbol, fetchPrice])

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const val = (e.target as HTMLInputElement).value.toUpperCase().trim()
            if (val) {
                const formatted = marketData.getFormattedSymbol(val)
                setSelectedSymbol(formatted)
                    ; (e.target as HTMLInputElement).value = formatted
            }
        }
    }

    const handlePlaceOrder = async () => {
        if (!priceInfo) return

        await orderEngine.placeOrder({
            symbol: selectedSymbol,
            type: orderType,
            side: side,
            quantity: quantity
        }, priceInfo.price)

        // Refresh state
        setBalance(orderEngine.getBalance())
        const updatedPositions = orderEngine.getPositions()

        // Immediate price update for new positions
        updatedPositions.forEach(p => {
            if (p.symbol === priceInfo.symbol) {
                p.currentPrice = priceInfo.price
                p.pnl = (p.currentPrice - p.averagePrice) * p.quantity
                p.pnlPercent = (p.pnl / (p.averagePrice * p.quantity)) * 100
            }
        })

        setPositions(updatedPositions)
        setTrades(orderEngine.getOrders())

        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 3000)
    }

    const totalPnL = positions.reduce((acc, pos) => acc + (pos.currentPrice - pos.averagePrice) * pos.quantity, 0)

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Sidebar - Remains static for UX */}
            <aside className="w-16 lg:w-64 border-r border-border flex flex-col items-center lg:items-stretch py-6 space-y-8 bg-card/30 backdrop-blur-xl shrink-0">
                <div className="px-4 flex items-center space-x-3 mb-4">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <TrendingUp className="text-white size-6" />
                    </div>
                    <span className="hidden lg:block font-bold text-xl tracking-tight bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">PaperTrade</span>
                </div>

                <nav className="flex-1 px-3 space-y-2">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'watchlist', icon: List, label: 'Watchlist' },
                        { id: 'portfolio', icon: Wallet, label: 'Portfolio' },
                        { id: 'journal', icon: History, label: 'Trade Journal' },
                        { id: 'ai', icon: Bot, label: 'AI Assistant' },
                        { id: 'settings', icon: Settings, label: 'Settings' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${activeTab === item.id
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'hover:bg-secondary text-neutral-400 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="hidden lg:block font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Success Notification */}
                {showNotification && (
                    <div className="absolute top-20 right-8 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3">
                            <CheckCircle2 size={20} />
                            <span className="font-bold text-sm">Order Executed Successfully!</span>
                        </div>
                    </div>
                )}

                {/* Topbar */}
                <header className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur-md z-10">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 size-4" />
                            <input
                                type="text"
                                placeholder="Search symbol (e.g. RELIANCE)"
                                className="bg-secondary/50 border border-border/50 rounded-full pl-12 pr-6 py-2 focus:ring-2 focus:ring-primary/20 transition-all w-80 text-sm focus:outline-none focus:border-primary/50"
                                onKeyDown={handleSearch}
                            />
                        </div>
                        {isPriceLoading && <Loader2 className="animate-spin text-primary size-4" />}
                    </div>

                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Virtual Balance</div>
                                <div className="font-mono font-bold text-lg text-primary">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="h-8 w-px bg-border" />
                            <div className="text-right">
                                <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Total P&L</div>
                                <div className={`font-mono font-bold text-lg ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                        <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 border-2 border-border p-0.5 pointer-events-none">
                            <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-[10px] font-bold">JD</div>
                        </div>
                    </div>
                </header>

                {/* Workspace */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Dashboard View */}
                    {activeTab === 'dashboard' && (
                        <div className="flex flex-1 overflow-hidden">
                            <section className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <div className="flex items-center justify-between">
                                    <div className="min-h-[100px]">
                                        {priceError ? (
                                            <div className="flex items-center space-x-3 text-red-500 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 max-w-md">
                                                <AlertCircle className="shrink-0" />
                                                <span className="text-sm font-bold">Error: {priceError}. Try "HDFCBANK"</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center space-x-3">
                                                    <h2 className="text-3xl font-bold tracking-tight">{selectedSymbol}</h2>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${priceInfo && priceInfo.change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {priceInfo ? `${priceInfo.changePercent.toFixed(2)}%` : '...'}
                                                    </span>
                                                </div>
                                                <div className="text-4xl font-mono font-bold mt-2 bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
                                                    ₹{priceInfo ? priceInfo.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'Fetching...'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/50">
                                        {['1m', '5m', '15m', '1h', '1D', '1W'].map(tf => (
                                            <button key={tf} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tf === '5m' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:text-white'}`}>
                                                {tf}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-card/50 rounded-3xl border border-border/50 h-[550px] overflow-hidden shadow-2xl relative">
                                    <TradingViewChart key={selectedSymbol} symbol={selectedSymbol} interval="5min" onError={setPriceError} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 bg-card/30 p-8 rounded-3xl border border-border/50">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6">Market Statistics (Real-Time)</h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                            <div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-black mb-1">Last Update</div>
                                                <div className="font-mono text-sm font-bold">{priceInfo?.lastUpdated || '...'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-black mb-1 text-primary/50">Price</div>
                                                <div className="font-mono text-lg font-bold text-primary text-glow-white">₹{priceInfo?.price.toFixed(2) || '...'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-black mb-1 text-red-500/50">Net Change</div>
                                                <div className="font-mono text-lg font-bold text-red-500 text-glow-red">₹{priceInfo?.change.toFixed(2) || '...'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-black mb-1">Interval</div>
                                                <div className="font-mono text-lg font-bold">5 MIN</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20 relative overflow-hidden group cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setActiveTab('ai')}>
                                        <div className="absolute -right-4 -bottom-4 size-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
                                        <div className="flex items-start space-x-4 relative z-10">
                                            <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                                                <Bot className="text-primary size-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-primary mb-2">Market Sentiment AI</h4>
                                                <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                                                    "Currently analyzing {selectedSymbol}. Prices are being fetched from Alpha Vantage. Caching enabled to preserve API limits."
                                                </p>
                                                <div className="flex items-center space-x-2 text-primary text-[10px] mt-4 font-black uppercase tracking-widest">
                                                    <span>Chat with AI</span>
                                                    <ChevronUp className="rotate-90 size-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Right Panel: Watchlist & Order Entry */}
                            <aside className="w-96 border-l border-border flex flex-col bg-card/10 backdrop-blur-3xl shrink-0">
                                {/* Quick Order Panel */}
                                <div className="p-8 border-b border-border/50">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-6 text-center">Execution Engine</h3>

                                    <div className="flex bg-secondary/50 rounded-2xl p-1 mb-8 border border-border/50">
                                        <button
                                            onClick={() => setSide('buy')}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${side === 'buy' ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            BUY
                                        </button>
                                        <button
                                            onClick={() => setSide('sell')}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${side === 'sell' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            SELL
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex bg-secondary/50 rounded-xl p-1 border border-border/50">
                                            <button
                                                onClick={() => setOrderType('market')}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${orderType === 'market' ? 'bg-card text-white shadow-md' : 'text-neutral-500'}`}
                                            >
                                                Market
                                            </button>
                                            <button
                                                onClick={() => setOrderType('limit')}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${orderType === 'limit' ? 'bg-card text-white shadow-md' : 'text-neutral-500'}`}
                                            >
                                                Limit
                                            </button>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Quantity (Shares)</label>
                                                <span className="text-[10px] text-primary font-bold">Max: {priceInfo ? Math.floor(balance / priceInfo.price) : 0}</span>
                                            </div>
                                            <div className="flex items-center bg-secondary/50 rounded-2xl border border-border/50 px-4 py-3 group focus-within:border-primary/50 transition-all">
                                                <input
                                                    type="number"
                                                    value={quantity}
                                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                                    className="bg-transparent border-none focus:ring-0 w-full font-mono font-bold text-lg"
                                                />
                                                <div className="flex flex-col space-y-1">
                                                    <button onClick={() => setQuantity(q => q + 1)} className="hover:text-primary transition-colors hover:scale-125"><ChevronUp size={14} /></button>
                                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="hover:text-primary transition-colors hover:scale-125"><ChevronDown size={14} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        {orderType === 'limit' && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-2 block">Set Price</label>
                                                <div className="bg-secondary/50 rounded-2xl border border-border/50 px-4 py-3 focus-within:border-primary/50 transition-all">
                                                    <input
                                                        type="number"
                                                        defaultValue={priceInfo?.price}
                                                        className="bg-transparent border-none focus:ring-0 w-full font-mono font-bold text-lg"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-6 border-t border-border/50 space-y-3">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-neutral-500 uppercase tracking-tighter">Current Market Value</span>
                                                <span className="font-mono text-white text-glow-white">₹{priceInfo ? ((priceInfo.price || 0) * quantity).toLocaleString() : '...'}</span>
                                            </div>
                                            <button
                                                onClick={handlePlaceOrder}
                                                disabled={!priceInfo || isPriceLoading}
                                                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all transform active:scale-95 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${side === 'buy' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
                                            >
                                                Place {side} order
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="p-6 border-b border-border/50 flex justify-between items-center bg-card/20">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Live Market Watch</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {[
                                            { s: 'HDFCBANK.NS', p: '1,532.00', c: '+0.8%', up: true },
                                            { s: 'RELIANCE.NS', p: '2,945.10', c: '+1.2%', up: true },
                                            { s: 'SBIN.NS', p: '780.45', c: '-0.4%', up: false },
                                            { s: 'TCS.NS', p: '4,120.45', c: '-0.4%', up: false },
                                            { s: 'INFY.NS', p: '1,640.20', c: '+2.1%', up: true },
                                        ].map((item) => (
                                            <button
                                                key={item.s}
                                                onClick={() => setSelectedSymbol(item.s)}
                                                className={`w-full p-5 flex justify-between items-center hover:bg-primary/5 transition-all group ${selectedSymbol === item.s ? 'bg-primary/10 border-r-4 border-primary' : 'border-r-4 border-transparent'}`}
                                            >
                                                <div className="flex flex-col items-start">
                                                    <div className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{item.s}</div>
                                                    <div className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase">NSE · Equity</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono text-xs text-neutral-500 uppercase font-black mb-1">Select Ticker</div>
                                                    <div className={`text-[10px] font-black rounded px-1.5 py-0.5 inline-block ${item.up ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {item.c}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}

                    {/* Other views remain identical in structure but benefit from real positions and totalPnL */}

                    {/* Portfolio View */}
                    {activeTab === 'portfolio' && (
                        <section className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                            <div className="flex items-end justify-between">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight">Real-Time Portfolio</h2>
                                    <p className="text-neutral-500 mt-2 font-medium">Tracking assets based on live Alpha Vantage quotes.</p>
                                </div>
                                <div className="bg-primary/10 border border-primary/20 px-6 py-3 rounded-2xl flex items-center space-x-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-primary">Status:</span>
                                    <span className="text-sm font-bold text-white">Live Data Connected</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {[
                                    { label: 'Available Cash', value: `₹${balance.toLocaleString()}`, icon: Wallet, color: 'text-primary' },
                                    { label: 'Holdings Value', value: `₹${positions.reduce((acc, p) => acc + (p.currentPrice * p.quantity), 0).toLocaleString()}`, icon: TrendingUp, color: 'text-white' },
                                    { label: 'Live Unrealised P&L', value: `${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toLocaleString()}`, icon: ChevronUp, color: totalPnL >= 0 ? 'text-green-500' : 'text-red-500' },
                                    { label: 'Portfolio ROI', value: `${((totalPnL / 1000000) * 100).toFixed(2)}%`, icon: CheckCircle2, color: 'text-purple-500' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-card/50 p-8 rounded-3xl border border-border/50 relative overflow-hidden group">
                                        <div className={`absolute -right-2 -bottom-2 opacity-5 ${stat.color}`}>
                                            <stat.icon size={80} strokeWidth={3} />
                                        </div>
                                        <div className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em] mb-3">{stat.label}</div>
                                        <div className={`text-2xl font-mono font-black ${stat.color}`}>{stat.value}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-card/30 rounded-[2.5rem] border border-border/50 overflow-hidden shadow-2xl backdrop-blur-xl">
                                <table className="w-full text-left">
                                    <thead className="bg-secondary/30 text-[10px] uppercase tracking-widest text-neutral-500 font-black border-b border-border/50">
                                        <tr>
                                            <th className="px-8 py-6">Instrument</th>
                                            <th className="px-8 py-6">Qty</th>
                                            <th className="px-8 py-6 text-right">Avg. Cost</th>
                                            <th className="px-8 py-6 text-right">Market Price</th>
                                            <th className="px-8 py-6 text-right">Value</th>
                                            <th className="px-8 py-6 text-right">P&L (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {positions.length > 0 ? positions.map((pos) => {
                                            const pnl = (pos.currentPrice - pos.averagePrice) * pos.quantity;
                                            const returnPct = (pnl / (pos.averagePrice * pos.quantity)) * 100;
                                            return (
                                                <tr key={pos.symbol} className="hover:bg-primary/5 transition-all group">
                                                    <td className="px-8 py-7">
                                                        <div className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{pos.symbol}</div>
                                                        <div className="text-[10px] font-bold text-neutral-500 uppercase mt-1">NSE · Equity</div>
                                                    </td>
                                                    <td className="px-8 py-7 font-mono font-bold">{pos.quantity}</td>
                                                    <td className="px-8 py-7 font-mono text-neutral-400 text-right">₹{pos.averagePrice.toFixed(2)}</td>
                                                    <td className="px-8 py-7 font-mono text-right font-bold transition-all group-hover:text-glow-white flex items-center justify-end space-x-2">
                                                        <span>₹{pos.currentPrice.toFixed(2)}</span>
                                                        {isPriceLoading && selectedSymbol === pos.symbol && <Loader2 className="animate-spin size-3 text-primary" />}
                                                    </td>
                                                    <td className="px-8 py-7 font-mono text-right font-black">₹{(pos.currentPrice * pos.quantity).toLocaleString()}</td>
                                                    <td className={`px-8 py-7 text-right`}>
                                                        <div className={`font-mono font-black ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {pnl >= 0 ? '▲' : '▼'} {Math.abs(returnPct).toFixed(2)}%
                                                        </div>
                                                        <div className={`text-[10px] font-bold mt-1 ${pnl >= 0 ? 'text-green-500/50' : 'text-red-500/50'}`}>
                                                            ({pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString()})
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }) : (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-32 text-center">
                                                    <div className="flex flex-col items-center space-y-4 opacity-30">
                                                        <Wallet size={48} strokeWidth={1} />
                                                        <p className="text-sm font-bold uppercase tracking-widest">No Active Positions</p>
                                                        <button onClick={() => setActiveTab('dashboard')} className="text-[10px] font-black text-primary border-b border-primary hover:text-white hover:border-white transition-colors">Go to Dashboard</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Other tabs remain largely identical but use the common trades/activeTab/etc */}
                    {activeTab === 'journal' && (
                        <section className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
                            <div className="flex items-end justify-between">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight">Trade Journal</h2>
                                    <p className="text-neutral-500 mt-2 font-medium">Automatic logging with Alpha Vantage data.</p>
                                </div>
                                <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary-600 transition-all active:scale-95 flex items-center space-x-3">
                                    <FileText size={18} />
                                    <span>Export Journal</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {trades.length > 0 ? trades.slice().reverse().map((trade) => (
                                    <div key={trade.id} className="bg-card/30 rounded-3xl border border-border/50 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-secondary/20 transition-all border-l-8 border-l-primary">
                                        <div className="flex items-center space-x-6">
                                            <div className={`size-14 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${trade.side === 'buy' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                                {trade.side.toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-lg tracking-tight">{trade.symbol}</div>
                                                <div className="text-[10px] font-black text-neutral-500 uppercase flex items-center space-x-2 mt-1">
                                                    <span>{new Date(trade.timestamp).toLocaleString()}</span>
                                                    <span className="size-1 rounded-full bg-neutral-700" />
                                                    <span>{trade.type} Order</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8 px-8 border-x border-border/30">
                                            <div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-black mb-1">Price</div>
                                                <div className="font-mono text-sm font-bold">₹{trade.price.toFixed(2)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-black mb-1">Quantity</div>
                                                <div className="font-mono text-sm font-bold">{trade.quantity}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-neutral-500 uppercase font-black mb-1">Status</div>
                                                <div className="flex items-center space-x-1 text-green-500 font-bold text-xs uppercase tracking-widest">
                                                    <CheckCircle2 size={12} />
                                                    <span>{trade.status}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-64 flex items-center space-x-4 bg-background/50 p-4 rounded-2xl border border-border/50">
                                            <MessageSquare className="text-neutral-500 size-5 shrink-0" />
                                            <textarea placeholder="Add notes..." className="bg-transparent border-none focus:ring-0 w-full text-xs font-medium resize-none placeholder:text-neutral-700" rows={1} />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="bg-card/20 rounded-[3rem] p-32 text-center border border-dashed border-border/50">
                                        <History size={64} strokeWidth={1} className="mx-auto mb-6 opacity-20" />
                                        <h3 className="text-xl font-black uppercase tracking-widest opacity-30">No Trade Journal Entries</h3>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === 'ai' && (
                        <section className="flex-1 p-12 overflow-hidden flex flex-col space-y-8">
                            <div className="flex items-center space-x-4">
                                <div className="size-12 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                                    <Bot className="text-white size-6" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight">AI Education Assistant</h2>
                                    <p className="text-neutral-500 font-medium">Context: Real-time NSE/BSE data from Alpha Vantage.</p>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <AIChatbot />
                            </div>
                        </section>
                    )}

                    {activeTab === 'settings' && (
                        <section className="flex-1 p-12 overflow-y-auto space-y-12">
                            <h2 className="text-4xl font-black tracking-tight">API & System Settings</h2>
                            <div className="max-w-2xl bg-card/30 p-8 rounded-3xl border border-border/50">
                                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-6">Alpha Vantage Connection</h3>
                                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl">
                                    <div>
                                        <div className="text-sm font-bold">API Status</div>
                                        <div className="text-xs text-neutral-500">Free Tier (25 calls/min)</div>
                                    </div>
                                    <div className="flex items-center space-x-2 text-green-500 font-black text-[10px] uppercase tracking-widest">
                                        <CheckCircle2 size={14} />
                                        <span>Connected</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                </div>
            </main>
        </div>
    )
}

export default App
