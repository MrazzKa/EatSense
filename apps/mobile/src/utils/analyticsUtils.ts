export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface AnalyticsUser {
  id: string;
  properties?: Record<string, any>;
}

export class Analytics {
  private static instance: Analytics;
  private events: AnalyticsEvent[] = [];
  private user: AnalyticsUser | null = null;
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setUser(user: AnalyticsUser): void {
    this.user = user;
  }

  getUser(): AnalyticsUser | null {
    return this.user;
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        userId: this.user?.id,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    };

    this.events.push(event);

    // In a real implementation, you would send this to your analytics service
    console.log('Analytics Event:', event);
  }

  identify(userId: string, properties?: Record<string, any>): void {
    this.setUser({
      id: userId,
      properties,
    });
  }

  alias(previousId: string, newId: string): void {
    this.track('User Alias', {
      previousId,
      newId,
    });
  }

  group(groupId: string, properties?: Record<string, any>): void {
    this.track('Group', {
      groupId,
      ...properties,
    });
  }

  page(name: string, properties?: Record<string, any>): void {
    this.track('Page View', {
      page: name,
      ...properties,
    });
  }

  screen(name: string, properties?: Record<string, any>): void {
    this.track('Screen View', {
      screen: name,
      ...properties,
    });
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  importEvents(events: string): void {
    try {
      const parsedEvents = JSON.parse(events);
      this.events = Array.isArray(parsedEvents) ? parsedEvents.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      })) : [];
    } catch (error) {
      console.error('Failed to import analytics events:', error);
    }
  }
}

export const analytics = Analytics.getInstance();

export const trackEvent = (name: string, properties?: Record<string, any>): void => {
  analytics.track(name, properties);
};

export const trackPage = (name: string, properties?: Record<string, any>): void => {
  analytics.page(name, properties);
};

export const trackScreen = (name: string, properties?: Record<string, any>): void => {
  analytics.screen(name, properties);
};

export const identifyUser = (userId: string, properties?: Record<string, any>): void => {
  analytics.identify(userId, properties);
};

export const aliasUser = (previousId: string, newId: string): void => {
  analytics.alias(previousId, newId);
};

export const groupUser = (groupId: string, properties?: Record<string, any>): void => {
  analytics.group(groupId, properties);
};

// Common analytics events
export const trackButtonClick = (buttonName: string, properties?: Record<string, any>): void => {
  trackEvent('Button Click', {
    button: buttonName,
    ...properties,
  });
};

export const trackFormSubmit = (formName: string, properties?: Record<string, any>): void => {
  trackEvent('Form Submit', {
    form: formName,
    ...properties,
  });
};

export const trackError = (error: string, properties?: Record<string, any>): void => {
  trackEvent('Error', {
    error,
    ...properties,
  });
};

export const trackPerformance = (metric: string, value: number, properties?: Record<string, any>): void => {
  trackEvent('Performance', {
    metric,
    value,
    ...properties,
  });
};

export const trackFeature = (feature: string, action: string, properties?: Record<string, any>): void => {
  trackEvent('Feature Usage', {
    feature,
    action,
    ...properties,
  });
};