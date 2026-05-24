export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalAnalyses: number;
  dailyAnalyses: number;
  storageUsed: number;
  storageLimit: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  // Mock implementation
  return {
    totalUsers: 1250,
    activeUsers: 890,
    totalAnalyses: 15600,
    dailyAnalyses: 450,
    storageUsed: 2.5,
    storageLimit: 10,
  };
};

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  // Mock implementation
  return [
    {
      id: '1',
      email: 'admin@eatsense.ch',
      role: 'admin',
      createdAt: new Date('2024-01-01'),
      lastLoginAt: new Date(),
      isActive: true,
    },
    {
      id: '2',
      email: 'user@example.com',
      role: 'user',
      createdAt: new Date('2024-01-15'),
      lastLoginAt: new Date('2024-01-20'),
      isActive: true,
    },
  ];
};
