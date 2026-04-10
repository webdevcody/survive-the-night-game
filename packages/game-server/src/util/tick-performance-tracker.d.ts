import { EntityType } from "@/types/entity";
export interface MethodTiming {
    name: string;
    totalTime: number;
    callCount: number;
    averageTime: number;
    percentage: number;
    depth: number;
    parent?: string;
    children: MethodTiming[];
}
export interface EntityTiming {
    id: string;
    type: EntityType;
    totalTime: number;
    callCount: number;
    averageTime: number;
}
export interface EntityTypeTiming {
    type: EntityType;
    totalTime: number;
    callCount: number;
    averageTime: number;
    entityCount: number;
}
export interface TickStats {
    min: number;
    max: number;
    avg: number;
    count: number;
}
export interface SpikeInfo {
    tickTime: number;
    timestamp: number;
    methodTimings: Map<string, number>;
    entityTypeTimings: Map<EntityType, number>;
    gcTime?: number;
    heapUsedBefore?: number;
    heapUsedAfter?: number;
    dirtyEntityCount?: number;
    changedEntityCount?: number;
    totalEntityCount?: number;
}
export interface SpikeStats {
    count: number;
    totalSpikeTime: number;
    avgSpikeTime: number;
    maxSpikeTime: number;
    spikePercentage: number;
    topSlowMethodsDuringSpikes: Array<{
        name: string;
        avgTime: number;
        percentage: number;
    }>;
    topSlowEntityTypesDuringSpikes: Array<{
        type: EntityType;
        avgTime: number;
        percentage: number;
    }>;
    gcSpikes: number;
    gcSpikePercentage: number;
    avgGcTime: number;
}
export declare class TickPerformanceTracker {
    private methodTimings;
    private methodHierarchy;
    private entityTimings;
    private tickTimes;
    private tickTimeHistory;
    private bandwidthHistory;
    private lastReportTime;
    private readonly REPORT_INTERVAL;
    private readonly MAX_HISTORY_SIZE;
    private callStack;
    private spikes;
    private readonly SPIKE_THRESHOLD_MULTIPLIER;
    private readonly SPIKE_ABSOLUTE_THRESHOLD;
    private currentTickMethodTimings;
    private currentTickEntityTimings;
    private currentTickDirtyEntityCount;
    private currentTickChangedEntityCount;
    private currentTickTotalEntityCount;
    private lastHeapStats;
    private gcPauseTime;
    private gcEventCount;
    private gcTotalTime;
    private lastTickStartTime;
    constructor();
    startMethod(methodName: string, parentMethod?: string): () => void;
    startEntityUpdate(entityId: number, entityType: EntityType): () => void;
    recordBandwidth(bytesPerSecond: number): void;
    recordTick(totalTickTime: number): void;
    private calculateBandwidthStats;
    private reset;
    private generateReport;
    private calculateSpikeStats;
    private displayReports;
    recordDirtyEntities(dirtyEntityInfo: Array<{
        id: string;
        type: string;
        reason: string;
    }>, changedEntityCount?: number, totalEntityCount?: number): void;
    getTickStats(): TickStats | null;
    getMethodStats(): MethodTiming[];
}
