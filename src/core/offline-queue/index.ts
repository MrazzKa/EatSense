export interface OfflineQueueItem {
  id: string;
  action: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: number;
}

export class OfflineQueue {
  private queue: OfflineQueueItem[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000;

  add(action: string, payload: any, priority: number = 0): string {
    const id = Math.random().toString(36).substr(2, 9);
    const item: OfflineQueueItem = {
      id,
      action,
      payload,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.maxRetries,
      priority,
    };

    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    return id;
  }

  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.queue = [];
  }

  getItems(): OfflineQueueItem[] {
    return [...this.queue];
  }

  getItem(id: string): OfflineQueueItem | undefined {
    return this.queue.find(item => item.id === id);
  }

  async processQueue(processor: (_item: OfflineQueueItem) => Promise<boolean>): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];
        
        try {
          const success = await processor(item);
          
          if (success) {
            this.queue.shift();
          } else {
            item.retryCount++;
            
            if (item.retryCount >= item.maxRetries) {
              this.queue.shift();
            } else {
              await new Promise(resolve => setTimeout(resolve, this.retryDelay * item.retryCount));
            }
          }
        } catch {
          item.retryCount++;
          
          if (item.retryCount >= item.maxRetries) {
            this.queue.shift();
          } else {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * item.retryCount));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }

  setRetryDelay(delay: number): void {
    this.retryDelay = delay;
  }
}

export const offlineQueue = new OfflineQueue();
