import { ENABLE_PERFORMANCE_MONITORING } from "@/config/config";
import { renderTickTimeGraph, renderBandwidthGraph } from "./performance-graphs";
import * as v8 from "v8";
export class TickPerformanceTracker {
    constructor() {
        this.methodTimings = new Map();
        this.methodHierarchy = new Map();
        this.entityTimings = new Map();
        this.tickTimes = [];
        this.tickTimeHistory = []; // For graph display
        this.bandwidthHistory = []; // For bandwidth graph display
        this.lastReportTime = performance.now();
        this.REPORT_INTERVAL = 30000; // 5 seconds
        this.MAX_HISTORY_SIZE = 50; // Max data points for graph
        this.callStack = []; // Track nested method calls
        this.spikes = []; // Track performance spikes
        this.SPIKE_THRESHOLD_MULTIPLIER = 2.0; // Spike if tick time > 2x average
        this.SPIKE_ABSOLUTE_THRESHOLD = 10; // Or if tick time > 10ms
        this.currentTickMethodTimings = new Map(); // Track methods for current tick
        this.currentTickEntityTimings = new Map(); // Track entity types for current tick
        this.currentTickDirtyEntityCount = 0; // Track dirty entity count for current tick
        this.currentTickChangedEntityCount = 0; // Track changed entity count for current tick
        this.currentTickTotalEntityCount = 0; // Track total entity count for current tick
        this.lastHeapStats = null; // Track heap stats to detect GC
        this.gcPauseTime = 0; // Track GC pause time
        this.gcEventCount = 0; // Track number of GC events detected
        this.gcTotalTime = 0; // Track total estimated GC time
        this.lastTickStartTime = 0; // Track when tick started for GC detection
        if (!ENABLE_PERFORMANCE_MONITORING) {
            // Return early - all methods will be no-ops
            return;
        }
        // Initialize heap stats
        this.lastHeapStats = v8.getHeapStatistics();
    }
    startMethod(methodName, parentMethod) {
        var _a;
        if (!ENABLE_PERFORMANCE_MONITORING) {
            return () => { }; // No-op when disabled
        }
        // Determine parent from call stack if not provided
        const parent = parentMethod ||
            (this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : undefined);
        const depth = parent ? (((_a = this.methodHierarchy.get(parent)) === null || _a === void 0 ? void 0 : _a.depth) || 0) + 1 : 0;
        // Store hierarchy info
        if (!this.methodHierarchy.has(methodName)) {
            this.methodHierarchy.set(methodName, { parent, depth });
        }
        // Push onto call stack
        this.callStack.push(methodName);
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            const timings = this.methodTimings.get(methodName) || [];
            timings.push(duration);
            this.methodTimings.set(methodName, timings);
            // Pop from call stack
            this.callStack.pop();
        };
    }
    startEntityUpdate(entityId, entityType) {
        if (!ENABLE_PERFORMANCE_MONITORING) {
            return () => { }; // No-op when disabled
        }
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            const entityData = this.entityTimings.get(entityId) || { type: entityType, times: [] };
            entityData.times.push(duration);
            this.entityTimings.set(entityId, entityData);
            // Track for current tick (for spike analysis)
            const currentTotal = this.currentTickEntityTimings.get(entityType) || 0;
            this.currentTickEntityTimings.set(entityType, currentTotal + duration);
        };
    }
    recordBandwidth(bytesPerSecond) {
        if (!ENABLE_PERFORMANCE_MONITORING) {
            return;
        }
        this.bandwidthHistory.push(bytesPerSecond);
        // Limit history size
        if (this.bandwidthHistory.length > this.MAX_HISTORY_SIZE) {
            this.bandwidthHistory.shift();
        }
    }
    recordTick(totalTickTime) {
        var _a;
        if (!ENABLE_PERFORMANCE_MONITORING) {
            return;
        }
        // Track GC by monitoring heap statistics with improved detection
        const heapStats = v8.getHeapStatistics();
        let gcTime = 0;
        let heapUsedBefore = (_a = this.lastHeapStats) === null || _a === void 0 ? void 0 : _a.used_heap_size;
        let heapUsedAfter = heapStats.used_heap_size;
        // Enhanced GC detection with multiple indicators
        if (this.lastHeapStats) {
            const heapDelta = this.lastHeapStats.used_heap_size - heapStats.used_heap_size;
            const heapSizeDelta = heapStats.total_heap_size - this.lastHeapStats.total_heap_size;
            const externalDelta = heapStats.external_memory - this.lastHeapStats.external_memory;
            const heapTotalDelta = heapStats.total_heap_size - this.lastHeapStats.total_heap_size;
            // Multiple GC indicators for better detection:
            // 1. Heap used decreased significantly (>100KB suggests GC, >500KB suggests major GC)
            // 2. Total heap size decreased (heap was compacted)
            // 3. Number of heap spaces changed (indicates GC compaction)
            // 4. External memory decreased (external object cleanup)
            const heapFreedKB = heapDelta / 1024;
            const majorGCThreshold = 512 * 1024; // 512KB for major GC
            const minorGCThreshold = 100 * 1024; // 100KB for minor GC
            const likelyMajorGC = heapDelta > majorGCThreshold;
            const likelyMinorGC = heapDelta > minorGCThreshold && heapDelta <= majorGCThreshold;
            const heapCompacted = heapSizeDelta < 0 && heapDelta > 0;
            const externalCleaned = externalDelta < -50 * 1024; // External memory freed
            const likelyGC = likelyMajorGC || likelyMinorGC || heapCompacted || externalCleaned;
            if (likelyGC) {
                this.gcEventCount++;
                // Improved GC time estimation:
                // - For major GC: estimate based on heap freed and tick time
                // - For minor GC: estimate based on tick time spike
                // - Cap at reasonable fraction of tick time (max 80%)
                if (likelyMajorGC && totalTickTime > 5) {
                    const heapFreedMB = heapFreedKB / 1024;
                    // Major GC: ~2-10ms per MB freed, but proportional to actual tick time
                    gcTime = Math.min(totalTickTime * 0.8, Math.max(2, heapFreedMB * 5));
                }
                else if (likelyMinorGC && totalTickTime > 2) {
                    // Minor GC: typically 1-5ms, estimate based on tick time spike
                    gcTime = Math.min(totalTickTime * 0.6, Math.max(1, totalTickTime * 0.3));
                }
                else if (heapCompacted && totalTickTime > 3) {
                    // Compaction GC: estimate based on tick time
                    gcTime = Math.min(totalTickTime * 0.5, Math.max(1, totalTickTime * 0.2));
                }
                this.gcTotalTime += gcTime;
            }
        }
        this.lastHeapStats = heapStats;
        // Check if this is a spike (before adding to array, so we compare against previous average)
        const previousAvgTickTime = this.tickTimes.length > 0
            ? this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length
            : totalTickTime;
        const isSpike = totalTickTime >
            Math.max(previousAvgTickTime * this.SPIKE_THRESHOLD_MULTIPLIER, this.SPIKE_ABSOLUTE_THRESHOLD);
        this.tickTimes.push(totalTickTime);
        this.tickTimeHistory.push(totalTickTime);
        if (isSpike) {
            // Capture spike information with diagnostic data
            const spikeInfo = {
                tickTime: totalTickTime,
                timestamp: Date.now(),
                methodTimings: new Map(this.currentTickMethodTimings),
                entityTypeTimings: new Map(this.currentTickEntityTimings),
                gcTime: gcTime > 0 ? gcTime : undefined,
                heapUsedBefore,
                heapUsedAfter,
                dirtyEntityCount: this.currentTickDirtyEntityCount > 0 ? this.currentTickDirtyEntityCount : undefined,
                changedEntityCount: this.currentTickChangedEntityCount > 0 ? this.currentTickChangedEntityCount : undefined,
                totalEntityCount: this.currentTickTotalEntityCount > 0 ? this.currentTickTotalEntityCount : undefined,
            };
            this.spikes.push(spikeInfo);
            // Limit spike history
            if (this.spikes.length > 100) {
                this.spikes.shift();
            }
        }
        // Clear current tick tracking
        this.currentTickMethodTimings.clear();
        this.currentTickEntityTimings.clear();
        this.currentTickDirtyEntityCount = 0;
        this.currentTickChangedEntityCount = 0;
        this.currentTickTotalEntityCount = 0;
        // Limit history size
        if (this.tickTimeHistory.length > this.MAX_HISTORY_SIZE) {
            this.tickTimeHistory.shift();
        }
        // Check if it's time to report
        const now = performance.now();
        if (now - this.lastReportTime >= this.REPORT_INTERVAL) {
            this.generateReport();
            this.reset();
            this.lastReportTime = now;
        }
    }
    calculateBandwidthStats() {
        if (this.bandwidthHistory.length === 0) {
            return null;
        }
        const min = Math.min(...this.bandwidthHistory);
        const max = Math.max(...this.bandwidthHistory);
        const avg = this.bandwidthHistory.reduce((a, b) => a + b, 0) / this.bandwidthHistory.length;
        return { min, max, avg };
    }
    reset() {
        this.methodTimings.clear();
        this.methodHierarchy.clear();
        this.entityTimings.clear();
        this.tickTimes = [];
        this.callStack = [];
        // Reset GC tracking for next reporting period
        this.gcEventCount = 0;
        this.gcTotalTime = 0;
        // Keep bandwidth history for graph continuity
        // Keep spikes for analysis across reporting periods
        // Only clear if we have too many
        if (this.spikes.length > 200) {
            this.spikes = this.spikes.slice(-100);
        }
    }
    generateReport() {
        if (!ENABLE_PERFORMANCE_MONITORING) {
            return;
        }
        const totalTicks = this.tickTimes.length;
        if (totalTicks === 0) {
            return;
        }
        // Calculate method statistics with hierarchy
        const methodStatsMap = new Map();
        const totalTickTime = this.tickTimes.reduce((a, b) => a + b, 0);
        const avgTickTime = totalTickTime / totalTicks;
        // First pass: create all method stats
        for (const [methodName, times] of this.methodTimings.entries()) {
            const totalTime = times.reduce((a, b) => a + b, 0);
            const averageTime = totalTime / times.length;
            const percentage = (totalTime / totalTickTime) * 100;
            // Only include methods with > 0% time
            if (percentage > 0) {
                const hierarchy = this.methodHierarchy.get(methodName) || { parent: undefined, depth: 0 };
                methodStatsMap.set(methodName, {
                    name: methodName,
                    totalTime,
                    callCount: times.length,
                    averageTime,
                    percentage,
                    depth: hierarchy.depth,
                    parent: hierarchy.parent,
                    children: [],
                });
            }
        }
        // Second pass: build parent-child relationships
        const methodStats = [];
        for (const [methodName, stat] of methodStatsMap.entries()) {
            if (stat.parent && methodStatsMap.has(stat.parent)) {
                methodStatsMap.get(stat.parent).children.push(stat);
            }
            else {
                methodStats.push(stat);
            }
        }
        // Sort children within each parent
        const sortChildren = (stats) => {
            stats.sort((a, b) => b.percentage - a.percentage);
            for (const stat of stats) {
                if (stat.children.length > 0) {
                    sortChildren(stat.children);
                }
            }
        };
        sortChildren(methodStats);
        // Calculate entity type statistics (aggregated by type)
        const entityTypeStatsMap = new Map();
        for (const [entityId, data] of this.entityTimings.entries()) {
            const totalTime = data.times.reduce((a, b) => a + b, 0);
            const callCount = data.times.length;
            if (!entityTypeStatsMap.has(data.type)) {
                entityTypeStatsMap.set(data.type, {
                    totalTime: 0,
                    callCount: 0,
                    entityIds: new Set(),
                });
            }
            const stats = entityTypeStatsMap.get(data.type);
            stats.totalTime += totalTime;
            stats.callCount += callCount;
            stats.entityIds.add(entityId);
        }
        // Convert to EntityTypeTiming array
        const entityTypeStats = [];
        for (const [type, stats] of entityTypeStatsMap.entries()) {
            const averageTime = stats.totalTime / stats.callCount;
            // Calculate average total time per tick (total time across all entities of this type per tick)
            const avgTotalTimePerTick = stats.totalTime / totalTicks;
            entityTypeStats.push({
                type,
                totalTime: avgTotalTimePerTick, // Store average per tick instead of cumulative
                callCount: stats.callCount,
                averageTime,
                entityCount: stats.entityIds.size,
            });
        }
        // Sort entity types by total time per tick descending (most impactful per tick)
        entityTypeStats.sort((a, b) => b.totalTime - a.totalTime);
        // Calculate tick statistics
        const tickStats = {
            min: Math.min(...this.tickTimes),
            max: Math.max(...this.tickTimes),
            avg: avgTickTime,
            count: totalTicks,
        };
        // Calculate spike statistics
        const spikeStats = this.calculateSpikeStats(totalTicks, avgTickTime);
        // Generate and display reports
        this.displayReports(methodStats, entityTypeStats, tickStats, spikeStats);
    }
    calculateSpikeStats(totalTicks, avgTickTime) {
        if (this.spikes.length === 0) {
            return null;
        }
        // Analyze spikes from recent reporting period (last 5 seconds worth)
        const recentSpikes = this.spikes.filter((spike) => Date.now() - spike.timestamp < this.REPORT_INTERVAL * 2);
        if (recentSpikes.length === 0) {
            return null;
        }
        const spikeTimes = recentSpikes.map((s) => s.tickTime);
        const totalSpikeTime = spikeTimes.reduce((a, b) => a + b, 0);
        const avgSpikeTime = totalSpikeTime / recentSpikes.length;
        const maxSpikeTime = Math.max(...spikeTimes);
        const spikePercentage = (recentSpikes.length / totalTicks) * 100;
        // Aggregate method timings across all spikes
        const methodSpikeTotals = new Map();
        const methodSpikeCounts = new Map();
        for (const spike of recentSpikes) {
            for (const [methodName, time] of spike.methodTimings.entries()) {
                methodSpikeTotals.set(methodName, (methodSpikeTotals.get(methodName) || 0) + time);
                methodSpikeCounts.set(methodName, (methodSpikeCounts.get(methodName) || 0) + 1);
            }
        }
        // Calculate top slow methods during spikes
        const topSlowMethods = [];
        for (const [methodName, totalTime] of methodSpikeTotals.entries()) {
            const count = methodSpikeCounts.get(methodName) || 1;
            const avgTime = totalTime / count;
            const percentage = (totalTime / totalSpikeTime) * 100;
            topSlowMethods.push({ name: methodName, avgTime, percentage });
        }
        topSlowMethods.sort((a, b) => b.avgTime - a.avgTime);
        // Aggregate entity type timings across all spikes
        const entityTypeSpikeTotals = new Map();
        const entityTypeSpikeCounts = new Map();
        for (const spike of recentSpikes) {
            for (const [entityType, time] of spike.entityTypeTimings.entries()) {
                entityTypeSpikeTotals.set(entityType, (entityTypeSpikeTotals.get(entityType) || 0) + time);
                entityTypeSpikeCounts.set(entityType, (entityTypeSpikeCounts.get(entityType) || 0) + 1);
            }
        }
        // Calculate top slow entity types during spikes
        const topSlowEntityTypes = [];
        for (const [entityType, totalTime] of entityTypeSpikeTotals.entries()) {
            const count = entityTypeSpikeCounts.get(entityType) || 1;
            const avgTime = totalTime / count;
            const percentage = (totalTime / totalSpikeTime) * 100;
            topSlowEntityTypes.push({ type: entityType, avgTime, percentage });
        }
        topSlowEntityTypes.sort((a, b) => b.avgTime - a.avgTime);
        // Calculate GC statistics
        const gcSpikes = recentSpikes.filter((s) => s.gcTime && s.gcTime > 0);
        const gcSpikePercentage = recentSpikes.length > 0 ? (gcSpikes.length / recentSpikes.length) * 100 : 0;
        const gcTimes = gcSpikes.map((s) => s.gcTime).filter((t) => t > 0);
        const avgGcTime = gcTimes.length > 0 ? gcTimes.reduce((a, b) => a + b, 0) / gcTimes.length : 0;
        return {
            count: recentSpikes.length,
            totalSpikeTime,
            avgSpikeTime,
            maxSpikeTime,
            spikePercentage,
            topSlowMethodsDuringSpikes: topSlowMethods.slice(0, 5),
            topSlowEntityTypesDuringSpikes: topSlowEntityTypes.slice(0, 5),
            gcSpikes: gcSpikes.length,
            gcSpikePercentage,
            avgGcTime,
        };
    }
    displayReports(methodStats, entityTypeStats, tickStats, spikeStats) {
        console.log("\n" + "=".repeat(80));
        console.log("📊 PERFORMANCE REPORT (Last 5 seconds)");
        console.log("=".repeat(80));
        // Display tick statistics
        console.log("\n⏱️  Tick Statistics:");
        console.log(`   Total Ticks: ${tickStats.count}`);
        console.log(`   Avg Tick Time: ${tickStats.avg.toFixed(2)}ms`);
        console.log(`   Min Tick Time: ${tickStats.min.toFixed(2)}ms`);
        console.log(`   Max Tick Time: ${tickStats.max.toFixed(2)}ms`);
        // Display spike statistics if any spikes occurred
        if (spikeStats) {
            console.log("\n⚠️  Performance Spike Analysis:");
            console.log(`   Spikes Detected: ${spikeStats.count} (${spikeStats.spikePercentage.toFixed(1)}% of ticks)`);
            console.log(`   Avg Spike Time: ${spikeStats.avgSpikeTime.toFixed(2)}ms`);
            console.log(`   Max Spike Time: ${spikeStats.maxSpikeTime.toFixed(2)}ms`);
            if (spikeStats.topSlowMethodsDuringSpikes.length > 0) {
                console.log(`   Top Slow Methods During Spikes:`);
                spikeStats.topSlowMethodsDuringSpikes.forEach((method, index) => {
                    console.log(`      ${index + 1}. ${method.name}: ${method.avgTime.toFixed(2)}ms avg (${method.percentage.toFixed(1)}% of spike time)`);
                });
            }
            if (spikeStats.topSlowEntityTypesDuringSpikes.length > 0) {
                console.log(`   Top Slow Entity Types During Spikes:`);
                spikeStats.topSlowEntityTypesDuringSpikes.forEach((entityType, index) => {
                    console.log(`      ${index + 1}. ${entityType.type}: ${entityType.avgTime.toFixed(2)}ms avg (${entityType.percentage.toFixed(1)}% of spike time)`);
                });
            }
            // Display GC information
            console.log(`\n🗑️  Garbage Collection Analysis:`);
            if (spikeStats.gcSpikes > 0) {
                console.log(`   GC Detected During: ${spikeStats.gcSpikes} spikes (${spikeStats.gcSpikePercentage.toFixed(1)}% of spikes)`);
                console.log(`   Avg GC Time During Spikes: ${spikeStats.avgGcTime.toFixed(2)}ms`);
                console.log(`   GC Contribution: ~${((spikeStats.avgGcTime / spikeStats.avgSpikeTime) * 100).toFixed(1)}% of average spike time`);
                console.log(`   ⚠️  Note: GC time is estimated. For accurate GC timing, run with: node --trace-gc`);
            }
            else {
                console.log(`   No GC detected during spikes (spikes likely caused by other factors)`);
                console.log(`   💡 Tip: For detailed GC analysis, run with: node --trace-gc --trace-gc-verbose`);
            }
            // Display overall GC statistics for the reporting period
            if (this.gcEventCount > 0) {
                const avgGcTime = this.gcTotalTime / this.gcEventCount;
                const gcPercentage = (this.gcTotalTime / (tickStats.avg * tickStats.count)) * 100;
                console.log(`\n   Overall GC Statistics (Last ${tickStats.count} ticks):`);
                console.log(`   Total GC Events: ${this.gcEventCount}`);
                console.log(`   Avg GC Time: ${avgGcTime.toFixed(2)}ms per event`);
                console.log(`   GC Contribution: ~${gcPercentage.toFixed(1)}% of total tick time`);
            }
            else {
                console.log(`\n   No GC events detected in this reporting period`);
            }
            // Display diagnostic information about spikes
            console.log(`\n📊 Spike Diagnostics:`);
            const recentSpikes = this.spikes.filter((spike) => Date.now() - spike.timestamp < this.REPORT_INTERVAL * 2);
            if (recentSpikes.length > 0) {
                const spikesWithDirtyCount = recentSpikes.filter((s) => s.dirtyEntityCount !== undefined);
                const spikesWithChangedCount = recentSpikes.filter((s) => s.changedEntityCount !== undefined);
                const spikesWithTotalCount = recentSpikes.filter((s) => s.totalEntityCount !== undefined);
                if (spikesWithDirtyCount.length > 0) {
                    const avgDirtyEntities = spikesWithDirtyCount.reduce((sum, s) => sum + (s.dirtyEntityCount || 0), 0) /
                        spikesWithDirtyCount.length;
                    console.log(`   Avg Dirty Entities During Spikes: ${avgDirtyEntities.toFixed(1)}`);
                }
                if (spikesWithChangedCount.length > 0) {
                    const avgChangedEntities = spikesWithChangedCount.reduce((sum, s) => sum + (s.changedEntityCount || 0), 0) /
                        spikesWithChangedCount.length;
                    console.log(`   Avg Changed Entities During Spikes: ${avgChangedEntities.toFixed(1)}`);
                }
                if (spikesWithTotalCount.length > 0) {
                    const avgTotalEntities = spikesWithTotalCount.reduce((sum, s) => sum + (s.totalEntityCount || 0), 0) /
                        spikesWithTotalCount.length;
                    console.log(`   Avg Total Entities During Spikes: ${avgTotalEntities.toFixed(1)}`);
                }
            }
            // Display spike analysis and recommendations
            console.log(`\n🔍 Spike Analysis:`);
            const topEntityType = spikeStats.topSlowEntityTypesDuringSpikes[0];
            if (topEntityType) {
                console.log(`   Primary Contributor: ${topEntityType.type} (${topEntityType.percentage.toFixed(1)}% of spike time)`);
                // Provide specific recommendations based on entity type
                if (topEntityType.type.includes("zombie")) {
                    console.log(`   💡 Likely Causes:`);
                    console.log(`      - Many zombies spawning simultaneously during wave start`);
                    console.log(`      - Synchronized pathfinding calculations`);
                    console.log(`      - All zombies updating at once`);
                    console.log(`   🔧 Recommendations:`);
                    console.log(`      - Spread zombie spawning across multiple ticks`);
                    console.log(`      - Verify pathfinding offsets are working (should be random 0-1s)`);
                    console.log(`      - Consider batching entity updates`);
                }
                else if (topEntityType.type === "survivor") {
                    console.log(`   💡 Likely Causes:`);
                    console.log(`      - Survivors shooting simultaneously (should be offset now)`);
                    console.log(`      - Many survivors querying for zombies at once`);
                    console.log(`   🔧 Recommendations:`);
                    console.log(`      - Verify survivor cooldown offsets are working`);
                    console.log(`      - Consider reducing survivor shoot range or cooldown`);
                }
                else if (topEntityType.type === "landmine" || topEntityType.type === "bear_trap") {
                    console.log(`   💡 Likely Causes:`);
                    console.log(`      - Many traps checking for nearby entities simultaneously`);
                    console.log(`      - Traps exploding simultaneously`);
                    console.log(`   🔧 Recommendations:`);
                    console.log(`      - Offset trap update timers`);
                    console.log(`      - Batch trap proximity checks`);
                }
            }
            // Check if entitySerialization is a top method
            const topMethod = spikeStats.topSlowMethodsDuringSpikes[0];
            if (topMethod && topMethod.name.includes("Serialization")) {
                console.log(`   ⚠️  Entity Serialization is a major contributor (${topMethod.percentage.toFixed(1)}%)`);
                console.log(`   💡 This suggests many entities changed simultaneously (e.g., wave spawn)`);
                console.log(`   🔧 Consider: Spreading entity creation across multiple ticks`);
            }
            if (topMethod && topMethod.name.includes("refreshSpatialGrid")) {
                console.log(`   ⚠️  Spatial Grid Refresh is a major contributor (${topMethod.percentage.toFixed(1)}%)`);
                console.log(`   💡 This suggests many entities moved/spawned simultaneously`);
                console.log(`   🔧 Consider: Batching spatial grid updates or spreading spawns`);
            }
        }
        // Display tick time graph
        if (this.tickTimeHistory.length > 0) {
            console.log("\n📉 Tick Time History (min/avg/max):");
            renderTickTimeGraph(this.tickTimeHistory, tickStats);
        }
        // Display bandwidth graph
        if (this.bandwidthHistory.length > 0) {
            const bandwidthStats = this.calculateBandwidthStats();
            if (bandwidthStats) {
                console.log("\n📡 Bandwidth History (bytes/sec):");
                renderBandwidthGraph(this.bandwidthHistory, bandwidthStats);
            }
        }
        // Display top slowest entity types
        if (entityTypeStats.length > 0) {
            const topSlowest = entityTypeStats.slice(0, 10); // Top 10
            console.log("\n🐌 Top 10 Slowest Entity Types:");
            topSlowest.forEach((entityType, index) => {
                const totalTimePerTickMs = entityType.totalTime.toFixed(3);
                const avgTimeMs = entityType.averageTime.toFixed(3);
                console.log(`   ${index + 1}. ${entityType.type}: ${totalTimePerTickMs}ms/tick total (all entities), ${avgTimeMs}ms avg per entity (${entityType.entityCount} entities, ${entityType.callCount} total calls)`);
            });
        }
        console.log("\n" + "=".repeat(80) + "\n");
    }
    recordDirtyEntities(dirtyEntityInfo, changedEntityCount, totalEntityCount) {
        if (!ENABLE_PERFORMANCE_MONITORING) {
            return;
        }
        // Store dirty entity info for the current tick (for spike analysis)
        // This will be included in spike information if a spike occurs
        // Note: This is called before recordTick, so it's associated with the upcoming tick
        this.currentTickDirtyEntityCount = dirtyEntityInfo.length;
        if (changedEntityCount !== undefined) {
            this.currentTickChangedEntityCount = changedEntityCount;
        }
        if (totalEntityCount !== undefined) {
            this.currentTickTotalEntityCount = totalEntityCount;
        }
        if (dirtyEntityInfo.length > 0) {
            // Group by type for summary
            const byType = new Map();
            for (const info of dirtyEntityInfo) {
                byType.set(info.type, (byType.get(info.type) || 0) + 1);
            }
            // Store summary for potential logging (could be enhanced to track per-tick)
            // For now, this info is available but not automatically logged unless there's a spike
        }
    }
    getTickStats() {
        if (!ENABLE_PERFORMANCE_MONITORING || this.tickTimes.length === 0) {
            return null;
        }
        const totalTickTime = this.tickTimes.reduce((a, b) => a + b, 0);
        const avgTickTime = totalTickTime / this.tickTimes.length;
        return {
            min: Math.min(...this.tickTimes),
            max: Math.max(...this.tickTimes),
            avg: avgTickTime,
            count: this.tickTimes.length,
        };
    }
    getMethodStats() {
        if (!ENABLE_PERFORMANCE_MONITORING) {
            return [];
        }
        const methodStats = [];
        const totalTickTime = this.tickTimes.reduce((a, b) => a + b, 0);
        if (totalTickTime === 0) {
            return [];
        }
        for (const [methodName, times] of this.methodTimings.entries()) {
            const totalTime = times.reduce((a, b) => a + b, 0);
            const averageTime = totalTime / times.length;
            const percentage = (totalTime / totalTickTime) * 100;
            const hierarchy = this.methodHierarchy.get(methodName) || { parent: undefined, depth: 0 };
            methodStats.push({
                name: methodName,
                totalTime,
                callCount: times.length,
                averageTime,
                percentage,
                depth: hierarchy.depth,
                parent: hierarchy.parent,
                children: [],
            });
        }
        return methodStats.sort((a, b) => b.percentage - a.percentage);
    }
}
