import { MethodTiming, TickStats } from "./tick-performance-tracker";

const BAR_WIDTH = 50; // Width of bar graph in characters
const GRAPH_WIDTH = 60; // Width of tick time graph in characters
const GRAPH_HEIGHT = 10; // Height of tick time graph in lines

/**
 * Renders a hierarchical tree view showing method performance percentages
 */
export function renderMethodBarGraph(methodStats: MethodTiming[]): void {
  if (methodStats.length === 0) {
    console.log("   (no data)");
    return;
  }

  // Flatten tree to find max percentage for scaling
  const flattenStats = (stats: MethodTiming[]): MethodTiming[] => {
    const result: MethodTiming[] = [];
    for (const stat of stats) {
      result.push(stat);
      if (stat.children.length > 0) {
        result.push(...flattenStats(stat.children));
      }
    }
    return result;
  };
  const allStats = flattenStats(methodStats);
  const maxPercentage = Math.max(...allStats.map((m) => m.percentage));

  // Recursive function to render tree
  const renderTree = (stats: MethodTiming[], prefix: string = "", isLast: boolean[] = []): void => {
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      const isLastItem = i === stats.length - 1;
      const currentPrefix = prefix + (isLastItem ? "└── " : "├── ");
      const nextPrefix = prefix + (isLastItem ? "    " : "│   ");

      // Calculate bar length
      const barLength = Math.round((stat.percentage / maxPercentage) * BAR_WIDTH);
      const bar = "█".repeat(barLength);
      const padding = " ".repeat(BAR_WIDTH - barLength);
      const colorCode = getColorForPercentage(stat.percentage);

      // Render this node
      console.log(
        `   ${currentPrefix}${stat.name.padEnd(20)} │${colorCode}${bar}${padding}\x1b[0m │ ${stat.percentage.toFixed(1)}% (${stat.averageTime.toFixed(2)}ms avg)`
      );

      // Render children recursively
      if (stat.children.length > 0) {
        renderTree(stat.children, nextPrefix, [...isLast, isLastItem]);
      }
    }
  };

  renderTree(methodStats);
}

/**
 * Renders a line graph showing tick time history with min/avg/max indicators
 * Similar to a stock ticker showing performance over time
 */
