/**
 * Performance Regression Tests
 *
 * Validates that performance targets are maintained across code changes.
 * These tests lock in the baseline performance established in Story 1.10 Phase A.
 *
 * Baseline Results (2025-10-19):
 * - Mind loading (first): 17.87ms (target: <500ms)
 * - Mind loading (cached): 0.01ms (target: <10ms)
 * - Heuristic execution: 0.00-0.22ms P95 (target: <50ms)
 * - Axioma validation: 0.01-0.37ms P95 (target: <50ms)
 * - Total validation overhead: 0.01ms P95 (target: <100ms)
 * - Memory usage: 10.69 MB (target: <100MB)
 * - Memory growth (8h): 1.23% (target: <10%)
 *
 * @module tests/performance/regression
 * @created 2025-10-19 (Story 1.10 - Phase C Step 10)
 */

const { performance } = require('perf_hooks');
const { loadMind } = require('../../utils/mind-loader');
const { getSessionManager, resetSessionManager } = require('../../utils/session-manager');
const { AxiomaValidator } = require('../../utils/axioma-validator');

/**
 * Calculate percentile from array of values
 */
function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Format milliseconds for display
 */
function formatMs(ms) {
  return `${ms.toFixed(2)}ms`;
}

/**
 * Performance Regression Test Suite
 */
