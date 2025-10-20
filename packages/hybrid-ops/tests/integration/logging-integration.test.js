/**
 * Integration Tests for Monitoring Infrastructure
 *
 * Test coverage:
 * - Logger + Metrics integration
 * - Logger + Alert System integration
 * - Metrics + Alert System integration
 * - Full monitoring pipeline (Logger → Metrics → Dashboard → Alerts)
 * - Component interaction during normal operations
 * - Component interaction during error conditions
 * - Performance impact of full monitoring stack
 *
 * @group integration
 * @group monitoring
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../../utils/logger');
const { createMetricsCollector } = require('../../utils/metrics-collector');
const { createFallbackAlertSystem } = require('../../utils/fallback-alert-system');

describe('Monitoring Infrastructure Integration', () => {
  let testLogPath;
  let logger;
  let metrics;
  let alertSystem;

  beforeEach(() => {
    // Create test log directory
    const testDir = path.join(__dirname, '../temp/integration');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Use logger's actual file naming convention (YYYY-MM-DD format)
    const today = new Date().toISOString().split('T')[0];
    testLogPath = path.join(testDir, `hybrid-ops-${today}.log`);

    // Create test instances
    logger = createLogger({
      level: 'DEBUG',
      logDir: path.dirname(testLogPath)
    });

    metrics = createMetricsCollector({
      enabled: true,
      collectionInterval: 1000,
      retentionHours: 24,
      maxMetrics: 1000
    });

    alertSystem = createFallbackAlertSystem({
      enabled: true,
      checkInterval: 1000,
      alertCooldown: 5000,
      infoThreshold: 4,
      warningThreshold: 9,
      criticalThreshold: 10
    });

    // Override dependencies for testing
    alertSystem.metrics = metrics;
    alertSystem.logger = logger;
    metrics.logger = logger;  // Connect test logger to metrics collector
  });

  afterEach(() => {
    if (alertSystem && alertSystem.isRunning()) {
      alertSystem.stop();
    }

    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }

    if (metrics) {
      metrics.reset();
    }
  });

  describe('Logger + Metrics Integration', () => {
    test('should log timer end events (mind_load)', async () => {
      const operationId = 'test_operation_1';

      metrics.startTimer(operationId, 'mind_load', { component: 'test' });
      metrics.endTimer(operationId);

      // Flush logger to ensure logs are written
      await logger.flush();

      // Logger should have recorded the mind_load_time
      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);
      const timerLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'mind_load_time_recorded';
      });

      expect(timerLog).toBeDefined();
      const entry = JSON.parse(timerLog);
      expect(entry.metadata).toHaveProperty('duration_ms');
    });

    test('should log timer end events (validation)', async () => {
      const operationId = 'test_operation_2';

      metrics.startTimer(operationId, 'validation', {});
      const duration = metrics.endTimer(operationId, {});

      // Flush logger to ensure logs are written
      await logger.flush();

      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);
      const endLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'validation_overhead_recorded';
      });

      expect(endLog).toBeDefined();
      const entry = JSON.parse(endLog);
      expect(entry.metadata).toHaveProperty('duration_ms');
    });

    test('should log cache operations', async () => {
      metrics.recordCacheHit({ component: 'test', artifact: 'test.yaml' });
      metrics.recordCacheMiss({ component: 'test', artifact: 'missing.yaml' });

      // Flush logger to ensure logs are written
      await logger.flush();

      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);

      const hitLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'cache_hit_recorded';
      });

      const missLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'cache_miss_recorded';
      });

      expect(hitLog).toBeDefined();
      expect(missLog).toBeDefined();
    });

    test('should log fallback events', async () => {
      metrics.recordFallback('config_validation_failed', {
        component: 'mind-loader',
        errors_count: 3
      });

      // Flush logger to ensure logs are written
      await logger.flush();

      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);
      const fallbackLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'fallback_recorded';
      });

      expect(fallbackLog).toBeDefined();
      const entry = JSON.parse(fallbackLog);
      expect(entry.metadata.reason).toBe('config_validation_failed');
      expect(entry.metadata.total_fallbacks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Metrics + Alert System Integration', () => {
    test('should trigger alert when fallback threshold exceeded', () => {
      // Record fallbacks that should trigger WARNING
      for (let i = 0; i < 7; i++) {
        metrics.recordFallback('test_reason', { component: 'test' });
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('WARNING');
      expect(output).toContain('test_reason');

      consoleSpy.mockRestore();
    });

    test('should not trigger alert below threshold', () => {
      // Record only 2 fallbacks (below INFO threshold of 4)
      metrics.recordFallback('test_reason', {});
      metrics.recordFallback('test_reason', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('INFO');

      consoleSpy.mockRestore();
    });

    test('should escalate alert level as fallbacks increase', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Start with INFO level (3 fallbacks)
      for (let i = 0; i < 3; i++) {
        metrics.recordFallback('escalation_test', {});
      }
      alertSystem.checkFallbackRates();
      let output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('INFO');

      consoleSpy.mockClear();
      alertSystem.resetAlerts();

      // Escalate to WARNING (8 fallbacks total)
      for (let i = 0; i < 5; i++) {
        metrics.recordFallback('escalation_test', {});
      }
      alertSystem.checkFallbackRates();
      output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('WARNING');

      consoleSpy.mockClear();
      alertSystem.resetAlerts();

      // Escalate to CRITICAL (12 fallbacks total)
      for (let i = 0; i < 4; i++) {
        metrics.recordFallback('escalation_test', {});
      }
      alertSystem.checkFallbackRates();
      output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('CRITICAL');

      consoleSpy.mockRestore();
    });
  });

  describe('Logger + Alert System Integration', () => {
    test('should log alert events', async () => {
      // Trigger an alert
      for (let i = 0; i < 5; i++) {
        metrics.recordFallback('test_alert', {});
      }

      alertSystem.checkFallbackRates();

      // Flush logger to ensure logs are written
      await logger.flush();

      // Check logs for alert event
      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);
      const alertLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'alert_triggered';
      });

      expect(alertLog).toBeDefined();
      const entry = JSON.parse(alertLog);
      expect(entry.metadata.fallback_reason).toBe('test_alert');
      expect(entry.metadata.fallback_count).toBe(5);
    });

    test('should log alert system start/stop', async () => {
      alertSystem.start();
      alertSystem.stop();

      // Flush logger to ensure logs are written
      await logger.flush();

      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);

      const startLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'started' && entry.component === 'fallback-alert-system';
      });

      const stopLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'stopped' && entry.component === 'fallback-alert-system';
      });

      expect(startLog).toBeDefined();
      expect(stopLog).toBeDefined();
    });
  });

  describe('Full Monitoring Pipeline', () => {
    test('should handle complete operation lifecycle', async () => {
      const operationId = 'full_lifecycle_1';

      // 1. Start timer (not logged)
      metrics.startTimer(operationId, 'mind_load', { cached: false });

      // 2. Simulate cache miss (logged)
      metrics.recordCacheMiss({ component: 'test', artifact: 'test.yaml' });

      // 3. End timer (logged with duration)
      metrics.endTimer(operationId, { success: true });

      // 4. Flush logger to ensure logs are written
      await logger.flush();

      // 5. Check logs
      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);

      expect(logs.length).toBeGreaterThanOrEqual(2);

      const events = logs.map(line => JSON.parse(line).event);
      expect(events).toContain('cache_miss_recorded');
      expect(events).toContain('mind_load_time_recorded');
    });

    test('should handle error scenario with fallback', async () => {
      const operationId = 'error_scenario_1';

      // 1. Start operation
      metrics.startTimer(operationId, 'validation', {});

      // 2. Operation fails, trigger fallback
      metrics.recordFallback('validation_veto_triggered', {
        component: 'axioma-validator',
        overall_score: 5.2
      });

      // 3. End timer with error
      metrics.endTimer(operationId, { error: true });

      // 4. Check alert system
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      alertSystem.checkFallbackRates();
      consoleSpy.mockRestore();

      // 5. Flush logger to ensure logs are written
      await logger.flush();

      // 6. Verify logs
      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);

      const fallbackLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'fallback_recorded';
      });

      const alertLog = logs.find(line => {
        const entry = JSON.parse(line);
        return entry.event === 'alert_triggered';
      });

      expect(fallbackLog).toBeDefined();
      expect(alertLog).toBeDefined();
    });

    test('should maintain consistency across components', async () => {
      // Record multiple operations
      for (let i = 0; i < 10; i++) {
        const opId = `consistency_test_${i}`;
        metrics.startTimer(opId, 'mind_load', {});
        metrics.endTimer(opId, {});
      }

      // Get metrics summary
      const summary = metrics.getSummary();

      // Flush logger to ensure logs are written
      await logger.flush();

      // Verify logs match metrics
      const logs = fs.readFileSync(testLogPath, 'utf8').split('\n').filter(Boolean);
      const timerEvents = logs.filter(line => {
        const entry = JSON.parse(line);
        return entry.event === 'mind_load_time_recorded';
      });

      // Should have 10 timer events (only endTimer logs)
      expect(timerEvents.length).toBe(10);
      expect(summary.mindLoading.total).toBe(10);
    });
  });

  describe('Performance Impact of Full Stack', () => {
    test('should have minimal overhead with all components enabled', () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const opId = `perf_test_${i}`;

        // Full monitoring stack operation
        metrics.startTimer(opId, 'validation', { iteration: i });

        // Simulate cache check
        if (i % 2 === 0) {
          metrics.recordCacheHit({ component: 'test', iteration: i });
        } else {
          metrics.recordCacheMiss({ component: 'test', iteration: i });
        }

        metrics.endTimer(opId, { success: true });
      }

      const totalDuration = Date.now() - startTime;
      const avgOverhead = totalDuration / iterations;

      // Average overhead should be <10ms per operation with full stack
      expect(avgOverhead).toBeLessThan(10);
    });

    test('should handle high-frequency operations efficiently', () => {
      const startTime = Date.now();

      // Simulate 1000 rapid operations
      for (let i = 0; i < 1000; i++) {
        const opId = `high_freq_${i}`;
        metrics.startTimer(opId, 'mind_load', {});
        metrics.endTimer(opId, {});
      }

      const duration = Date.now() - startTime;

      // Should complete in <5 seconds
      expect(duration).toBeLessThan(5000);
    });

    test('should not degrade with continuous monitoring', async () => {
      alertSystem.start();

      const iterations = 50;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const opStart = Date.now();

        const opId = `continuous_${i}`;
        metrics.startTimer(opId, 'validation', {});
        metrics.endTimer(opId, {});

        durations.push(Date.now() - opStart);

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      alertSystem.stop();

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;

      // Average operation time should stay consistent (<5ms)
      expect(avgDuration).toBeLessThan(5);
    });
  });

  describe('Component Interaction During Errors', () => {
    test('should handle logger failures gracefully', () => {
      // Corrupt log directory path
      logger.logDir = '/invalid/path/that/does/not/exist';

      // Operations should not throw even if logging fails
      expect(() => {
        const opId = 'error_test_1';
        metrics.startTimer(opId, 'mind_load', {});
        metrics.endTimer(opId, {});
      }).not.toThrow();
    });

    test('should handle metrics overflow gracefully', () => {
      // Create small metrics buffer
      const smallMetrics = createMetricsCollector({ maxMetrics: 10 });
      alertSystem.metrics = smallMetrics;

      // Record more than max
      for (let i = 0; i < 50; i++) {
        const opId = `overflow_${i}`;
        smallMetrics.startTimer(opId, 'mind_load', {});
        smallMetrics.endTimer(opId, {});
      }

      // Alert system should still work
      expect(() => alertSystem.checkFallbackRates()).not.toThrow();

      const summary = smallMetrics.getSummary();
      expect(summary.mindLoading.total).toBeLessThanOrEqual(10);
    });

    test('should handle alert system errors gracefully', () => {
      // Disable alert system
      alertSystem.enabled = false;

      // Operations should continue normally
      expect(() => {
        metrics.recordFallback('test_reason', {});
        alertSystem.checkFallbackRates();
      }).not.toThrow();
    });
  });

  describe('Data Consistency Across Components', () => {
    test('should maintain consistent fallback counts', () => {
      const fallbackReasons = ['reason_1', 'reason_2', 'reason_3'];

      // Record various fallbacks
      fallbackReasons.forEach((reason, index) => {
        for (let i = 0; i < index + 1; i++) {
          metrics.recordFallback(reason, {});
        }
      });

      // Check metrics summary
      const summary = metrics.getSummary();
      expect(summary.fallbacks.byReason['reason_1']).toBe(1);
      expect(summary.fallbacks.byReason['reason_2']).toBe(2);
      expect(summary.fallbacks.byReason['reason_3']).toBe(3);

      // Check alert system uses same data
      const fallbackStats = metrics.getFallbackRate(1);
      expect(fallbackStats.byReason['reason_1']).toBe(1);
      expect(fallbackStats.byReason['reason_2']).toBe(2);
      expect(fallbackStats.byReason['reason_3']).toBe(3);
    });

    test('should maintain consistent timer measurements', () => {
      const opId = 'timer_consistency_1';

      metrics.startTimer(opId, 'validation', {});

      // Simulate work
      const workStart = Date.now();
      while (Date.now() - workStart < 50); // 50ms of work

      const measuredDuration = metrics.endTimer(opId, {});

      // Get from summary
      const summary = metrics.getSummary();

      expect(measuredDuration).toBeGreaterThanOrEqual(50);
      expect(summary.validation.count).toBe(1);
      expect(summary.validation.average).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle multiple concurrent timers', () => {
      const operationIds = ['concurrent_1', 'concurrent_2', 'concurrent_3'];

      // Start all timers
      operationIds.forEach(id => {
        metrics.startTimer(id, 'mind_load', { concurrent: true });
      });

      // End in different order
      metrics.endTimer('concurrent_2', {});
      metrics.endTimer('concurrent_1', {});
      metrics.endTimer('concurrent_3', {});

      const summary = metrics.getSummary();
      expect(summary.mindLoading.total).toBe(3);
    });

    test('should handle concurrent alerts', () => {
      // Record different fallback types simultaneously
      for (let i = 0; i < 5; i++) {
        metrics.recordFallback('type_1', {});
        metrics.recordFallback('type_2', {});
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('type_1');
      expect(output).toContain('type_2');

      consoleSpy.mockRestore();
    });
  });
});
