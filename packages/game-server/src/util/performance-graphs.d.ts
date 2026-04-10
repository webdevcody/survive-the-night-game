import { MethodTiming, TickStats } from "./tick-performance-tracker";
/**
 * Renders a hierarchical tree view showing method performance percentages
 */
export declare function renderMethodBarGraph(methodStats: MethodTiming[]): void;
/**
 * Renders a line graph showing tick time history with min/avg/max indicators
 * Similar to a stock ticker showing performance over time
 */
export declare function renderTickTimeGraph(history: number[], currentStats: TickStats): void;
/**
 * Renders a line graph showing bandwidth history with min/avg/max indicators
 * Similar to tick time graph but for bandwidth
 */
export declare function renderBandwidthGraph(history: number[], stats: {
    min: number;
    max: number;
    avg: number;
}): void;
