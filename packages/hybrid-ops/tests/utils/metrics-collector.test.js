/**
 * Tests for Metrics Collector
 *
 * Test coverage:
 * - Timer-based metrics
 * - Cache hit/miss tracking
 * - Fallback recording
 * - Statistical analysis (avg, P95, P99)
 * - Performance overhead (<5ms)
 * - Memory management (circular buffer)
 *
 * @group unit
 * @group metrics
 */

const { MetricsCollector, getMetricsCollector, createMetricsCollector } = require('../../utils/metrics-collector');

describe('MetricsCollector', () => {
  let metrics;

  beforeEach(() => {
    metrics = createMetricsCollector({
      enabled: true,
      collectionInterval: 1000,
      retentionHours: 24,
      maxMetrics: 100
    });
  });

  afterEach(() => {
    if (metrics) {
      metrics.reset();
    }
  });

  describe('Initialization', () => {
    test('should create metrics collector with default options', () => {
      expect(metrics).toBeInstanceOf(MetricsCollector);
      expect(metrics.isEnabled()).toBe(true);
    });

    test('should respect enabled flag', () => {
      const disabledMetrics = createMetricsCollector({ enabled: false });
      expect(disabledMetrics.isEnabled()).toBe(false);
    });

    test('should initialize empty metrics collections', () => {
      const summary = metrics.getSummary();

      expect(summary.mindLoading.total).toBe(0);
      expect(summary.validation.count).toBe(0);
      expect(summary.cache.hits).toBe(0);
      expect(summary.cache.misses).toBe(0);
      expect(summary.fallbacks.total).toBe(0);
    });
  });

  describe('Timer-Based Metrics', () => {
    describe('Mind Loading Metrics', () => {
      test('should track mind loading time', () => {
        const operationId = 'test_load_1';

        metrics.startTimer(operationId, 'mind_load', { cached: false });

        // Simulate some work
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        return delay(10).then(() => {
          const duration = metrics.endTimer(operationId, { config_source: 'file' });

          expect(duration).toBeGreaterThanOrEqual(10);

          const summary = metrics.getSummary();
          expect(summary.mindLoading.total).toBe(1);
          expect(summary.mindLoading.firstLoad.count).toBe(1);
        });
      });

      test('should differentiate between first load and cached load', () => {
        // First load
        const op1 = 'load_1';
        metrics.startTimer(op1, 'mind_load', { cached: false });
        metrics.endTimer(op1);

        // Cached load
        const op2 = 'load_2';
        metrics.startTimer(op2, 'mind_load', { cached: true });
        metrics.endTimer(op2);

        const summary = metrics.getSummary();
        expect(summary.mindLoading.firstLoad.count).toBe(1);
        expect(summary.mindLoading.cached.count).toBe(1);
        expect(summary.mindLoading.total).toBe(2);
      });

      test('should calculate average mind load time', () => {
        for (let i = 0; i < 5; i++) {
          const opId = `load_${i}`;
          metrics.startTimer(opId, 'mind_load', { cached: false });
          // Simulate consistent 10ms load
          const start = Date.now();
          while (Date.now() - start < 10);
          metrics.endTimer(opId);
        }

        const avg = metrics.getAverageMindLoadTime(false);
        expect(avg).toBeGreaterThanOrEqual(10);
        expect(avg).toBeLessThan(20);
      });
    });

    describe('Validation Metrics', () => {
      test('should track validation overhead', () => {
        const operationId = 'validation_1';

        metrics.startTimer(operationId, 'validation', {
          content_length: 1000,
          levels_count: 4
        });

        // Simulate work with busy-wait
        const start = Date.now();
        while (Date.now() - start < 5);

        const duration = metrics.endTimer(operationId, {
          score: 8.5,
          recommendation: 'APPROVE'
        });

        expect(duration).toBeGreaterThanOrEqual(5);

        const summary = metrics.getSummary();
        expect(summary.validation.count).toBe(1);
      });

      test('should calculate validation percentiles', () => {
        // Generate validation samples with known distribution
        const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        samples.forEach((ms, index) => {
          const opId = `validation_${index}`;
          metrics.startTimer(opId, 'validation', {});

          // Simulate specific duration
          const start = Date.now();
          while (Date.now() - start < ms);

          metrics.endTimer(opId);
        });

        const p95 = metrics.getP95ValidationOverhead();
        const p99 = metrics.getP99ValidationOverhead();

        expect(p95).toBeGreaterThanOrEqual(9);
        expect(p99).toBeGreaterThanOrEqual(9);
        expect(p99).toBeGreaterThanOrEqual(p95);
      });

      test('should track average validation overhead', () => {
        for (let i = 0; i < 10; i++) {
          const opId = `validation_${i}`;
          metrics.startTimer(opId, 'validation', {});

          // Simulate small work with busy-wait
          const start = Date.now();
          while (Date.now() - start < 2);

          metrics.endTimer(opId);
        }

        const avg = metrics.getAverageValidationOverhead();
        expect(avg).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Heuristic Execution Metrics', () => {
      test('should track heuristic compilation time', () => {
        const operationId = 'heuristic_1';

        metrics.startTimer(operationId, 'heuristic_exec', {
          heuristic_id: 'PV_BS_001',
          phase: 'compilation'
        });

        // Simulate work with busy-wait
        const start = Date.now();
        while (Date.now() - start < 5);

        const duration = metrics.endTimer(operationId);

        expect(duration).toBeGreaterThanOrEqual(5);

        const summary = metrics.getSummary();
        expect(summary.heuristics.executions).toBe(1);
      });
    });

    test('should handle timer not found gracefully', () => {
      const duration = metrics.endTimer('non_existent_timer');
      expect(duration).toBe(0);
    });

    test('should handle unknown timer type', () => {
      const opId = 'unknown_1';
      metrics.startTimer(opId, 'unknown_type', {});

      // Simulate work with busy-wait
      const start = Date.now();
      while (Date.now() - start < 5);

      const duration = metrics.endTimer(opId);

      expect(duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Cache Metrics', () => {
    test('should record cache hits', () => {
      metrics.recordCacheHit({ component: 'mind-loader', artifact: 'test.yaml' });

      const summary = metrics.getSummary();
      expect(summary.cache.hits).toBe(1);
    });

    test('should record cache misses', () => {
      metrics.recordCacheMiss({ component: 'mind-loader', artifact: 'test.yaml' });

      const summary = metrics.getSummary();
      expect(summary.cache.misses).toBe(1);
    });

    test('should calculate cache hit rate', () => {
      // 80 hits, 20 misses = 80% hit rate
      for (let i = 0; i < 80; i++) {
        metrics.recordCacheHit({ component: 'test' });
      }
      for (let i = 0; i < 20; i++) {
        metrics.recordCacheMiss({ component: 'test' });
      }

      const hitRate = metrics.getCacheHitRate();
      expect(hitRate).toBeCloseTo(80, 1);
    });

    test('should return 0 hit rate when no operations', () => {
      const hitRate = metrics.getCacheHitRate();
      expect(hitRate).toBe(0);
    });

    test('should handle disabled metrics for cache tracking', () => {
      const disabledMetrics = createMetricsCollector({ enabled: false });

      disabledMetrics.recordCacheHit({});
      disabledMetrics.recordCacheMiss({});

      const summary = disabledMetrics.getSummary();
      expect(summary.cache.hits).toBe(0);
      expect(summary.cache.misses).toBe(0);
    });
  });

  describe('Fallback Metrics', () => {
    test('should record fallback events', () => {
      metrics.recordFallback('config_validation_failed', {
        component: 'mind-loader',
        errors_count: 3
      });

      const summary = metrics.getSummary();
      expect(summary.fallbacks.total).toBe(1);
    });

    test('should track fallbacks by reason', () => {
      metrics.recordFallback('config_validation_failed', {});
      metrics.recordFallback('config_validation_failed', {});
      metrics.recordFallback('validation_veto_triggered', {});

      const summary = metrics.getSummary();
      expect(summary.fallbacks.byReason['config_validation_failed']).toBe(2);
      expect(summary.fallbacks.byReason['validation_veto_triggered']).toBe(1);
    });

    test('should get fallback rate for time window', () => {
      metrics.recordFallback('config_validation_failed', {});
      metrics.recordFallback('validation_veto_triggered', {});

      const rate = metrics.getFallbackRate(1); // Last 1 hour
      expect(rate.total).toBe(2);
      expect(rate.windowHours).toBe(1);
    });

    test('should filter fallbacks by time window', async () => {
      // Record a fallback now
      metrics.recordFallback('recent', {});

      // Manually add an old fallback (simulate)
      const oldTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      metrics.metrics.fallbacks.push({
        timestamp: oldTimestamp,
        reason: 'old'
      });

      const rate = metrics.getFallbackRate(1); // Last 1 hour only
      expect(rate.total).toBe(1);
      expect(rate.byReason['recent']).toBe(1);
      expect(rate.byReason['old']).toBeUndefined();
    });
  });

  describe('Performance', () => {
    test('should have <5ms overhead for timer operations', () => {
      const iterations = 100;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        const opId = `perf_test_${i}`;
        metrics.startTimer(opId, 'mind_load', {});
        metrics.endTimer(opId);

        durations.push(Date.now() - start);
      }

      const avgOverhead = durations.reduce((a, b) => a + b, 0) / iterations;
      expect(avgOverhead).toBeLessThan(5);
    });

    test('should have <1ms overhead for cache tracking', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        metrics.recordCacheHit({ component: 'test', artifact: `test_${i}` });
      }

      const totalDuration = Date.now() - start;
      const avgOverhead = totalDuration / iterations;

      expect(avgOverhead).toBeLessThan(1);
    });

    test('should handle 10000 metrics efficiently', () => {
      const start = Date.now();

      for (let i = 0; i < 10000; i++) {
        const opId = `load_${i}`;
        metrics.startTimer(opId, 'mind_load', {});
        metrics.endTimer(opId);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds
    });
  });

  describe('Memory Management', () => {
    test('should enforce circular buffer limit', () => {
      const smallMetrics = createMetricsCollector({ maxMetrics: 10 });

      // Add more metrics than max
      for (let i = 0; i < 20; i++) {
        const opId = `load_${i}`;
        smallMetrics.startTimer(opId, 'mind_load', {});
        smallMetrics.endTimer(opId);
      }

      const summary = smallMetrics.getSummary();
      expect(summary.mindLoading.total).toBeLessThanOrEqual(10);
    });

    test('should remove oldest metrics when buffer is full', () => {
      const smallMetrics = createMetricsCollector({ maxMetrics: 5 });

      // Add 5 metrics with unique identifiers
      for (let i = 0; i < 5; i++) {
        const opId = `load_${i}`;
        smallMetrics.startTimer(opId, 'mind_load', { index: i });
        smallMetrics.endTimer(opId);
      }

      // Add 1 more (should remove oldest)
      const opId = 'load_5';
      smallMetrics.startTimer(opId, 'mind_load', { index: 5 });
      smallMetrics.endTimer(opId);

      const summary = smallMetrics.getSummary();
      expect(summary.mindLoading.total).toBe(5); // Still at max
    });
  });

  describe('Retention Policy', () => {
    test('should clean up old metrics', () => {
      // Add a recent metric
      const opId = 'recent';
      metrics.startTimer(opId, 'mind_load', {});
      metrics.endTimer(opId);

      // Manually add old metric (simulate)
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
      metrics.metrics.mindLoadTime.push({
        timestamp: oldTimestamp,
        duration_ms: 100,
        cached: false
      });

      // Trigger cleanup
      metrics.cleanupOldMetrics();

      const summary = metrics.getSummary();
      // Should only include recent metric (24h retention)
      expect(summary.mindLoading.total).toBe(1);
    });
  });

  describe('Export and Reset', () => {
    test('should export metrics to JSON', () => {
      metrics.recordCacheHit({ component: 'test' });
      metrics.recordFallback('test_reason', {});

      const json = metrics.exportToJSON();
      const data = JSON.parse(json);

      expect(data).toHaveProperty('exported_at');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('raw_metrics');
    });

    test('should reset all metrics', () => {
      // Add various metrics
      const opId = 'load_1';
      metrics.startTimer(opId, 'mind_load', {});
      metrics.endTimer(opId);
      metrics.recordCacheHit({});
      metrics.recordFallback('test', {});

      // Reset
      metrics.reset();

      const summary = metrics.getSummary();
      expect(summary.mindLoading.total).toBe(0);
      expect(summary.cache.hits).toBe(0);
      expect(summary.fallbacks.total).toBe(0);
    });
  });

  describe('Singleton Instance', () => {
    test('getMetricsCollector should return same instance', () => {
      const metrics1 = getMetricsCollector();
      const metrics2 = getMetricsCollector();

      expect(metrics1).toBe(metrics2);
    });

    test('createMetricsCollector should return new instance', () => {
      const metrics1 = createMetricsCollector();
      const metrics2 = createMetricsCollector();

      expect(metrics1).not.toBe(metrics2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle disabled metrics', () => {
      const disabledMetrics = createMetricsCollector({ enabled: false });

      disabledMetrics.startTimer('op1', 'mind_load', {});
      disabledMetrics.endTimer('op1');
      disabledMetrics.recordCacheHit({});
      disabledMetrics.recordFallback('test', {});

      const summary = disabledMetrics.getSummary();
      expect(summary.mindLoading.total).toBe(0);
      expect(summary.cache.hits).toBe(0);
      expect(summary.fallbacks.total).toBe(0);
    });

    test('should handle empty percentile calculation', () => {
      const p95 = metrics.getP95ValidationOverhead();
      const p99 = metrics.getP99ValidationOverhead();

      expect(p95).toBe(0);
      expect(p99).toBe(0);
    });

    test('should handle single metric percentile', () => {
      const opId = 'validation_1';
      metrics.startTimer(opId, 'validation', {});

      // Simulate work with busy-wait
      const start = Date.now();
      while (Date.now() - start < 5);

      metrics.endTimer(opId);

      const p95 = metrics.getP95ValidationOverhead();
      const p99 = metrics.getP99ValidationOverhead();

      expect(p95).toBeGreaterThanOrEqual(5);
      expect(p99).toBeGreaterThanOrEqual(5);
    });
  });
});
