export const buildUrl = (baseUrl: string, path: string, params?: Record<string, any>): string => {
  const url = new URL(path, baseUrl);
  
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
  }
  
  return url.toString();
};

export const parseUrl = (url: string): {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
} => {
  const urlObj = new URL(url);
  
  return {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port,
    pathname: urlObj.pathname,
    search: urlObj.search,
    hash: urlObj.hash,
  };
};

export const getQueryParams = (url: string): Record<string, string> => {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};
  
  for (const [key, value] of urlObj.searchParams.entries()) {
    params[key] = value;
  }
  
  return params;
};

export const setQueryParam = (url: string, key: string, value: string): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.set(key, value);
  return urlObj.toString();
};

export const removeQueryParam = (url: string, key: string): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.delete(key);
  return urlObj.toString();
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isAbsoluteUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://');
};

export const isRelativeUrl = (url: string): boolean => {
  return !isAbsoluteUrl(url);
};

export const resolveUrl = (baseUrl: string, relativeUrl: string): string => {
  if (isAbsoluteUrl(relativeUrl)) {
    return relativeUrl;
  }
  
  return new URL(relativeUrl, baseUrl).toString();
};

export const getDomain = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.hostname;
};

export const getPath = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.pathname;
};

export const getHash = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.hash;
};

export const removeHash = (url: string): string => {
  const urlObj = new URL(url);
  urlObj.hash = '';
  return urlObj.toString();
};

export const addHash = (url: string, hash: string): string => {
  const urlObj = new URL(url);
  urlObj.hash = hash;
  return urlObj.toString();
};

export const encodeUrl = (url: string): string => {
  return encodeURIComponent(url);
};

export const decodeUrl = (url: string): string => {
  return decodeURIComponent(url);
};

export const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    return '';
  }
};

export const getUrlWithoutParams = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
};

export const getUrlWithoutHash = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}`;
};

export const getUrlWithoutPath = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}`;
};

export const getUrlWithoutProtocol = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.host}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
};

export const getUrlWithoutHost = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
};

export const getUrlWithoutPort = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
};

export const getUrlWithoutSearch = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.hash}`;
};

export const getUrlWithoutPathname = (url: string): string => {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}${urlObj.search}${urlObj.hash}`;
};