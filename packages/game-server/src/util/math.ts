export function getAverage(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function getStdDev(arr: number[]): number {
  const mean = getAverage(arr);
  return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length);
}

export function getMedian(arr: number[]): number {
  const sorted = arr.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function getStats(arr: number[]): { mean: number; median: number; stdDev: number } {
  return {
    mean: getAverage(arr),
    median: getMedian(arr),
    stdDev: getStdDev(arr),
  };
}
