declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}

declare module '*.mp4' {
  const value: number;
  export default value;
}

declare module '@env' {
  export const EXPO_PUBLIC_API_BASE_URL: string;
}
