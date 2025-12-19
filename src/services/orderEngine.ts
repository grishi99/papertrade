import { marketData } from './marketData';

export interface Order {
    id: string;
    symbol: string;
    type: 'market' | 'limit';
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    status: 'pending' | 'filled' | 'cancelled';
    timestamp: string;
}

export interface Position {
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
}

class OrderEngine {
    private static instance: OrderEngine;
    private orders: Order[] = [];
    private positions: Map<string, Position> = new Map();
    private balance: number = 1000000;

    private constructor() { }

    public static getInstance(): OrderEngine {
        if (!OrderEngine.instance) {
            OrderEngine.instance = new OrderEngine();
        }
        return OrderEngine.instance;
    }

    public async placeOrder(order: Omit<Order, 'id' | 'status' | 'timestamp' | 'price'>, limitPrice?: number): Promise<Order> {
        const currentPriceData = await marketData.getLatestPrice(order.symbol);
        const executionPrice = order.type === 'market' ? currentPriceData.price : limitPrice || currentPriceData.price;

        const newOrder: Order = {
            ...order,
            id: Math.random().toString(36).substr(2, 9),
            price: executionPrice,
            status: order.type === 'market' ? 'filled' : 'pending',
            timestamp: new Date().toISOString()
        };

        if (newOrder.status === 'filled') {
            this.updatePortfolio(newOrder);
        }

        this.orders.push(newOrder);
        return newOrder;
    }

    private updatePortfolio(order: Order) {
        const cost = order.price * order.quantity;
        if (order.side === 'buy') {
            this.balance -= cost;
            const existing = this.positions.get(order.symbol);
            if (existing) {
                const totalQty = existing.quantity + order.quantity;
                const totalCost = (existing.averagePrice * existing.quantity) + cost;
                this.positions.set(order.symbol, {
                    ...existing,
                    quantity: totalQty,
                    averagePrice: totalCost / totalQty
                });
            } else {
                this.positions.set(order.symbol, {
                    symbol: order.symbol,
                    quantity: order.quantity,
                    averagePrice: order.price,
                    currentPrice: order.price,
                    pnl: 0,
                    pnlPercent: 0
                });
            }
        } else {
            this.balance += cost;
            const existing = this.positions.get(order.symbol);
            if (existing) {
                const remainingQty = existing.quantity - order.quantity;
                if (remainingQty <= 0) {
                    this.positions.delete(order.symbol);
                } else {
                    this.positions.set(order.symbol, {
                        ...existing,
                        quantity: remainingQty
                    });
                }
            }
        }
    }

    public getBalance() { return this.balance; }
    public getPositions() { return Array.from(this.positions.values()); }
    public getOrders() { return this.orders; }
}

export const orderEngine = OrderEngine.getInstance();
