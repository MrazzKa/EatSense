import { describe, it, expect, jest } from '@jest/globals';
import { UserService } from '../../../core/services/user-service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  it('should get user by id', async () => {
    const result = await userService.getUser('user1');
    expect(result).toBeDefined();
    expect(result?.id).toBe('user1');
    expect(result?.email).toBe('user@example.com');
  });

  it('should update user', async () => {
    const result = await userService.updateUser('user1', {
      name: 'Updated Name',
      preferences: {
        language: 'en',
        units: 'metric',
        notifications: {
          email: true,
          push: true,
          analysisComplete: true,
          dailyReminder: true,
        },
        privacy: {
          shareData: false,
          analytics: true,
        },
      },
    });

    expect(result.name).toBe('Updated Name');
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should delete user', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await userService.deleteUser('user1');
    
    expect(consoleSpy).toHaveBeenCalledWith('Deleted user user1');
    
    consoleSpy.mockRestore();
  });

  it('should get user stats', async () => {
    const result = await userService.getUserStats('user1');
    expect(result).toBeDefined();
    expect(result.totalAnalyses).toBe(45);
    expect(result.totalCalories).toBe(6750);
    expect(result.averageCaloriesPerDay).toBe(2250);
  });

  it('should export user data', async () => {
    const result = await userService.exportUserData('user1');
    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.analyses).toEqual([]);
    expect(result.journalEntries).toEqual([]);
    expect(result.stats).toBeDefined();
  });
});
