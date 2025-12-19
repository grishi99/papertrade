
export const glossaryData = [
    {
        term: "RSI (Relative Strength Index)",
        definition: "A momentum oscillator that measures the speed and change of price movements. It ranges from 0 to 100.",
        tips: "Traditionally, RSI is considered overbought when above 70 and oversold when below 30."
    },
    {
        term: "Market Order",
        definition: "An order to buy or sell a stock immediately at the best available current price.",
        tips: "Use market orders when speed of execution is more important than price."
    },
    { term: "Limit Order", definition: "An order to buy or sell a stock at a specific price or better.", tips: "Ensures you don't pay more (or receive less) than your target price." },
    { term: "NSE", definition: "National Stock Exchange of India. The leading stock exchange in India, located in Mumbai.", tips: "NIFTY 50 is the flagship index of NSE." }
];

export const aiAssistantPrompt = `You are an educational AI assistant for PaperTrade, a paper trading app. 
Your goal is to help beginners understand the stock market, terms, and indicators. 
Do NOT provide financial advice. Focus on education.`;

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
