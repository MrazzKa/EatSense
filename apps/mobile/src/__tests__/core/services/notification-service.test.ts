import { describe, it, expect, jest } from '@jest/globals';
import { NotificationService } from '../../../core/services/notification-service';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  it('should get notifications', async () => {
    const result = await notificationService.getNotifications('user1', 20);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('success');
    expect(result[0].title).toBe('Analysis Complete');
    expect(result[1].type).toBe('info');
    expect(result[1].title).toBe('Daily Reminder');
  });

  it('should mark notification as read', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await notificationService.markAsRead('notification1');
    
    expect(consoleSpy).toHaveBeenCalledWith('Marked notification notification1 as read');
    
    consoleSpy.mockRestore();
  });

  it('should mark all notifications as read', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await notificationService.markAllAsRead('user1');
    
    expect(consoleSpy).toHaveBeenCalledWith('Marked all notifications for user user1 as read');
    
    consoleSpy.mockRestore();
  });

  it('should delete notification', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await notificationService.deleteNotification('notification1');
    
    expect(consoleSpy).toHaveBeenCalledWith('Deleted notification notification1');
    
    consoleSpy.mockRestore();
  });

  it('should send notification', async () => {
    const result = await notificationService.sendNotification('user1', {
      type: 'info',
      title: 'Test Notification',
      message: 'Test message',
    });

    expect(result.userId).toBe('user1');
    expect(result.type).toBe('info');
    expect(result.title).toBe('Test Notification');
    expect(result.message).toBe('Test message');
    expect(result.read).toBe(false);
  });

  it('should get notification preferences', async () => {
    const result = await notificationService.getNotificationPreferences('user1');
    expect(result.email).toBe(true);
    expect(result.push).toBe(true);
    expect(result.analysisComplete).toBe(true);
    expect(result.dailyReminder).toBe(true);
    expect(result.weeklyReport).toBe(false);
    expect(result.achievements).toBe(true);
  });

  it('should update notification preferences', async () => {
    const result = await notificationService.updateNotificationPreferences('user1', {
      email: false,
      push: false,
    });

    expect(result.email).toBe(false);
    expect(result.push).toBe(false);
    expect(result.analysisComplete).toBe(true);
  });

  it('should send push notification', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await notificationService.sendPushNotification('user1', 'Test Title', 'Test message');
    
    expect(consoleSpy).toHaveBeenCalledWith('Push notification sent to user user1: Test Title - Test message');
    
    consoleSpy.mockRestore();
  });

  it('should send email notification', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await notificationService.sendEmailNotification('user1', 'Test Subject', 'Test body');
    
    expect(consoleSpy).toHaveBeenCalledWith('Email notification sent to user user1: Test Subject');
    
    consoleSpy.mockRestore();
  });
});