export function renderTickTimeGraph(history: number[], currentStats: TickStats): void {
  if (history.length === 0) {
    console.log("   (no data)");
    return;
  }

  // Calculate graph bounds with some padding
  const minValue = Math.min(...history, currentStats.min);
  const maxValue = Math.max(...history, currentStats.max);
  const padding = (maxValue - minValue) * 0.1 || 1; // 10% padding
  const graphMin = Math.max(0, minValue - padding);
  const graphMax = maxValue + padding;
  const range = graphMax - graphMin || 1; // Avoid division by zero

  // Create a grid for the graph
  const grid: string[][] = [];
  for (let i = 0; i < GRAPH_HEIGHT; i++) {
    grid[i] = new Array(GRAPH_WIDTH).fill(" ");
  }

  // Plot the data points
  const dataPoints = history.slice(-GRAPH_WIDTH); // Last N points
  const xStep = dataPoints.length > 1 ? (GRAPH_WIDTH - 1) / (dataPoints.length - 1) : 0;

  // Draw reference lines for min/avg/max first (so data points appear on top)
  const minY = GRAPH_HEIGHT - 1 - Math.round(((currentStats.min - graphMin) / range) * (GRAPH_HEIGHT - 1));
  const avgY = GRAPH_HEIGHT - 1 - Math.round(((currentStats.avg - graphMin) / range) * (GRAPH_HEIGHT - 1));
  const maxY = GRAPH_HEIGHT - 1 - Math.round(((currentStats.max - graphMin) / range) * (GRAPH_HEIGHT - 1));

  // Draw reference lines with different styles
  for (let x = 0; x < GRAPH_WIDTH; x++) {
    if (grid[minY] && grid[minY][x] === " ") {
      grid[minY][x] = "\x1b[32m─\x1b[0m"; // Green for min
    }
    if (grid[avgY] && grid[avgY][x] === " ") {
      grid[avgY][x] = "\x1b[33m─\x1b[0m"; // Yellow for avg
    }
    if (grid[maxY] && grid[maxY][x] === " ") {
      grid[maxY][x] = "\x1b[31m─\x1b[0m"; // Red for max
    }
  }

  // Plot data points
  for (let i = 0; i < dataPoints.length; i++) {
    const value = dataPoints[i];
    const x = Math.round(i * xStep);
    const y = GRAPH_HEIGHT - 1 - Math.round(((value - graphMin) / range) * (GRAPH_HEIGHT - 1));
    const clampedY = Math.max(0, Math.min(GRAPH_HEIGHT - 1, y));
    const clampedX = Math.max(0, Math.min(GRAPH_WIDTH - 1, x));

    // Use different characters based on proximity to min/avg/max
    const distToMin = Math.abs(value - currentStats.min);
    const distToAvg = Math.abs(value - currentStats.avg);
    const distToMax = Math.abs(value - currentStats.max);
    const threshold = range * 0.05; // 5% of range

    if (distToMin < threshold) {
      grid[clampedY][clampedX] = "\x1b[32m▁\x1b[0m"; // Green min indicator
    } else if (distToMax < threshold) {
      grid[clampedY][clampedX] = "\x1b[31m▇\x1b[0m"; // Red max indicator
    } else if (distToAvg < threshold) {
      grid[clampedY][clampedX] = "\x1b[33m●\x1b[0m"; // Yellow average indicator
    } else {
      grid[clampedY][clampedX] = "·"; // Regular data point
    }
  }

  // Print the graph with Y-axis labels
  const step = range / (GRAPH_HEIGHT - 1);
  for (let i = GRAPH_HEIGHT - 1; i >= 0; i--) {
    const yValue = graphMin + step * (GRAPH_HEIGHT - 1 - i);
    const label = yValue.toFixed(1).padStart(6);
    const line = grid[i].join("");
    console.log(`   ${label}ms │${line}│`);
  }

  // Print X-axis
  console.log(`   ${" ".repeat(7)}└${"─".repeat(GRAPH_WIDTH)}┘`);

  // Print legend with colors
  console.log(
    `   Legend: \x1b[32m▁\x1b[0m=Min (${currentStats.min.toFixed(2)}ms) │ \x1b[33m●\x1b[0m=Avg (${currentStats.avg.toFixed(2)}ms) │ \x1b[31m▇\x1b[0m=Max (${currentStats.max.toFixed(2)}ms)`
  );
}

/**
 * Renders a line graph showing bandwidth history with min/avg/max indicators
 * Similar to tick time graph but for bandwidth
 */
