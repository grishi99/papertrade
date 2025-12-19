import { useState, useEffect, useRef } from 'react'
import { Send, User, Bot, Sparkles } from 'lucide-react'
import { aiAssistantPrompt, ChatMessage } from '../services/aiService'

export const AIChatbot = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hi! I'm your PaperTrade AI guide. Want to learn about a specific indicator or order type?" }
    ])
    const [input, setInput] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = () => {
        if (!input.trim()) return

        const userMsg: ChatMessage = { role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')

        // Simulated AI response
        setTimeout(() => {
            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: `That's a great question! For now, I'm in "Educational Demo" mode. In the full version, I'll use Gemini or OpenAI to explain "${input}" in detail using real-time market data.`
            }
            setMessages(prev => [...prev, assistantMsg])
        }, 1000)
    }

    return (
        <div className="flex flex-col h-full bg-card/30 rounded-3xl border border-border/50 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border/50 bg-primary/5 flex items-center space-x-3">
                <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Sparkles className="text-white size-5" />
                </div>
                <div>
                    <h3 className="font-bold text-sm">Educational Assistant</h3>
                    <div className="flex items-center space-x-1.5">
                        <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">AI Online</span>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex space-x-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`size-8 rounded-lg shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-secondary' : 'bg-primary/20'}`}>
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-primary" />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-white shadow-xl shadow-primary/10' : 'bg-secondary/50 border border-border/50'}`}>
                                {m.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 border-t border-border/50 bg-background/50">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ask anything (e.g., 'What is Margin?')"
                        className="w-full bg-secondary/50 border border-border/50 rounded-2xl pl-6 pr-14 py-4 focus:ring-2 focus:ring-primary/20 transition-all focus:outline-none placeholder:text-neutral-600 focus:border-primary/50 text-sm"
                    />
                    <button
                        onClick={handleSend}
                        className="absolute right-3 top-1/2 -translate-y-1/2 size-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-600 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
