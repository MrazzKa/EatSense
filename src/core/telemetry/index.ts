export interface TelemetryEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  debugMode: boolean;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
}

export const defaultTelemetryConfig: TelemetryConfig = {
  enabled: true,
  debugMode: __DEV__,
  batchSize: 10,
  flushInterval: 5000, // 5 seconds
  maxRetries: 3,
};

export class TelemetryManager {
  private config: TelemetryConfig;
  private events: TelemetryEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: TelemetryConfig = defaultTelemetryConfig) {
    this.config = config;
    this.sessionId = Math.random().toString(36).substr(2, 9);
    
    if (config.enabled) {
      this.startFlushTimer();
    }
  }

  track(event: TelemetryEvent): void {
    if (!this.config.enabled) return;
    
    const enrichedEvent: TelemetryEvent = {
      ...event,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: event.timestamp || new Date(),
    };
    
    this.events.push(enrichedEvent);
    
    if (this.config.debugMode) {
      console.log('Telemetry Event:', enrichedEvent);
    }
    
    if (this.events.length >= this.config.batchSize) {
      void this.flush();
    }
  }

  trackScreenView(screenName: string, properties?: Record<string, any>): void {
    this.track({
      name: 'screen_view',
      properties: {
        screen_name: screenName,
        ...properties,
      },
      timestamp: new Date(),
    });
  }

  trackUserAction(action: string, properties?: Record<string, any>): void {
    this.track({
      name: 'user_action',
      properties: {
        action,
        ...properties,
      },
      timestamp: new Date(),
    });
  }

  trackError(error: string, properties?: Record<string, any>): void {
    this.track({
      name: 'error',
      properties: {
        error,
        ...properties,
      },
      timestamp: new Date(),
    });
  }

  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    this.track({
      name: 'performance',
      properties: {
        metric,
        value,
        ...properties,
      },
      timestamp: new Date(),
    });
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return;
    
    const eventsToFlush = [...this.events];
    this.events = [];
    
    try {
      await this.sendEvents(eventsToFlush);
    } catch (error) {
      console.error('Failed to send telemetry events:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToFlush);
    }
  }

  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    // Mock implementation - in production, send to analytics service
    console.log(`Sending ${events.length} telemetry events`);
  }

  destroy(): void {
    this.stopFlushTimer();
    void this.flush();
  }
}

export const telemetryManager = new TelemetryManager();
