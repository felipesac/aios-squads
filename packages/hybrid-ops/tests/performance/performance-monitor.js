/**
 * Performance Monitoring System for Hybrid-Ops Testing
 *
 * Comprehensive performance tracking including:
 * - Execution time profiling
 * - Memory usage monitoring
 * - Performance regression detection
 * - Benchmark result collection
 *
 * @module PerformanceMonitor
 * @author Quinn (QA Engineer)
 * @created 2025-10-19
 */

const { performance } = require('perf_hooks');

/**
 * Performance Profiler
 * Tracks execution times with percentile calculations
 */
class PerformanceProfiler {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  /**
   * Start timing an operation
   * @param {string} operation - Operation name
   * @returns {number} Start timestamp
   */
  startTimer(operation) {
    const startTime = performance.now();
    this.startTimes.set(operation, startTime);
    return startTime;
  }

  /**
   * End timing an operation
   * @param {string} operation - Operation name
   * @param {number} startTime - Optional start time (if not using startTimer)
   * @returns {number} Duration in milliseconds
   */
  endTimer(operation, startTime = null) {
    const actualStartTime = startTime || this.startTimes.get(operation);

    if (!actualStartTime) {
      throw new Error(`No start time found for operation: ${operation}`);
    }

    const duration = performance.now() - actualStartTime;
    this.recordMetric(operation, duration);
    this.startTimes.delete(operation);

    return duration;
  }

  /**
   * Record a metric value
   * @param {string} operation - Operation name
   * @param {number} value - Metric value
   */
  recordMetric(operation, value) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation).push(value);
  }

  /**
   * Get statistics for an operation
   * @param {string} operation - Operation name
   * @returns {Object} Statistics object
   */
  getStats(operation) {
    const values = this.metrics.get(operation);

    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: this.percentile(sorted, 0.5),
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      sum: values.reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Calculate percentile
   * @param {Array<number>} sortedValues - Sorted array of values
   * @param {number} percentile - Percentile (0-1)
   * @returns {number} Percentile value
   */
  percentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];

    const index = (sortedValues.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sortedValues[index];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Generate performance report
   * @returns {Object} Performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      operations: {}
    };

    for (const [operation, values] of this.metrics) {
      report.operations[operation] = this.getStats(operation);
    }

    return report;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }

  /**
   * Get all recorded operations
   * @returns {Array<string>} Operation names
   */
  getOperations() {
    return Array.from(this.metrics.keys());
  }
}

/**
 * Memory Monitor
 * Tracks memory usage and detects leaks
 */
class MemoryMonitor {
  constructor(options = {}) {
    this.options = {
      samplingInterval: options.samplingInterval || 1000, // 1 second
      warningThreshold: options.warningThreshold || 100 * 1024 * 1024, // 100MB
      criticalThreshold: options.criticalThreshold || 150 * 1024 * 1024, // 150MB
      ...options
    };

    this.samples = [];
    this.isMonitoring = false;
    this.intervalHandle = null;
    this.baseline = null;
  }

  /**
   * Start monitoring memory
   */
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.baseline = this.getCurrentMemory();
    this.samples = [this.baseline];

    this.intervalHandle = setInterval(() => {
      if (this.isMonitoring) {
        const sample = this.getCurrentMemory();
        this.samples.push(sample);
        this.checkThresholds(sample);
      }
    }, this.options.samplingInterval);
  }

  /**
   * Stop monitoring memory
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Get current memory usage
   * @returns {Object} Memory usage stats
   */
  getCurrentMemory() {
    const usage = process.memoryUsage();

    return {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers || 0
    };
  }

  /**
   * Check memory thresholds
   * @param {Object} sample - Memory sample
   */
  checkThresholds(sample) {
    const heapUsed = sample.heapUsed;

    if (heapUsed >= this.options.criticalThreshold) {
      console.warn(`🚨 CRITICAL: Memory usage ${this.formatBytes(heapUsed)}`);
    } else if (heapUsed >= this.options.warningThreshold) {
      console.warn(`⚠️  WARNING: Memory usage ${this.formatBytes(heapUsed)}`);
    }
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    if (this.samples.length === 0) {
      return null;
    }

    const heapValues = this.samples.map(s => s.heapUsed);
    const rssValues = this.samples.map(s => s.rss);

    const sortedHeap = [...heapValues].sort((a, b) => a - b);
    const sortedRss = [...rssValues].sort((a, b) => a - b);

    const stats = {
      sampleCount: this.samples.length,
      duration: this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp,
      baseline: this.baseline,
      current: this.samples[this.samples.length - 1],
      heap: {
        min: sortedHeap[0],
        max: sortedHeap[sortedHeap.length - 1],
        mean: heapValues.reduce((a, b) => a + b, 0) / heapValues.length,
        median: sortedHeap[Math.floor(sortedHeap.length / 2)],
        growth: sortedHeap[sortedHeap.length - 1] - sortedHeap[0],
        growthPercent: ((sortedHeap[sortedHeap.length - 1] - sortedHeap[0]) / sortedHeap[0] * 100).toFixed(2)
      },
      rss: {
        min: sortedRss[0],
        max: sortedRss[sortedRss.length - 1],
        mean: rssValues.reduce((a, b) => a + b, 0) / rssValues.length,
        median: sortedRss[Math.floor(sortedRss.length / 2)],
        growth: sortedRss[sortedRss.length - 1] - sortedRss[0],
        growthPercent: ((sortedRss[sortedRss.length - 1] - sortedRss[0]) / sortedRss[0] * 100).toFixed(2)
      }
    };

    return stats;
  }

  /**
   * Detect memory leaks
   * @returns {Object} Leak detection result
   */
  detectLeaks() {
    const stats = this.getStats();

    if (!stats) {
      return { detected: false, message: 'Insufficient data' };
    }

    // Check for sustained growth
    const growthPercent = parseFloat(stats.heap.growthPercent);
    const duration = stats.duration;

    // Consider leak if:
    // - >10% growth in <1 hour, or
    // - >5% growth in >1 hour
    const oneHour = 60 * 60 * 1000;
    const leakThreshold = duration < oneHour ? 10 : 5;

    const detected = growthPercent > leakThreshold;

    return {
      detected,
      growthPercent: growthPercent.toFixed(2),
      duration,
      threshold: leakThreshold,
      message: detected
        ? `Memory leak detected: ${growthPercent.toFixed(2)}% growth over ${this.formatDuration(duration)}`
        : `No leak detected: ${growthPercent.toFixed(2)}% growth over ${this.formatDuration(duration)}`
    };
  }

  /**
   * Generate memory report
   * @returns {Object} Memory report
   */
  generateReport() {
    const stats = this.getStats();
    const leaks = this.detectLeaks();

    return {
      timestamp: new Date().toISOString(),
      stats,
      leaks,
      thresholds: {
        warning: this.options.warningThreshold,
        critical: this.options.criticalThreshold
      }
    };
  }

  /**
   * Format bytes to human-readable
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }

  /**
   * Format duration to human-readable
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted string
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  /**
   * Reset monitoring
   */
  reset() {
    this.stop();
    this.samples = [];
    this.baseline = null;
  }
}

