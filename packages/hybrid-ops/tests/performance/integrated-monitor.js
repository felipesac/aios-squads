/**
 * @fileoverview Integrated Performance Monitor
 *
 * Provides comprehensive performance monitoring capabilities including:
 * - CPU profiling with percentile-based metrics
 * - Memory tracking with leak detection
 * - Time measurement utilities
 * - Comprehensive reporting
 *
 * Author: Quinn (AIOS-QA Agent)
 * Date: 2025-01-19
 */

/**
 * IntegratedPerformanceMonitor - Main performance monitoring class
 */
class IntegratedPerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      profiling: {
        enabled: true,
        sampleInterval: 100,
        percentiles: [50, 90, 95, 99],
        ...options.profiling
      },
      memory: {
        samplingInterval: 1000,
        warningThreshold: 100 * 1024 * 1024, // 100MB
        criticalThreshold: 150 * 1024 * 1024, // 150MB
        ...options.memory
      },
      timing: {
        enabled: true,
        ...options.timing
      }
    };

    this.profiles = new Map();
    this.memorySnapshots = [];
    this.timings = new Map();
    this.warnings = [];
    this.isRunning = false;
    this.memoryInterval = null;
  }

  /**
   * Start profiling with given ID
   */
  startProfiling(profileId) {
    if (!this.options.profiling.enabled) {
      return;
    }

    this.profiles.set(profileId, {
      id: profileId,
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
      samples: [],
      endTime: null,
      endMemory: null
    });

    // Start memory monitoring if not already running
    if (!this.memoryInterval && this.options.memory.samplingInterval > 0) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Stop profiling with given ID
   */
  stopProfiling(profileId) {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return null;
    }

    profile.endTime = performance.now();
    profile.endMemory = process.memoryUsage();
    profile.duration = profile.endTime - profile.startTime;

    return profile;
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (this.memoryInterval) {
      return; // Already monitoring
    }

    this.isRunning = true;
    this.memoryInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const snapshot = {
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external
      };

      this.memorySnapshots.push(snapshot);

      // Check thresholds
      if (memUsage.heapUsed > this.options.memory.criticalThreshold) {
        this.warnings.push({
          type: 'MEMORY_CRITICAL',
          message: `Memory usage critical: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          timestamp: Date.now(),
          value: memUsage.heapUsed
        });
      } else if (memUsage.heapUsed > this.options.memory.warningThreshold) {
        this.warnings.push({
          type: 'MEMORY_WARNING',
          message: `Memory usage high: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          timestamp: Date.now(),
          value: memUsage.heapUsed
        });
      }
    }, this.options.memory.samplingInterval);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Record timing for an operation
   */
  recordTiming(operationId, duration) {
    if (!this.timings.has(operationId)) {
      this.timings.set(operationId, []);
    }
    this.timings.get(operationId).push(duration);
  }

  /**
   * Calculate percentile from array of values
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    if (this.memorySnapshots.length === 0) {
      return null;
    }

    const heapValues = this.memorySnapshots.map(s => s.heapUsed);
    const rssValues = this.memorySnapshots.map(s => s.rss);

    return {
      heap: {
        min: Math.min(...heapValues),
        max: Math.max(...heapValues),
        avg: heapValues.reduce((a, b) => a + b, 0) / heapValues.length,
        current: heapValues[heapValues.length - 1]
      },
      rss: {
        min: Math.min(...rssValues),
        max: Math.max(...rssValues),
        avg: rssValues.reduce((a, b) => a + b, 0) / rssValues.length,
        current: rssValues[rssValues.length - 1]
      },
      samples: this.memorySnapshots.length
    };
  }

  /**
   * Detect memory leaks based on trend
   */
  detectMemoryLeaks() {
    if (this.memorySnapshots.length < 10) {
      return { detected: false, confidence: 0 };
    }

    // Simple trend detection: compare first half vs second half
    const midpoint = Math.floor(this.memorySnapshots.length / 2);
    const firstHalf = this.memorySnapshots.slice(0, midpoint);
    const secondHalf = this.memorySnapshots.slice(midpoint);

    const avgFirst = firstHalf.reduce((sum, s) => sum + s.heapUsed, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, s) => sum + s.heapUsed, 0) / secondHalf.length;

    const growthRate = ((avgSecond - avgFirst) / avgFirst) * 100;

    // If memory grew >20% in second half, possible leak
    const detected = growthRate > 20;
    const confidence = Math.min(100, growthRate);

    return {
      detected,
      confidence: confidence.toFixed(1),
      growthRate: growthRate.toFixed(2),
      avgFirst: (avgFirst / 1024 / 1024).toFixed(2),
      avgSecond: (avgSecond / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      profiles: [],
      memory: this.getMemoryStats(),
      memoryLeaks: this.detectMemoryLeaks(),
      timings: {},
      warnings: this.warnings,
      summary: {}
    };

    // Process profiles
    for (const [id, profile] of this.profiles.entries()) {
      report.profiles.push({
        id,
        duration: profile.duration ? profile.duration.toFixed(2) : 'N/A',
        memoryDelta: profile.endMemory ?
          ((profile.endMemory.heapUsed - profile.startMemory.heapUsed) / 1024 / 1024).toFixed(2) :
          'N/A'
      });
    }

    // Process timings with percentiles
    for (const [operationId, values] of this.timings.entries()) {
      report.timings[operationId] = {
        count: values.length,
        min: Math.min(...values).toFixed(2),
        max: Math.max(...values).toFixed(2),
        avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        p50: this.calculatePercentile(values, 50).toFixed(2),
        p90: this.calculatePercentile(values, 90).toFixed(2),
        p95: this.calculatePercentile(values, 95).toFixed(2),
        p99: this.calculatePercentile(values, 99).toFixed(2)
      };
    }

    // Generate summary
    report.summary = {
      totalProfiles: this.profiles.size,
      totalTimings: this.timings.size,
      totalWarnings: this.warnings.length,
      memoryLeakDetected: report.memoryLeaks.detected,
      overallHealth: this.warnings.length === 0 && !report.memoryLeaks.detected ? 'GOOD' : 'NEEDS_ATTENTION'
    };

    return report;
  }

  /**
   * Stop all monitoring and cleanup
   */
  stop() {
    this.stopMemoryMonitoring();
  }

  /**
   * Reset all collected data
   */
  reset() {
    this.stop();
    this.profiles.clear();
    this.memorySnapshots = [];
    this.timings.clear();
    this.warnings = [];
  }
}

module.exports = {
  IntegratedPerformanceMonitor
};
