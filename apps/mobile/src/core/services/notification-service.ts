export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  analysisComplete: boolean;
  dailyReminder: boolean;
  weeklyReport: boolean;
  achievements: boolean;
}

export class NotificationService {
  async getNotifications(userId: string, _limit: number = 20): Promise<Notification[]> {
    // Mock implementation
    return [
      {
        id: '1',
        userId,
        type: 'success',
        title: 'Analysis Complete',
        message: 'Your food analysis is ready!',
        read: false,
        createdAt: new Date(),
      },
      {
        id: '2',
        userId,
        type: 'info',
        title: 'Daily Reminder',
        message: 'Don\'t forget to log your meals today!',
        read: false,
        createdAt: new Date(),
      },
    ];
  }

  async markAsRead(notificationId: string): Promise<void> {
    // Mock implementation
    console.log(`Marked notification ${notificationId} as read`);
  }

  async markAllAsRead(userId: string): Promise<void> {
    // Mock implementation
    console.log(`Marked all notifications for user ${userId} as read`);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    // Mock implementation
    console.log(`Deleted notification ${notificationId}`);
  }

  async sendNotification(userId: string, notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Promise<Notification> {
    // Mock implementation
    return {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      ...notification,
      read: false,
      createdAt: new Date(),
    };
  }

  async getNotificationPreferences(_userId: string): Promise<NotificationPreferences> {
    // Mock implementation
    return {
      email: true,
      push: true,
      analysisComplete: true,
      dailyReminder: true,
      weeklyReport: false,
      achievements: true,
    };
  }

  async updateNotificationPreferences(_userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    // Mock implementation
    return {
      email: true,
      push: true,
      analysisComplete: true,
      dailyReminder: true,
      weeklyReport: false,
      achievements: true,
      ...preferences,
    };
  }

  async sendPushNotification(userId: string, title: string, message: string, data?: any): Promise<void> {
    // Mock implementation
    console.log(`Push notification sent to user ${userId}: ${title} - ${message}`, data);
  }

  async sendEmailNotification(userId: string, subject: string, body: string): Promise<void> {
    // Mock implementation
    console.log(`Email notification sent to user ${userId}: ${subject}`, body);
  }
}

export const notificationService = new NotificationService();
