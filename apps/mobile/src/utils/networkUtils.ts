import NetInfo from '@react-native-community/netinfo';

export const isConnected = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
};

export const getConnectionType = async (): Promise<string> => {
  const state = await NetInfo.fetch();
  return state.type || 'unknown';
};

export const isWifi = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.type === 'wifi';
};

export const isCellular = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.type === 'cellular';
};