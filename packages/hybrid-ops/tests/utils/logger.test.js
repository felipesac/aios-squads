/**
 * Tests for Logger Utility
 *
 * Test coverage:
 * - Logger initialization
 * - Log level filtering
 * - Structured logging format
 * - File output
 * - Async batching with flush
 *
 * @group unit
 * @group logger
 */

const fs = require('fs');
const path = require('path');
const { Logger, getLogger, createLogger } = require('../../utils/logger');

describe('Logger', () => {
  let testLogger;
  let testLogDir;

  beforeEach(() => {
    // Create test logger with temporary log directory
    testLogDir = path.join(__dirname, '../temp', `test-${Date.now()}`);
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }

    testLogger = createLogger({
      level: 'DEBUG',
      logDir: testLogDir,
      maxFileSizeMB: 1,
      rotationDays: 7,
      environment: 'test'
    });
  });

  afterEach(async () => {
    // Flush any pending writes
    await testLogger.flush();

    // Clean up test log directory
    if (fs.existsSync(testLogDir)) {
      try {
        const files = fs.readdirSync(testLogDir);
        files.forEach(file => {
          const filePath = path.join(testLogDir, file);
          // Skip directories, only delete files
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
        // Try to remove directory, but don't fail if it's still in use
        try {
          fs.rmdirSync(testLogDir, { recursive: true });
        } catch (err) {
          // Ignore cleanup errors on Windows
          if (err.code !== 'ENOTEMPTY' && err.code !== 'EPERM') {
            throw err;
          }
        }
      } catch (err) {
        // Ignore cleanup errors
        console.warn(`Failed to cleanup test directory: ${err.message}`);
      }
    }
  });

  describe('Initialization', () => {
    test('should create logger instance with default options', () => {
      expect(testLogger).toBeInstanceOf(Logger);
      expect(testLogger.level).toBe('DEBUG');
    });

    test('should set log level correctly', () => {
      const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
      levels.forEach(level => {
        const logger = createLogger({ level, logDir: testLogDir });
        expect(logger.level).toBe(level);
      });
    });

    test('should create log directory if not exists', () => {
      const newDir = path.join(__dirname, '../temp/nested/logs');
      const logger = createLogger({ logDir: newDir });

      expect(fs.existsSync(newDir)).toBe(true);

      // Cleanup
      const files = fs.readdirSync(newDir);
      files.forEach(file => fs.unlinkSync(path.join(newDir, file)));
      fs.rmdirSync(newDir);
      fs.rmdirSync(path.join(__dirname, '../temp/nested'));
    });

    test('should set rotation policy', () => {
      const logger = createLogger({
        logDir: testLogDir,
        rotationDays: 14,
        maxFileSizeMB: 100
      });

      expect(logger.rotationDays).toBe(14);
      expect(logger.maxFileSizeMB).toBe(100);
    });
  });

  describe('Log Level Filtering', () => {
    test('DEBUG level should log all messages', async () => {
      testLogger = createLogger({
        level: 'DEBUG',
        logDir: testLogDir,
        environment: 'test'
      });

      await testLogger.debug('test', 'debug_event', {});
      await testLogger.info('test', 'info_event', {});
      await testLogger.warn('test', 'warn_event', {});
      await testLogger.error('test', 'error_event', {});

      // Flush to ensure all writes complete
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBe(4);
    });

    test('INFO level should filter DEBUG messages', async () => {
      testLogger = createLogger({
        level: 'INFO',
        logDir: testLogDir,
        environment: 'test'
      });

      await testLogger.debug('test', 'debug_event', {});
      await testLogger.info('test', 'info_event', {});
      await testLogger.warn('test', 'warn_event', {});
      await testLogger.error('test', 'error_event', {});

      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBe(3);
      expect(logs[0]).toContain('INFO');
    });

    test('WARN level should only log WARN and ERROR', async () => {
      testLogger = createLogger({
        level: 'WARN',
        logDir: testLogDir,
        environment: 'test'
      });

      await testLogger.debug('test', 'debug_event', {});
      await testLogger.info('test', 'info_event', {});
      await testLogger.warn('test', 'warn_event', {});
      await testLogger.error('test', 'error_event', {});

      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBe(2);
      expect(logs[0]).toContain('WARN');
      expect(logs[1]).toContain('ERROR');
    });

    test('ERROR level should only log ERROR', async () => {
      testLogger = createLogger({
        level: 'ERROR',
        logDir: testLogDir,
        environment: 'test'
      });

      await testLogger.debug('test', 'debug_event', {});
      await testLogger.info('test', 'info_event', {});
      await testLogger.warn('test', 'warn_event', {});
      await testLogger.error('test', 'error_event', {});

      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('ERROR');
    });

    test('shouldLog method should respect level hierarchy', () => {
      const logger = createLogger({ level: 'WARN', logDir: testLogDir });

      expect(logger.shouldLog('DEBUG')).toBe(false);
      expect(logger.shouldLog('INFO')).toBe(false);
      expect(logger.shouldLog('WARN')).toBe(true);
      expect(logger.shouldLog('ERROR')).toBe(true);
    });
  });

  describe('Structured Logging Format', () => {
    test('should create valid JSON log entries', async () => {
      await testLogger.info('test-component', 'test_event', { key: 'value' });
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level');
      expect(logEntry).toHaveProperty('component');
      expect(logEntry).toHaveProperty('event');
      expect(logEntry).toHaveProperty('metadata');
    });

    test('should include correct component name', async () => {
      await testLogger.info('mind-loader', 'test_event', {});
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      expect(logEntry.component).toBe('mind-loader');
    });

    test('should include correct event name', async () => {
      await testLogger.info('test', 'mind_loading_started', {});
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      expect(logEntry.event).toBe('mind_loading_started');
    });

    test('should preserve metadata object with environment', async () => {
      const metadata = {
        duration_ms: 123,
        cached: true,
        config_source: 'file'
      };

      await testLogger.info('test', 'test_event', metadata);
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      // Implementation adds 'environment' to metadata
      expect(logEntry.metadata.duration_ms).toBe(123);
      expect(logEntry.metadata.cached).toBe(true);
      expect(logEntry.metadata.config_source).toBe('file');
      expect(logEntry.metadata.environment).toBe('test');
    });

    test('should include valid ISO timestamp', async () => {
      await testLogger.info('test', 'test_event', {});
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      const timestamp = new Date(logEntry.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(logEntry.timestamp);
    });
  });

  describe('Async Batching and Flush', () => {
    test('should batch writes to write queue', async () => {
      await testLogger.info('test', 'event1', {});
      await testLogger.info('test', 'event2', {});
      await testLogger.info('test', 'event3', {});

      // Queue should have entries before flush
      expect(testLogger.writeQueue.length).toBeGreaterThan(0);

      await testLogger.flush();

      // Queue should be empty after flush
      expect(testLogger.writeQueue.length).toBe(0);
    });

    test('should write logs to disk after flush', async () => {
      await testLogger.info('test', 'test_event', { data: 'test' });

      const logPath = testLogger.getLogFilePath('main');

      // File might not exist before flush
      const beforeFlush = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

      await testLogger.flush();

      // File must exist after flush with content
      expect(fs.existsSync(logPath)).toBe(true);
      const afterFlush = fs.readFileSync(logPath, 'utf8');
      expect(afterFlush.length).toBeGreaterThan(beforeFlush.length);
    });

    test('should handle multiple flushes', async () => {
      await testLogger.info('test', 'event1', {});
      await testLogger.flush();

      await testLogger.info('test', 'event2', {});
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBe(2);
    });

    test('should not flush when already flushing', async () => {
      // Add many logs
      for (let i = 0; i < 100; i++) {
        await testLogger.info('test', `event_${i}`, {});
      }

      // Call flush multiple times in parallel
      const flushPromises = [
        testLogger.flush(),
        testLogger.flush(),
        testLogger.flush()
      ];

      await Promise.all(flushPromises);

      // All logs should still be written once
      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBe(100);
    });
  });

  describe('Performance', () => {
    test('should log 1000 entries in <100ms', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        await testLogger.info('test', `event_${i}`, { index: i });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);

      await testLogger.flush();
    });

    test('should have <5ms overhead per log entry', async () => {
      const iterations = 100;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await testLogger.info('test', 'test_event', { index: i });
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      expect(avgDuration).toBeLessThan(5); // Target is <5ms
    });
  });

  describe('Log Files by Type', () => {
    test('should write to main log file', async () => {
      await testLogger.info('test', 'test_event', {});
      await testLogger.flush();

      const mainLog = testLogger.getLogFilePath('main');
      expect(fs.existsSync(mainLog)).toBe(true);
    });

    test('should write fallback events to fallback log', async () => {
      await testLogger.info('fallback', 'fallback_triggered', { reason: 'test' });
      await testLogger.flush();

      const fallbackLog = testLogger.getLogFilePath('fallback');
      expect(fs.existsSync(fallbackLog)).toBe(true);

      const logs = fs.readFileSync(fallbackLog, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain('fallback_triggered');
    });

    test('should write performance metrics to performance log', async () => {
      await testLogger.logPerformance({
        operation: 'mind_load',
        duration_ms: 123,
        cached: false
      });
      await testLogger.flush();

      const perfLog = testLogger.getLogFilePath('performance');
      expect(fs.existsSync(perfLog)).toBe(true);

      const content = fs.readFileSync(perfLog, 'utf8');
      const entry = JSON.parse(content.split('\n')[0]);
      expect(entry.operation).toBe('mind_load');
      expect(entry.duration_ms).toBe(123);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty metadata', async () => {
      await testLogger.info('test', 'test_event', {});
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      expect(logEntry.metadata).toHaveProperty('environment');
    });

    test('should handle nested metadata objects', async () => {
      const metadata = {
        level1: {
          level2: {
            level3: 'value'
          }
        }
      };

      await testLogger.info('test', 'test_event', metadata);
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      expect(logEntry.metadata.level1.level2.level3).toBe('value');
    });

    test('should handle special characters in strings', async () => {
      const metadata = {
        message: 'Test with "quotes" and \'apostrophes\'',
        path: 'C:\\Users\\test\\file.txt'
      };

      await testLogger.info('test', 'test_event', metadata);
      await testLogger.flush();

      const logPath = testLogger.getLogFilePath('main');
      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      const logEntry = JSON.parse(logs[0]);

      expect(logEntry.metadata.message).toBe(metadata.message);
      expect(logEntry.metadata.path).toBe(metadata.path);
    });
  });

  describe('Singleton Instance', () => {
    test('getLogger should return same instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();

      expect(logger1).toBe(logger2);
    });

    test('createLogger should return new instance', () => {
      const logger1 = createLogger({ logDir: path.join(testLogDir, 'log1') });
      const logger2 = createLogger({ logDir: path.join(testLogDir, 'log2') });

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('File Rotation and Cleanup', () => {
    test('should generate date-based log file names', () => {
      const mainLog = testLogger.getLogFilePath('main');
      const perfLog = testLogger.getLogFilePath('performance');
      const fallbackLog = testLogger.getLogFilePath('fallback');

      expect(mainLog).toContain('hybrid-ops-');
      expect(mainLog).toContain('.log');
      expect(perfLog).toContain('performance-');
      expect(perfLog).toContain('.json');
      expect(fallbackLog).toContain('fallback-');
      expect(fallbackLog).toContain('.log');
    });

    test('cleanupOldLogs should be callable', async () => {
      // Method exists and can be called
      await expect(testLogger.cleanupOldLogs()).resolves.not.toThrow();
    });

    test('should have rotation policy properties', () => {
      expect(testLogger.rotationDays).toBeDefined();
      expect(testLogger.maxFileSizeMB).toBeDefined();
      expect(typeof testLogger.rotationDays).toBe('number');
      expect(typeof testLogger.maxFileSizeMB).toBe('number');
    });
  });

  describe('Shutdown', () => {
    test('should flush on shutdown', async () => {
      await testLogger.info('test', 'final_event', {});
      await testLogger.shutdown();

      const logPath = testLogger.getLogFilePath('main');
      expect(fs.existsSync(logPath)).toBe(true);

      const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('final_event');
    });
  });
});
