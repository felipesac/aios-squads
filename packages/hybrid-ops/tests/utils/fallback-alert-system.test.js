/**
 * Tests for Fallback Alert System
 *
 * Test coverage:
 * - Initialization and configuration
 * - Alert level determination (INFO, WARNING, CRITICAL)
 * - Alert cooldown mechanism
 * - Fallback rate checking and monitoring
 * - Recommendation generation
 * - Start/stop monitoring
 * - Status tracking
 * - Alert history management
 * - Integration with metrics collector
 *
 * @group unit
 * @group alerts
 */

const { FallbackAlertSystem, createFallbackAlertSystem } = require('../../utils/fallback-alert-system');
const { createMetricsCollector } = require('../../utils/metrics-collector');

describe('FallbackAlertSystem', () => {
  let alertSystem;
  let metrics;

  beforeEach(() => {
    // Create test metrics instance
    metrics = createMetricsCollector({
      enabled: true,
      collectionInterval: 1000,
      retentionHours: 24
    });

    // Create test alert system
    alertSystem = createFallbackAlertSystem({
      enabled: true,
      checkInterval: 1000,      // 1 second for testing
      alertCooldown: 5000,      // 5 seconds for testing
      infoThreshold: 4,
      warningThreshold: 9,
      criticalThreshold: 10
    });

    // Override metrics instance in alert system for testing
    alertSystem.metrics = metrics;
  });

  afterEach(() => {
    if (alertSystem && alertSystem.isRunning()) {
      alertSystem.stop();
    }
    if (metrics) {
      metrics.reset();
    }
  });

  describe('Initialization', () => {
    test('should create alert system with default options', () => {
      expect(alertSystem).toBeInstanceOf(FallbackAlertSystem);
      expect(alertSystem.isEnabled()).toBe(true);
    });

    test('should respect enabled flag', () => {
      const disabledSystem = createFallbackAlertSystem({ enabled: false });
      expect(disabledSystem.isEnabled()).toBe(false);
    });

    test('should set thresholds correctly', () => {
      const status = alertSystem.getStatus();
      expect(status.thresholds.info).toBe(4);
      expect(status.thresholds.warning).toBe(9);
      expect(status.thresholds.critical).toBe(10);
    });

    test('should set check interval correctly', () => {
      const status = alertSystem.getStatus();
      expect(status.checkInterval).toBe(1000);
    });

    test('should set alert cooldown correctly', () => {
      const status = alertSystem.getStatus();
      expect(status.alertCooldown).toBe(5000);
    });

    test('should initialize as not running', () => {
      expect(alertSystem.isRunning()).toBe(false);
    });

    test('should initialize with empty alert history', () => {
      const status = alertSystem.getStatus();
      expect(status.activeAlerts).toBe(0);
    });
  });

  describe('Alert Level Determination', () => {
    test('should return null for 0 fallbacks', () => {
      const level = alertSystem.determineAlertLevel(0);
      expect(level).toBe(null);
    });

    test('should return "info" for 1-4 fallbacks', () => {
      expect(alertSystem.determineAlertLevel(1)).toBe('info');
      expect(alertSystem.determineAlertLevel(2)).toBe('info');
      expect(alertSystem.determineAlertLevel(3)).toBe('info');
      expect(alertSystem.determineAlertLevel(4)).toBe('info');
    });

    test('should return "warning" for 5-9 fallbacks', () => {
      expect(alertSystem.determineAlertLevel(5)).toBe('warning');
      expect(alertSystem.determineAlertLevel(6)).toBe('warning');
      expect(alertSystem.determineAlertLevel(7)).toBe('warning');
      expect(alertSystem.determineAlertLevel(8)).toBe('warning');
      expect(alertSystem.determineAlertLevel(9)).toBe('warning');
    });

    test('should return "critical" for 10+ fallbacks', () => {
      expect(alertSystem.determineAlertLevel(10)).toBe('critical');
      expect(alertSystem.determineAlertLevel(15)).toBe('critical');
      expect(alertSystem.determineAlertLevel(100)).toBe('critical');
    });

    test('should use configured thresholds', () => {
      const customSystem = createFallbackAlertSystem({
        infoThreshold: 2,
        warningThreshold: 5,
        criticalThreshold: 8
      });

      expect(customSystem.determineAlertLevel(1)).toBe('info');
      expect(customSystem.determineAlertLevel(3)).toBe('warning');
      expect(customSystem.determineAlertLevel(8)).toBe('critical');
    });
  });

  describe('Alert Cooldown Mechanism', () => {
    test('should allow first alert for a reason', () => {
      const shouldSend = alertSystem.shouldSendAlert('test_reason', 'info');
      expect(shouldSend).toBe(true);
    });

    test('should block repeated alerts within cooldown', () => {
      alertSystem.recordAlert('test_reason', 'info');

      const shouldSend = alertSystem.shouldSendAlert('test_reason', 'info');
      expect(shouldSend).toBe(false);
    });

    test('should allow alerts after cooldown expires', async () => {
      alertSystem.recordAlert('test_reason', 'info');

      // Wait for cooldown to expire (5 seconds in test config)
      await new Promise(resolve => setTimeout(resolve, 5100));

      const shouldSend = alertSystem.shouldSendAlert('test_reason', 'info');
      expect(shouldSend).toBe(true);
    }, 10000); // 10 second timeout for this long-running test

    test('should track different reasons independently', () => {
      alertSystem.recordAlert('reason_1', 'info');

      expect(alertSystem.shouldSendAlert('reason_1', 'info')).toBe(false);
      expect(alertSystem.shouldSendAlert('reason_2', 'info')).toBe(true);
    });

    test('should track different levels independently', () => {
      alertSystem.recordAlert('test_reason', 'info');

      expect(alertSystem.shouldSendAlert('test_reason', 'info')).toBe(false);
      expect(alertSystem.shouldSendAlert('test_reason', 'warning')).toBe(true);
    });

    test('should update alert history when recording', () => {
      const initialCount = alertSystem.getStatus().activeAlerts;

      alertSystem.recordAlert('test_reason', 'info');

      const newCount = alertSystem.getStatus().activeAlerts;
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('Recommendation Generation', () => {
    test('should provide recommendation for config_validation_failed', () => {
      const recommendation = alertSystem.getRecommendation('config_validation_failed', 5);

      expect(recommendation).toContain('configuration');
      expect(recommendation).toContain('syntax');
    });

    test('should provide high frequency recommendation for config_validation_failed', () => {
      const recommendation = alertSystem.getRecommendation('config_validation_failed', 15);

      expect(recommendation).toContain('High frequency');
      expect(recommendation).toContain('systematic issue');
    });

    test('should provide recommendation for validation_veto_triggered', () => {
      const recommendation = alertSystem.getRecommendation('validation_veto_triggered', 3);

      expect(recommendation).toContain('CRITICAL');
      expect(recommendation).toContain('Social level');
    });

    test('should provide persistent veto recommendation', () => {
      const recommendation = alertSystem.getRecommendation('validation_veto_triggered', 10);

      expect(recommendation).toContain('Persistent vetoes');
      expect(recommendation).toContain('alignment issues');
    });

    test('should provide default recommendation for unknown reasons', () => {
      const recommendation = alertSystem.getRecommendation('unknown_reason', 5);

      expect(recommendation).toContain('Investigate root cause');
      expect(recommendation).toContain('unknown_reason');
      expect(recommendation).toContain('logs');
    });
  });

  describe('Alert Formatting', () => {
    test('should format INFO alert message', () => {
      const message = alertSystem.formatAlertMessage('info', {
        reason: 'test_reason',
        count: 3,
        windowHours: 1,
        recommendation: 'Test recommendation'
      });

      expect(message).toContain('🔵');
      expect(message).toContain('INFO');
      expect(message).toContain('test_reason');
      expect(message).toContain('3 fallbacks');
      expect(message).toContain('Test recommendation');
    });

    test('should format WARNING alert message', () => {
      const message = alertSystem.formatAlertMessage('warning', {
        reason: 'test_reason',
        count: 7,
        windowHours: 1,
        recommendation: 'Test recommendation'
      });

      expect(message).toContain('🟡');
      expect(message).toContain('WARNING');
    });

    test('should format CRITICAL alert message', () => {
      const message = alertSystem.formatAlertMessage('critical', {
        reason: 'test_reason',
        count: 12,
        windowHours: 1,
        recommendation: 'Test recommendation'
      });

      expect(message).toContain('🔴');
      expect(message).toContain('CRITICAL');
    });
  });

  describe('Fallback Rate Checking', () => {
    test('should not alert when no fallbacks', () => {
      // Mock console.log to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should alert on first occurrence of fallback', () => {
      // Record a fallback
      metrics.recordFallback('test_reason', { component: 'test' });

      // Mock console.log to capture alert
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('FALLBACK ALERT');
      expect(output).toContain('test_reason');

      consoleSpy.mockRestore();
    });

    test('should respect cooldown on repeated checks', () => {
      metrics.recordFallback('test_reason', { component: 'test' });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // First check - should alert
      alertSystem.checkFallbackRates();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockClear();

      // Second check - should not alert (cooldown)
      alertSystem.checkFallbackRates();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should check multiple fallback reasons', () => {
      metrics.recordFallback('reason_1', {});
      metrics.recordFallback('reason_2', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('reason_1');
      expect(output).toContain('reason_2');

      consoleSpy.mockRestore();
    });
  });

  describe('Start/Stop Monitoring', () => {
    test('should start monitoring successfully', () => {
      alertSystem.start();

      expect(alertSystem.isRunning()).toBe(true);
    });

    test('should stop monitoring successfully', () => {
      alertSystem.start();
      alertSystem.stop();

      expect(alertSystem.isRunning()).toBe(false);
    });

    test('should not start if already running', () => {
      alertSystem.start();

      // Try to start again
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      alertSystem.start();
      consoleSpy.mockRestore();

      // Should still be running but only once
      expect(alertSystem.isRunning()).toBe(true);
    });

    test('should not stop if not running', () => {
      // Try to stop when not running
      alertSystem.stop();

      expect(alertSystem.isRunning()).toBe(false);
    });

    test('should not start if disabled', () => {
      const disabledSystem = createFallbackAlertSystem({ enabled: false });

      disabledSystem.start();

      expect(disabledSystem.isRunning()).toBe(false);
    });

    test('should perform initial check on start', () => {
      metrics.recordFallback('test_reason', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.start();

      // Initial check should have run
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('FALLBACK ALERT');

      alertSystem.stop();
      consoleSpy.mockRestore();
    });

    test('should perform periodic checks when running', async () => {
      alertSystem.start();

      // Add fallback after starting
      metrics.recordFallback('test_reason', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Wait for next check cycle (1 second in test config)
      await new Promise(resolve => setTimeout(resolve, 1100));

      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('FALLBACK ALERT');

      alertSystem.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('Status Tracking', () => {
    test('should return correct status when not running', () => {
      const status = alertSystem.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.running).toBe(false);
      expect(status.checkInterval).toBe(1000);
      expect(status.alertCooldown).toBe(5000);
      expect(status.thresholds).toEqual({
        info: 4,
        warning: 9,
        critical: 10
      });
      expect(status.activeAlerts).toBe(0);
    });

    test('should return correct status when running', () => {
      alertSystem.start();

      const status = alertSystem.getStatus();

      expect(status.running).toBe(true);

      alertSystem.stop();
    });

    test('should track active alerts count', () => {
      alertSystem.recordAlert('reason_1', 'info');
      alertSystem.recordAlert('reason_2', 'warning');

      const status = alertSystem.getStatus();
      expect(status.activeAlerts).toBe(2);
    });
  });

  describe('Alert History Management', () => {
    test('should reset alert history', () => {
      alertSystem.recordAlert('reason_1', 'info');
      alertSystem.recordAlert('reason_2', 'warning');

      expect(alertSystem.getStatus().activeAlerts).toBe(2);

      alertSystem.resetAlerts();

      expect(alertSystem.getStatus().activeAlerts).toBe(0);
    });

    test('should allow alerts after reset', () => {
      alertSystem.recordAlert('test_reason', 'info');

      expect(alertSystem.shouldSendAlert('test_reason', 'info')).toBe(false);

      alertSystem.resetAlerts();

      expect(alertSystem.shouldSendAlert('test_reason', 'info')).toBe(true);
    });
  });

  describe('Integration with Metrics Collector', () => {
    test('should read fallback rates from metrics', () => {
      // Record multiple fallbacks
      for (let i = 0; i < 5; i++) {
        metrics.recordFallback('config_validation_failed', {});
      }

      const fallbackStats = metrics.getFallbackRate(1);

      expect(fallbackStats.total).toBe(5);
      expect(fallbackStats.byReason['config_validation_failed']).toBe(5);
    });

    test('should determine correct alert level from metrics', () => {
      // Record fallbacks that should trigger WARNING
      for (let i = 0; i < 7; i++) {
        metrics.recordFallback('test_reason', {});
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('WARNING');

      consoleSpy.mockRestore();
    });

    test('should handle empty metrics gracefully', () => {
      // No fallbacks recorded
      const emptyMetrics = createMetricsCollector({ enabled: true });
      alertSystem.metrics = emptyMetrics;

      // Should not throw
      expect(() => alertSystem.checkFallbackRates()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle disabled alert system', () => {
      const disabledSystem = createFallbackAlertSystem({ enabled: false });

      disabledSystem.checkFallbackRates();

      expect(disabledSystem.isRunning()).toBe(false);
    });

    test('should handle rapid consecutive fallbacks', () => {
      // Record many fallbacks quickly
      for (let i = 0; i < 50; i++) {
        metrics.recordFallback('rapid_reason', {});
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      alertSystem.checkFallbackRates();

      // Should alert as CRITICAL
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('CRITICAL');
      expect(output).toContain('50 fallbacks');

      consoleSpy.mockRestore();
    });

    test('should handle zero check interval gracefully', () => {
      const zeroIntervalSystem = createFallbackAlertSystem({
        checkInterval: 0
      });

      // Should not throw when starting
      expect(() => zeroIntervalSystem.start()).not.toThrow();
      zeroIntervalSystem.stop();
    });

    test('should handle zero cooldown gracefully', () => {
      const zeroCooldownSystem = createFallbackAlertSystem({
        alertCooldown: 0
      });

      zeroCooldownSystem.recordAlert('test', 'info');

      // Should allow immediate re-alert with zero cooldown
      expect(zeroCooldownSystem.shouldSendAlert('test', 'info')).toBe(true);
    });
  });

  describe('Alert Levels with Custom Thresholds', () => {
    test('should use custom thresholds for alert levels', () => {
      const customSystem = createFallbackAlertSystem({
        infoThreshold: 1,
        warningThreshold: 3,
        criticalThreshold: 5
      });

      expect(customSystem.determineAlertLevel(1)).toBe('info');
      expect(customSystem.determineAlertLevel(3)).toBe('warning');
      expect(customSystem.determineAlertLevel(5)).toBe('critical');
    });

    test('should respect custom thresholds in monitoring', () => {
      const customSystem = createFallbackAlertSystem({
        infoThreshold: 1,
        warningThreshold: 2,
        criticalThreshold: 3
      });

      customSystem.metrics = metrics;

      // Record 2 fallbacks (should be WARNING with custom thresholds)
      metrics.recordFallback('test', {});
      metrics.recordFallback('test', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      customSystem.checkFallbackRates();

      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('WARNING');

      consoleSpy.mockRestore();
    });
  });
});