/**
 * Validation Overhead Calculator
 * Tracks validation gate performance specifically
 */
class ValidationOverheadCalculator {
  constructor() {
    this.validationMetrics = new Map();
  }

  /**
   * Record validation execution
   * @param {string} gate - Validation gate name
   * @param {number} duration - Execution duration (ms)
   */
  recordValidation(gate, duration) {
    if (!this.validationMetrics.has(gate)) {
      this.validationMetrics.set(gate, []);
    }
    this.validationMetrics.get(gate).push(duration);
  }

  /**
   * Get validation overhead stats
   * @returns {Object} Overhead statistics
   */
  getOverheadStats() {
    const stats = {
      byGate: {},
      total: {
        count: 0,
        sum: 0,
        mean: 0,
        p95: 0
      }
    };

    let allDurations = [];

    for (const [gate, durations] of this.validationMetrics) {
      const sorted = [...durations].sort((a, b) => a - b);
      const sum = durations.reduce((a, b) => a + b, 0);

      stats.byGate[gate] = {
        count: durations.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: sum / durations.length,
        median: sorted[Math.floor(sorted.length / 2)],
        p95: this.percentile(sorted, 0.95),
        sum
      };

      allDurations = allDurations.concat(durations);
    }

    if (allDurations.length > 0) {
      const sortedAll = [...allDurations].sort((a, b) => a - b);
      stats.total.count = allDurations.length;
      stats.total.sum = allDurations.reduce((a, b) => a + b, 0);
      stats.total.mean = stats.total.sum / stats.total.count;
      stats.total.p95 = this.percentile(sortedAll, 0.95);
    }

    return stats;
  }

  /**
   * Calculate percentile
   * @param {Array<number>} sortedValues - Sorted values
   * @param {number} percentile - Percentile (0-1)
   * @returns {number} Percentile value
   */
  percentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Check if overhead meets target
   * @param {number} target - Target overhead (ms)
   * @returns {Object} Compliance result
   */
  checkTarget(target = 100) {
    const stats = this.getOverheadStats();
    const actual = stats.total.p95;
    const meets = actual < target;

    return {
      meets,
      target,
      actual: actual.toFixed(2),
      difference: (actual - target).toFixed(2),
      message: meets
        ? `✅ Overhead ${actual.toFixed(2)}ms meets target <${target}ms`
        : `❌ Overhead ${actual.toFixed(2)}ms exceeds target <${target}ms`
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.validationMetrics.clear();
  }
}

/**
 * Integrated Performance Monitor
 * Combines profiler, memory monitor, and overhead calculator
 */
class IntegratedPerformanceMonitor {
  constructor(options = {}) {
    this.profiler = new PerformanceProfiler();
    this.memoryMonitor = new MemoryMonitor(options.memory);
    this.validationOverhead = new ValidationOverheadCalculator();
    this.sessionStart = Date.now();
  }

  /**
   * Start monitoring
   */
  start() {
    this.sessionStart = Date.now();
    this.memoryMonitor.start();
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.memoryMonitor.stop();
  }

  /**
   * Generate comprehensive report
   * @returns {Object} Complete performance report
   */
  generateComprehensiveReport() {
    const sessionDuration = Date.now() - this.sessionStart;

    return {
      timestamp: new Date().toISOString(),
      sessionDuration,
      performance: this.profiler.generateReport(),
      memory: this.memoryMonitor.generateReport(),
      validationOverhead: this.validationOverhead.getOverheadStats(),
      summary: {
        totalOperations: this.profiler.getOperations().length,
        memoryLeakDetected: this.memoryMonitor.detectLeaks().detected,
        validationOverheadMeetsTarget: this.validationOverhead.checkTarget(100).meets
      }
    };
  }

  /**
   * Reset all monitors
   */
  reset() {
    this.profiler.reset();
    this.memoryMonitor.reset();
    this.validationOverhead.reset();
    this.sessionStart = Date.now();
  }
}

module.exports = {
  PerformanceProfiler,
  MemoryMonitor,
  ValidationOverheadCalculator,
  IntegratedPerformanceMonitor
};