class PerformanceRegressionTests {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: []
    };
  }

  /**
   * Run all regression tests
   */
  async runAll() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  PERFORMANCE REGRESSION TESTS                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('Running regression tests to validate performance targets...\n');

    try {
      // Test 1: Mind loading (first load)
      await this.testMindLoadingFirst();

      // Test 2: Mind loading (cached)
      await this.testMindLoadingCached();

      // Test 3: Heuristic execution performance
      await this.testHeuristicExecution();

      // Test 4: Axioma validation performance
      await this.testAxiomaValidation();

      // Test 5: Total validation overhead
      await this.testValidationOverhead();

      // Test 6: Memory usage per session
      await this.testMemoryUsage();

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('\n❌ Test suite failed with error:', error.message);
      throw error;
    }
  }

  /**
   * Test 1: Mind loading (first load) - target <500ms
   */
  async testMindLoadingFirst() {
    const testName = 'Mind loading (first load)';
    const target = 500; // ms

    try {
      // Reset to force fresh load
      resetSessionManager();
      if (global.gc) global.gc();

      const start = performance.now();
      await loadMind();
      const duration = performance.now() - start;

      const passed = duration < target;
      this.recordResult(testName, passed, {
        duration: formatMs(duration),
        target: `<${target}ms`,
        status: passed ? 'PASS' : 'FAIL'
      });

      console.log(`${passed ? '✅' : '❌'} ${testName}: ${formatMs(duration)} (target: <${target}ms)`);

      if (!passed) {
        throw new Error(`${testName} failed: ${formatMs(duration)} exceeds target of ${target}ms`);
      }

    } catch (error) {
      this.recordResult(testName, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Test 2: Mind loading (cached) - target <10ms
   */
  async testMindLoadingCached() {
    const testName = 'Mind loading (cached)';
    const target = 10; // ms

    try {
      // Mind already loaded from previous test
      const start = performance.now();
      await loadMind();
      const duration = performance.now() - start;

      const passed = duration < target;
      this.recordResult(testName, passed, {
        duration: formatMs(duration),
        target: `<${target}ms`,
        status: passed ? 'PASS' : 'FAIL'
      });

      console.log(`${passed ? '✅' : '❌'} ${testName}: ${formatMs(duration)} (target: <${target}ms)`);

      if (!passed) {
        throw new Error(`${testName} failed: ${formatMs(duration)} exceeds target of ${target}ms`);
      }

    } catch (error) {
      this.recordResult(testName, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Test 3: Heuristic execution - target <50ms P95
   */
  async testHeuristicExecution() {
    const testName = 'Heuristic execution (P95)';
    const target = 50; // ms
    const iterations = 100;

    try {
      const mind = await loadMind();
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Execute all three core heuristics
        mind.futureBackCasting({
          endStateClarity: 0.8 + Math.random() * 0.2,
          marketAlignment: 0.7 + Math.random() * 0.3
        });

        mind.coherenceScan({
          person: {
            truthfulness: 0.7 + Math.random() * 0.3,
            systemAdherence: 0.85,
            skillMatch: 0.9
          }
        });

        mind.automationCheck({
          frequency: 5,
          standardization: 0.8,
          riskLevel: 'low',
          automationReadiness: 0.6 + Math.random() * 0.4
        });

        durations.push(performance.now() - start);
      }

      const p95 = percentile(durations, 0.95);
      const passed = p95 < target;

      this.recordResult(testName, passed, {
        p95: formatMs(p95),
        mean: formatMs(durations.reduce((a, b) => a + b, 0) / durations.length),
        target: `<${target}ms`,
        status: passed ? 'PASS' : 'FAIL'
      });

      console.log(`${passed ? '✅' : '❌'} ${testName}: ${formatMs(p95)} (target: <${target}ms)`);

      if (!passed) {
        throw new Error(`${testName} failed: ${formatMs(p95)} exceeds target of ${target}ms`);
      }

    } catch (error) {
      this.recordResult(testName, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Test 4: Axioma validation - target <50ms P95
   */
  async testAxiomaValidation() {
    const testName = 'Axioma validation (P95)';
    const target = 50; // ms
    const iterations = 100;

    try {
      const mind = await loadMind();
      const validator = new AxiomaValidator(mind.metaAxiomas);
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        await validator.validate({
          taskName: `Regression Test Task ${i}`,
          description: 'Sample validation task for regression testing',
          completeness: 0.8 + Math.random() * 0.2,
          actionOrientation: 0.7 + Math.random() * 0.3,
          progressIndicators: 0.8 + Math.random() * 0.2,
          riskMitigation: 0.6 + Math.random() * 0.4
        });

        durations.push(performance.now() - start);
      }

      const p95 = percentile(durations, 0.95);
      const passed = p95 < target;

      this.recordResult(testName, passed, {
        p95: formatMs(p95),
        mean: formatMs(durations.reduce((a, b) => a + b, 0) / durations.length),
        target: `<${target}ms`,
        status: passed ? 'PASS' : 'FAIL'
      });

      console.log(`${passed ? '✅' : '❌'} ${testName}: ${formatMs(p95)} (target: <${target}ms)`);

      if (!passed) {
        throw new Error(`${testName} failed: ${formatMs(p95)} exceeds target of ${target}ms`);
      }

    } catch (error) {
      this.recordResult(testName, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Test 5: Total validation overhead (heuristic + axioma) - target <100ms P95
   */
  async testValidationOverhead() {
    const testName = 'Total validation overhead (P95)';
    const target = 100; // ms
    const iterations = 100;

    try {
      const mind = await loadMind();
      const validator = new AxiomaValidator(mind.metaAxiomas);
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Execute heuristics
        mind.futureBackCasting({
          endStateClarity: 0.8 + Math.random() * 0.2,
          marketAlignment: 0.7 + Math.random() * 0.3
        });

        mind.coherenceScan({
          person: {
            truthfulness: 0.7 + Math.random() * 0.3,
            systemAdherence: 0.85,
            skillMatch: 0.9
          }
        });

        mind.automationCheck({
          frequency: 5,
          standardization: 0.8,
          riskLevel: 'low',
          automationReadiness: 0.6 + Math.random() * 0.4
        });

        // Execute validation
        await validator.validate({
          taskName: `Overhead Test Task ${i}`,
          description: 'Sample task for overhead testing',
          completeness: 0.8 + Math.random() * 0.2,
          actionOrientation: 0.7 + Math.random() * 0.3,
          progressIndicators: 0.8 + Math.random() * 0.2,
          riskMitigation: 0.6 + Math.random() * 0.4
        });

        durations.push(performance.now() - start);
      }

      const p95 = percentile(durations, 0.95);
      const passed = p95 < target;

      this.recordResult(testName, passed, {
        p95: formatMs(p95),
        mean: formatMs(durations.reduce((a, b) => a + b, 0) / durations.length),
        target: `<${target}ms`,
        status: passed ? 'PASS' : 'FAIL'
      });

      console.log(`${passed ? '✅' : '❌'} ${testName}: ${formatMs(p95)} (target: <${target}ms)`);

      if (!passed) {
        throw new Error(`${testName} failed: ${formatMs(p95)} exceeds target of ${target}ms`);
      }

    } catch (error) {
      this.recordResult(testName, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Test 6: Memory usage per session - target <100MB
   */
  async testMemoryUsage() {
    const testName = 'Memory usage per session';
    const target = 100; // MB

    try {
      // Reset and force GC
      resetSessionManager();
      if (global.gc) global.gc();

      // Create session and simulate usage
      const sessionManager = getSessionManager();
      const session = await sessionManager.getSession('regression-test-session');
      const mind = session.mind;
      const validator = new AxiomaValidator(mind.metaAxiomas);

      // Simulate typical workflow (10 task validations)
      for (let i = 0; i < 10; i++) {
        mind.futureBackCasting({
          endStateClarity: 0.8 + Math.random() * 0.2,
          marketAlignment: 0.7 + Math.random() * 0.3
        });

        mind.coherenceScan({
          person: {
            truthfulness: 0.7 + Math.random() * 0.3,
            systemAdherence: 0.85,
            skillMatch: 0.9
          }
        });

        mind.automationCheck({
          frequency: 5,
          standardization: 0.8,
          riskLevel: 'low',
          automationReadiness: 0.6 + Math.random() * 0.4
        });

        await validator.validate({
          taskName: `Memory Test Task ${i}`,
          description: 'Sample task for memory testing',
          completeness: 0.8 + Math.random() * 0.2,
          actionOrientation: 0.7 + Math.random() * 0.3,
          progressIndicators: 0.8 + Math.random() * 0.2,
          riskMitigation: 0.6 + Math.random() * 0.4
        });
      }

      // Measure memory
      if (global.gc) global.gc();
      const memory = process.memoryUsage();
      const heapUsedMB = memory.heapUsed / 1024 / 1024;

      const passed = heapUsedMB < target;

      this.recordResult(testName, passed, {
        heapUsed: `${heapUsedMB.toFixed(2)} MB`,
        target: `<${target}MB`,
        status: passed ? 'PASS' : 'FAIL'
      });

      console.log(`${passed ? '✅' : '❌'} ${testName}: ${heapUsedMB.toFixed(2)} MB (target: <${target}MB)`);

      // Cleanup
      sessionManager.endSession('regression-test-session');

      if (!passed) {
        throw new Error(`${testName} failed: ${heapUsedMB.toFixed(2)}MB exceeds target of ${target}MB`);
      }

    } catch (error) {
      this.recordResult(testName, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Record test result
   */
  recordResult(testName, passed, details) {
    const result = { testName, passed, details };

    if (passed) {
      this.results.passed.push(result);
    } else {
      this.results.failed.push(result);
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '═'.repeat(70));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(70) + '\n');

    const total = this.results.passed.length + this.results.failed.length;
    const passRate = (this.results.passed.length / total * 100).toFixed(1);

    console.log(`Total Tests:  ${total}`);
    console.log(`Passed:       ${this.results.passed.length} ✅`);
    console.log(`Failed:       ${this.results.failed.length} ❌`);
    console.log(`Pass Rate:    ${passRate}%\n`);

    if (this.results.failed.length > 0) {
      console.log('Failed Tests:');
      this.results.failed.forEach(result => {
        console.log(`  ❌ ${result.testName}`);
        if (result.details.error) {
          console.log(`     Error: ${result.details.error}`);
        }
      });
      console.log();
    }

    console.log('═'.repeat(70));

    if (this.results.failed.length === 0) {
      console.log('✅ ALL REGRESSION TESTS PASSED');
      console.log('   Performance targets maintained');
    } else {
      console.log('❌ REGRESSION TESTS FAILED');
      console.log(`   ${this.results.failed.length} test(s) did not meet performance targets`);
    }

    console.log('═'.repeat(70) + '\n');
  }

  /**
   * Get test results
   */
  getResults() {
    return this.results;
  }
}

/**
 * Execute regression tests if run directly
 */
if (require.main === module) {
  // Check if --expose-gc flag is set
  if (!global.gc) {
    console.warn('⚠️  WARNING: Run with --expose-gc flag for accurate results:');
    console.warn('   node --expose-gc tests/performance/regression.test.js\n');
  }

  const tests = new PerformanceRegressionTests();

  tests.runAll()
    .then(() => {
      const results = tests.getResults();
      if (results.failed.length > 0) {
        console.error('❌ Regression tests failed');
        process.exit(1);
      } else {
        console.log('✅ All regression tests passed');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Regression test suite error:', error.message);
      process.exit(1);
    });
}

module.exports = { PerformanceRegressionTests };
