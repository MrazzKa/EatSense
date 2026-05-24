export const formatCalories = (calories: number): string => {
  return Math.round(calories).toString();
};

export const formatMacros = (value: number): string => {
  return Math.round(value).toString();
};

export const formatWeight = (weight: number): string => {
  return `${Math.round(weight)}g`;
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};