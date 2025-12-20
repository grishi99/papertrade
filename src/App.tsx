import { useState, useEffect, useCallback, useRef } from 'react'
import { TrendingUp, Wallet, LayoutDashboard, List, History, Settings, Bot, ChevronUp, ChevronDown, Search, CheckCircle2, MessageSquare, Tag, FileText, AlertCircle, Loader2, Sun, Moon } from 'lucide-react'
import { TradingViewChart } from './components/TradingViewChart'
import { AIChatbot } from './components/AIChatbot'
import { marketData, PriceData, SymbolSearch } from './services/marketData'
import { orderEngine, Position, Order } from './services/orderEngine'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS')
    const [priceInfo, setPriceInfo] = useState<PriceData | null>(null)
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
    const [side, setSide] = useState<'buy' | 'sell'>('buy')
    const [quantity, setQuantity] = useState(1)

    // Search & Suggest
    const [searchQuery, setSearchQuery] = useState('')
    const [suggestions, setSuggestions] = useState<SymbolSearch[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)

    // Theme
    const [isDarkMode, setIsDarkMode] = useState(true)

    // Chart State
    const [chartInterval, setChartInterval] = useState('5m')
    const [chartRange, setChartRange] = useState('1d')

    // App State
    const [isPriceLoading, setIsPriceLoading] = useState(false)
    const [priceError, setPriceError] = useState<string | null>(null)
    const [balance, setBalance] = useState(orderEngine.getBalance())
    const [positions, setPositions] = useState<Position[]>(orderEngine.getPositions())
    const [trades, setTrades] = useState<Order[]>(orderEngine.getOrders())
    const [showNotification, setShowNotification] = useState(false)

    // Initialize theme
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDarkMode])

    const fetchPrice = useCallback(async (symbol: string) => {
        setIsPriceLoading(true)
        setPriceError(null)
        try {
            const data = await marketData.getLatestPrice(symbol)
            setPriceInfo(data)

            const updatedPositions = orderEngine.getPositions().map(pos => {
                if (pos.symbol === data.symbol) {
                    const currentPos = { ...pos }
                    currentPos.currentPrice = data.price
                    currentPos.pnl = (currentPos.currentPrice - currentPos.averagePrice) * currentPos.quantity
                    currentPos.pnlPercent = (currentPos.pnl / (currentPos.averagePrice * currentPos.quantity)) * 100
                    return currentPos
                }
                return pos
            })
            setPositions(updatedPositions)

        } catch (err: any) {
            setPriceError(err.message || 'Failed to fetch price')
        } finally {
            setIsPriceLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPrice(selectedSymbol)
        const interval = setInterval(() => fetchPrice(selectedSymbol), 15000)
        return () => clearInterval(interval)
    }, [selectedSymbol, fetchPrice])

    // Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                const results = await marketData.searchSymbols(searchQuery)
                setSuggestions(results)
                setShowSuggestions(true)
            } else {
                setSuggestions([])
                setShowSuggestions(false)
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [searchQuery])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelectSymbol = (symbol: string) => {
        const formatted = marketData.getFormattedSymbol(symbol)
        setSelectedSymbol(formatted)
        setSearchQuery('')
        setShowSuggestions(false)
    }

    const handlePlaceOrder = async () => {
        if (!priceInfo) return

        await orderEngine.placeOrder({
            symbol: selectedSymbol,
            type: orderType,
            side: side,
            quantity: quantity
        }, priceInfo.price)

        setBalance(orderEngine.getBalance())
        setPositions(orderEngine.getPositions())
        setTrades(orderEngine.getOrders())

        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 3000)
    }

    const totalPnL = positions.reduce((acc, pos) => acc + (pos.currentPrice - pos.averagePrice) * pos.quantity, 0)

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-16 lg:w-64 border-r border-border flex flex-col items-center lg:items-stretch py-6 space-y-8 bg-card shrink-0 transition-colors duration-300">
                <div className="px-4 flex items-center space-x-3 mb-4">
                    <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <TrendingUp className="text-white size-6" />
                    </div>
                    <span className="hidden lg:block font-bold text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">PaperTrade</span>
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
                            className={cn(
                                "w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200",
                                activeTab === item.id
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "hover:bg-secondary text-neutral-400 hover:text-foreground"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="hidden lg:block font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="px-3 border-t border-border pt-6">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary text-neutral-400 hover:text-foreground transition-all"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        <span className="hidden lg:block font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Success Notification */}
                {showNotification && (
                    <div className="absolute top-20 right-8 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3">
                            <CheckCircle2 size={20} />
                            <span className="font-bold text-sm">Order Executed Successfully!</span>
                        </div>
                    </div>
                )}

                {/* Topbar */}
                <header className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur-md z-30">
                    <div className="flex items-center space-x-4 relative" ref={searchRef}>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 size-4" />
                            <input
                                type="text"
                                placeholder="Search symbol (e.g. RELIANCE)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                                className="bg-secondary border border-border rounded-full pl-12 pr-6 py-2 focus:ring-2 focus:ring-primary/20 transition-all w-80 text-sm focus:outline-none focus:border-primary/50"
                            />

                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 mt-2 w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 divide-y divide-border">
                                        {suggestions.map((s) => (
                                            <button
                                                key={s.symbol}
                                                onClick={() => handleSelectSymbol(s.symbol)}
                                                className="w-full p-3 text-left hover:bg-secondary flex flex-col transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-primary">{s.symbol}</span>
                                                    <span className="text-[10px] uppercase font-black text-neutral-500">{s.exchange || 'NSE'}</span>
                                                </div>
                                                <span className="text-xs text-neutral-400 truncate">{s.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                                <div className={cn("font-mono font-bold text-lg", totalPnL >= 0 ? 'text-green-600' : 'text-red-600')}>
                                    {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                        <div className="size-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 border-2 border-border p-0.5 pointer-events-none">
                            <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-[10px] font-bold">JD</div>
                        </div>
                    </div>
                </header>

                {/* Workspace */}
                <div className="flex-1 flex overflow-hidden">

                    {activeTab === 'dashboard' && (
                        <div className="flex flex-1 overflow-hidden">
                            <section className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <div className="flex items-center justify-between">
                                    <div className="min-h-[100px]">
                                        {priceError ? (
                                            <div className="flex items-center space-x-3 text-red-600 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 max-w-md">
                                                <AlertCircle className="shrink-0" />
                                                <span className="text-sm font-bold">Error: {priceError}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center space-x-3">
                                                    <h2 className="text-3xl font-bold tracking-tight">{selectedSymbol}</h2>
                                                    <span className={cn(
                                                        "text-xs font-bold px-2 py-1 rounded-md",
                                                        priceInfo && priceInfo.change >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                                                    )}>
                                                        {priceInfo ? `${priceInfo.changePercent.toFixed(2)}%` : '...'}
                                                    </span>
                                                </div>
                                                <div className="text-4xl font-mono font-bold mt-2 text-foreground">
                                                    ₹{priceInfo ? priceInfo.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'Fetching...'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex bg-secondary p-1 rounded-xl border border-border space-x-1">
                                        {[
                                            { label: '1D', t: '5m', r: '1d' },
                                            { label: '5D', t: '15m', r: '5d' },
                                            { label: '1W', t: '30m', r: '1wk' },
                                            { label: '1M', t: '1h', r: '1mo' },
                                            { label: '6M', t: '1d', r: '6mo' },
                                            { label: '1Y', t: '1d', r: '1y' },
                                            { label: '5Y', t: '1wk', r: '5y' },
                                        ].map(opt => (
                                            <button
                                                key={opt.label}
                                                onClick={() => {
                                                    setChartInterval(opt.t)
                                                    setChartRange(opt.r)
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                                    chartRange === opt.r ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-neutral-500 hover:text-foreground"
                                                )}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-card rounded-3xl border border-border h-[550px] overflow-hidden shadow-2xl relative">
                                    <TradingViewChart
                                        key={`${selectedSymbol}-${chartInterval}-${chartRange}`}
                                        symbol={selectedSymbol}
                                        interval={chartInterval}
                                        range={chartRange}
                                        onError={setPriceError}
                                        isDarkMode={isDarkMode}
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 bg-card p-8 rounded-3xl border border-border">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6">Market Statistics (Real-Time)</h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                            {[
                                                { label: 'Last Update', val: priceInfo?.lastUpdated || '...' },
                                                { label: 'Price', val: `₹${priceInfo?.price.toFixed(2) || '...'}`, color: 'text-primary' },
                                                { label: 'Net Change', val: `₹${priceInfo?.change.toFixed(2) || '...'}`, color: 'text-red-500' },
                                                { label: 'Interval', val: chartInterval.toUpperCase() },
                                            ].map((item, i) => (
                                                <div key={i}>
                                                    <div className="text-[10px] text-neutral-500 uppercase font-black mb-1">{item.label}</div>
                                                    <div className={cn("font-mono font-bold text-lg", item.color)}>{item.val}</div>
                                                </div>
                                            ))}
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
                                                    "Analyzing {selectedSymbol}. Search suggestions now operational. Try searching for 'Reliance' or 'Tata'."
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Right Panel */}
                            <aside className="w-96 border-l border-border flex flex-col bg-card shrink-0">
                                <div className="p-8 border-b border-border">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-6 text-center">Execution Engine</h3>

                                    <div className="flex bg-secondary rounded-2xl p-1 mb-8 border border-border">
                                        <button onClick={() => setSide('buy')} className={cn("flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300", side === 'buy' ? "bg-green-600 text-white shadow-xl shadow-green-600/20" : "text-neutral-500 hover:text-foreground")}>BUY</button>
                                        <button onClick={() => setSide('sell')} className={cn("flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300", side === 'sell' ? "bg-red-600 text-white shadow-xl shadow-red-600/20" : "text-neutral-500 hover:text-foreground")}>SELL</button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex bg-secondary rounded-xl p-1 border border-border">
                                            {['market', 'limit'].map(t => (
                                                <button key={t} onClick={() => setOrderType(t as any)} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all", orderType === t ? "bg-background text-foreground shadow-md" : "text-neutral-500")}>{t}</button>
                                            ))}
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2 font-black">
                                                <label className="text-[10px] uppercase tracking-widest text-neutral-500">Quantity</label>
                                                <span className="text-[10px] text-primary">Max: {priceInfo ? Math.floor(balance / priceInfo.price) : 0}</span>
                                            </div>
                                            <div className="flex items-center bg-secondary rounded-2xl border border-border px-4 py-3 focus-within:border-primary/50 transition-all">
                                                <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="bg-transparent border-none focus:ring-0 w-full font-mono font-bold text-lg" />
                                                <div className="flex flex-col">
                                                    <button onClick={() => setQuantity(q => q + 1)} className="hover:text-primary transition-colors"><ChevronUp size={14} /></button>
                                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="hover:text-primary transition-colors"><ChevronDown size={14} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-border space-y-4">
                                            <div className="flex justify-between text-[11px] font-black text-neutral-500 uppercase">
                                                <span>Market Value</span>
                                                <span className="font-mono text-foreground font-bold">₹{priceInfo ? ((priceInfo.price || 0) * quantity).toLocaleString() : '...'}</span>
                                            </div>
                                            <button
                                                onClick={handlePlaceOrder}
                                                disabled={!priceInfo || isPriceLoading}
                                                className={cn(
                                                    "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all transform active:scale-95 shadow-2xl disabled:opacity-50",
                                                    side === 'buy' ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : "bg-red-600 hover:bg-red-700 shadow-red-600/20",
                                                    "text-white"
                                                )}
                                            >
                                                Place {side} order
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <div className="p-6 border-b border-border text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Live Market Watch</div>
                                    {['HDFCBANK.NS', 'RELIANCE.NS', 'SBIN.NS', 'TCS.NS', 'INFY.NS'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setSelectedSymbol(s)}
                                            className={cn(
                                                "w-full p-5 flex justify-between items-center hover:bg-primary/5 transition-all group border-r-4",
                                                selectedSymbol === s ? "bg-primary/10 border-primary" : "border-transparent"
                                            )}
                                        >
                                            <div className="flex flex-col items-start">
                                                <div className="font-bold text-sm group-hover:text-primary transition-colors text-foreground">{s}</div>
                                                <div className="text-[10px] text-neutral-500 font-bold uppercase">NSE · Equity</div>
                                            </div>
                                            <ChevronUp size={16} className="text-green-500 opacity-50" />
                                        </button>
                                    ))}
                                </div>
                            </aside>
                        </div>
                    )}

                    {activeTab === 'portfolio' && (
                        <section className="flex-1 overflow-y-auto p-12 space-y-12 bg-background">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight">Portfolio</h2>
                                    <p className="text-neutral-500 font-medium">Tracking assets in real-time.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-8">
                                {[
                                    { l: 'Balance', v: `₹${balance.toLocaleString()}`, c: 'text-primary' },
                                    { l: 'Holdings', v: `₹${positions.reduce((acc, p) => acc + (p.currentPrice * p.quantity), 0).toLocaleString()}`, c: 'text-foreground' },
                                    { l: 'Total P&L', v: `${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toLocaleString()}`, c: totalPnL >= 0 ? 'text-green-600' : 'text-red-600' },
                                    { l: 'Profit %', v: `${((totalPnL / 1000000) * 100).toFixed(2)}%`, c: 'text-purple-600' },
                                ].map((s, i) => (
                                    <div key={i} className="bg-card p-8 rounded-3xl border border-border">
                                        <div className="text-[10px] text-neutral-500 uppercase font-black mb-2">{s.l}</div>
                                        <div className={cn("text-2xl font-mono font-black", s.c)}>{s.v}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-secondary text-[10px] uppercase font-black text-neutral-500">
                                        <tr>
                                            <th className="px-8 py-6">Instrument</th>
                                            <th className="px-8 py-6">Qty</th>
                                            <th className="px-8 py-6 text-right">Cost</th>
                                            <th className="px-8 py-6 text-right">Price</th>
                                            <th className="px-8 py-6 text-right">P&L</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {positions.map(p => (
                                            <tr key={p.symbol} className="hover:bg-primary/5 transition-all">
                                                <td className="px-8 py-7 font-black text-foreground">{p.symbol}</td>
                                                <td className="px-8 py-7 font-mono font-bold text-neutral-500">{p.quantity}</td>
                                                <td className="px-8 py-7 text-right font-mono text-neutral-400">₹{p.averagePrice.toFixed(2)}</td>
                                                <td className="px-8 py-7 text-right font-mono font-black text-foreground">₹{p.currentPrice.toFixed(2)}</td>
                                                <td className={cn("px-8 py-7 text-right font-mono font-black", p.pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                                                    {p.pnl >= 0 ? '+' : ''}₹{p.pnl.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {activeTab === 'journal' && (
                        <section className="flex-1 p-12 overflow-y-auto space-y-6">
                            <h2 className="text-4xl font-black tracking-tight mb-12">Trade History</h2>
                            {trades.slice().reverse().map(t => (
                                <div key={t.id} className="bg-card p-8 rounded-3xl border border-border flex items-center justify-between group">
                                    <div className="flex items-center space-x-6">
                                        <div className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase", t.side === 'buy' ? "bg-green-600/10 text-green-600" : "bg-red-600/10 text-red-600")}>{t.side}</div>
                                        <div>
                                            <div className="font-black text-lg text-foreground">{t.symbol}</div>
                                            <div className="text-[10px] font-bold text-neutral-500 uppercase">{new Date(t.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-12">
                                        <div className="text-right">
                                            <div className="text-[10px] text-neutral-500 font-black uppercase mb-1">Price</div>
                                            <div className="font-mono font-black">₹{t.price.toFixed(2)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-neutral-500 font-black uppercase mb-1">Qty</div>
                                            <div className="font-mono font-black">{t.quantity}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {activeTab === 'ai' && <section className="flex-1 p-12 overflow-hidden flex flex-col"><div className="mb-8"><h2 className="text-3xl font-black">Market AI</h2></div><AIChatbot /></section>}
                    {activeTab === 'settings' && <section className="flex-1 p-12"><h2 className="text-3xl font-black">Settings</h2></section>}

                </div>
            </main>
        </div>
    )
}

export default App