export function renderBandwidthGraph(history: number[], stats: { min: number; max: number; avg: number }): void {
  if (history.length === 0) {
    console.log("   (no data)");
    return;
  }

  // Calculate graph bounds with some padding
  const minValue = Math.min(...history, stats.min);
  const maxValue = Math.max(...history, stats.max);
  const padding = (maxValue - minValue) * 0.1 || 1; // 10% padding
  const graphMin = Math.max(0, minValue - padding);
  const graphMax = maxValue + padding;
  const range = graphMax - graphMin || 1; // Avoid division by zero

  // Create a grid for the graph
  const grid: string[][] = [];
  for (let i = 0; i < GRAPH_HEIGHT; i++) {
    grid[i] = new Array(GRAPH_WIDTH).fill(" ");
  }

  // Plot the data points
  const dataPoints = history.slice(-GRAPH_WIDTH); // Last N points
  const xStep = dataPoints.length > 1 ? (GRAPH_WIDTH - 1) / (dataPoints.length - 1) : 0;

  // Draw reference lines for min/avg/max first (so data points appear on top)
  const minY = GRAPH_HEIGHT - 1 - Math.round(((stats.min - graphMin) / range) * (GRAPH_HEIGHT - 1));
  const avgY = GRAPH_HEIGHT - 1 - Math.round(((stats.avg - graphMin) / range) * (GRAPH_HEIGHT - 1));
  const maxY = GRAPH_HEIGHT - 1 - Math.round(((stats.max - graphMin) / range) * (GRAPH_HEIGHT - 1));

  // Draw reference lines with different styles
  for (let x = 0; x < GRAPH_WIDTH; x++) {
    if (grid[minY] && grid[minY][x] === " ") {
      grid[minY][x] = "\x1b[32m─\x1b[0m"; // Green for min
    }
    if (grid[avgY] && grid[avgY][x] === " ") {
      grid[avgY][x] = "\x1b[33m─\x1b[0m"; // Yellow for avg
    }
    if (grid[maxY] && grid[maxY][x] === " ") {
      grid[maxY][x] = "\x1b[31m─\x1b[0m"; // Red for max
    }
  }

  // Plot data points
  for (let i = 0; i < dataPoints.length; i++) {
    const value = dataPoints[i];
    const x = Math.round(i * xStep);
    const y = GRAPH_HEIGHT - 1 - Math.round(((value - graphMin) / range) * (GRAPH_HEIGHT - 1));
    const clampedY = Math.max(0, Math.min(GRAPH_HEIGHT - 1, y));
    const clampedX = Math.max(0, Math.min(GRAPH_WIDTH - 1, x));

    // Use different characters based on proximity to min/avg/max
    const distToMin = Math.abs(value - stats.min);
    const distToAvg = Math.abs(value - stats.avg);
    const distToMax = Math.abs(value - stats.max);
    const threshold = range * 0.05; // 5% of range

    if (distToMin < threshold) {
      grid[clampedY][clampedX] = "\x1b[32m▁\x1b[0m"; // Green min indicator
    } else if (distToMax < threshold) {
      grid[clampedY][clampedX] = "\x1b[31m▇\x1b[0m"; // Red max indicator
    } else if (distToAvg < threshold) {
      grid[clampedY][clampedX] = "\x1b[33m●\x1b[0m"; // Yellow average indicator
    } else {
      grid[clampedY][clampedX] = "·"; // Regular data point
    }
  }

  // Print the graph with Y-axis labels (format bytes nicely)
  const step = range / (GRAPH_HEIGHT - 1);
  for (let i = GRAPH_HEIGHT - 1; i >= 0; i--) {
    const yValue = graphMin + step * (GRAPH_HEIGHT - 1 - i);
    const label = formatBytes(yValue).padStart(8);
    const line = grid[i].join("");
    console.log(`   ${label} │${line}│`);
  }

  // Print X-axis
  console.log(`   ${" ".repeat(9)}└${"─".repeat(GRAPH_WIDTH)}┘`);

  // Print legend with colors
  console.log(
    `   Legend: \x1b[32m▁\x1b[0m=Min (${formatBytes(stats.min)}) │ \x1b[33m●\x1b[0m=Avg (${formatBytes(stats.avg)}) │ \x1b[31m▇\x1b[0m=Max (${formatBytes(stats.max)})`
  );
}

/**
 * Format bytes to human-readable format (B, KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1) {
    // For values less than 1 byte, show as bytes with decimal
    return `${bytes.toFixed(2)} B`;
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Clamp i to valid array index
  const clampedI = Math.max(0, Math.min(i, sizes.length - 1));
  const value = bytes / Math.pow(k, clampedI);
  return `${value.toFixed(clampedI === 0 ? 0 : 1)} ${sizes[clampedI]}`;
}

/**
 * Returns ANSI color code based on percentage (green < 20%, yellow < 50%, red >= 50%)
 */
function getColorForPercentage(percentage: number): string {
  if (percentage < 20) {
    return "\x1b[32m"; // Green
  } else if (percentage < 50) {
    return "\x1b[33m"; // Yellow
  } else {
    return "\x1b[31m"; // Red
  }
}

