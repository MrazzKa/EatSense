export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password?: string;
  magicLinkToken?: string;
}

export interface RegisterRequest {
  email: string;
  name?: string;
}

export const login = async (request: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> => {
  // Mock implementation
  return {
    user: {
      id: '1',
      email: request.email,
      name: 'John Doe',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      lastLoginAt: new Date(),
    },
    tokens: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    },
  };
};

export const register = async (request: RegisterRequest): Promise<User> => {
  // Mock implementation
  return {
    id: '1',
    email: request.email,
    name: request.name,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEmailVerified: false,
  };
};

export const sendMagicLink = async (email: string): Promise<void> => {
  // Mock implementation
  console.log(`Magic link sent to ${email}`);
};

export const refreshTokens = async (_refreshToken: string): Promise<AuthTokens> => {
  // Mock implementation
  return {
    accessToken: 'new-mock-access-token',
    refreshToken: 'new-mock-refresh-token',
    expiresIn: 3600,
  };
};
