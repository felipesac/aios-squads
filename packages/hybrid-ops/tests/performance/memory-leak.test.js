/**
 * Memory Leak Test (8-Hour Simulation)
 *
 * Simulates long-running session to detect memory leaks.
 * Tests AC5: No memory leaks over 8-hour session (<10% growth)
 *
 * This test creates 1000 sessions (simulating heavy usage over 8 hours),
 * runs validation workflows, and measures memory growth.
 *
 * @module tests/performance/memory-leak
 * @created 2025-10-19 (Story 1.10 - Phase C Step 9)
 */

const { getSessionManager, resetSessionManager } = require('../../utils/session-manager');
const { AxiomaValidator } = require('../../utils/axioma-validator');

/**
 * Memory Leak Detector
 */
class MemoryLeakTest {
  constructor(options = {}) {
    this.sessions = [];
    this.iterations = options.iterations || 1000;
    this.gcInterval = options.gcInterval || 100;
    this.samplingInterval = options.samplingInterval || 50;
    this.memorySnapshots = [];
  }

  /**
   * Run memory leak test
   */
  async run() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  MEMORY LEAK TEST (8-Hour Simulation)                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`Configuration:`);
    console.log(`  Iterations: ${this.iterations} (simulates heavy 8-hour usage)`);
    console.log(`  GC Interval: Every ${this.gcInterval} iterations`);
    console.log(`  Memory Sampling: Every ${this.samplingInterval} iterations\n`);

    // Reset SessionManager to ensure clean start
    resetSessionManager();
    if (global.gc) {
      global.gc();
    }

    // Record initial memory
    const startMemory = process.memoryUsage();
    this.recordSnapshot(0, startMemory, 'START');

    console.log('Initial Memory:');
    console.log(`  Heap Used:  ${this.formatBytes(startMemory.heapUsed)}`);
    console.log(`  Heap Total: ${this.formatBytes(startMemory.heapTotal)}`);
    console.log(`  RSS:        ${this.formatBytes(startMemory.rss)}\n`);

    console.log('🔄 Running session simulation...\n');

    const startTime = Date.now();

    // Warm-up: Run first session to load mind (not counted in growth)
    await this.simulateSession(0);
    if (global.gc) {
      global.gc();
    }

    // Re-baseline AFTER mind is loaded
    const baselineMemory = process.memoryUsage();
    this.recordSnapshot(1, baselineMemory, 'BASELINE');

    console.log('Baseline Memory (after mind load):');
    console.log(`  Heap Used:  ${this.formatBytes(baselineMemory.heapUsed)}`);
    console.log(`  Heap Total: ${this.formatBytes(baselineMemory.heapTotal)}`);
    console.log(`  RSS:        ${this.formatBytes(baselineMemory.rss)}\n`);

    console.log('🔄 Running session simulation (excluding warm-up)...\n');

    // Simulate remaining sessions (8-hour heavy usage)
    for (let i = 1; i < this.iterations; i++) {
      await this.simulateSession(i);

      // Periodic garbage collection
      if (i % this.gcInterval === 0 && i > 0) {
        if (global.gc) {
          global.gc();
        }

        // Sample memory
        if (i % this.samplingInterval === 0) {
          const currentMemory = process.memoryUsage();
          this.recordSnapshot(i, currentMemory);

          // Progress indicator
          const progress = ((i / this.iterations) * 100).toFixed(1);
          console.log(`  [${progress}%] Session ${i}: Heap ${this.formatBytes(currentMemory.heapUsed)}`);
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Final GC
    if (global.gc) {
      global.gc();
    }

    // Record final memory
    const endMemory = process.memoryUsage();
    this.recordSnapshot(this.iterations, endMemory, 'END');

    console.log(`\n✅ Simulation complete in ${(duration / 1000).toFixed(2)}s\n`);

    // Analyze results (compare to baseline AFTER mind load, not initial state)
    this.analyzeMemoryGrowth(baselineMemory, endMemory);
  }

  /**
   * Simulate a single session: load mind, run validation, cleanup
   */
  async simulateSession(sessionId) {
    // Use SessionManager to get/create session (reuses shared mind)
    const sessionManager = getSessionManager();
    const session = await sessionManager.getSession(`session-${sessionId}`);
    const mind = session.mind;

    const validator = new AxiomaValidator(mind.metaAxiomas);

    // Execute heuristics (simulating workflow)
    for (let i = 0; i < 10; i++) {
      // Heuristic execution
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

      // Axioma validation
      await validator.validate({
        taskName: `Task ${i}`,
        description: 'Sample validation task',
        completeness: 0.8 + Math.random() * 0.2,
        actionOrientation: 0.7 + Math.random() * 0.3,
        progressIndicators: 0.8 + Math.random() * 0.2,
        riskMitigation: 0.6 + Math.random() * 0.4
      });
    }

    // End session (cleanup)
    sessionManager.endSession(`session-${sessionId}`);
  }

  /**
   * Record memory snapshot
   */
  recordSnapshot(iteration, memory, label = null) {
    this.memorySnapshots.push({
      iteration,
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      rss: memory.rss,
      external: memory.external,
      label
    });
  }

  /**
   * Analyze memory growth and detect leaks
   */
  analyzeMemoryGrowth(startMemory, endMemory) {
    console.log('═'.repeat(70));
    console.log('MEMORY LEAK ANALYSIS');
    console.log('═'.repeat(70) + '\n');

    // Calculate growth
    const heapGrowth = endMemory.heapUsed - startMemory.heapUsed;
    const heapGrowthPercent = (heapGrowth / startMemory.heapUsed) * 100;

    const totalGrowth = endMemory.heapTotal - startMemory.heapTotal;
    const totalGrowthPercent = (totalGrowth / startMemory.heapTotal) * 100;

    const rssGrowth = endMemory.rss - startMemory.rss;
    const rssGrowthPercent = (rssGrowth / startMemory.rss) * 100;

    console.log('📊 Memory Growth Analysis:\n');

    console.log('  Heap Used:');
    console.log(`    Start:  ${this.formatBytes(startMemory.heapUsed)}`);
    console.log(`    End:    ${this.formatBytes(endMemory.heapUsed)}`);
    console.log(`    Growth: ${this.formatBytes(heapGrowth)} (${heapGrowthPercent.toFixed(2)}%)`);
    console.log(`    Target: <10% ${heapGrowthPercent < 10 ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('  Heap Total:');
    console.log(`    Start:  ${this.formatBytes(startMemory.heapTotal)}`);
    console.log(`    End:    ${this.formatBytes(endMemory.heapTotal)}`);
    console.log(`    Growth: ${this.formatBytes(totalGrowth)} (${totalGrowthPercent.toFixed(2)}%)\n`);

    console.log('  RSS (Resident Set Size):');
    console.log(`    Start:  ${this.formatBytes(startMemory.rss)}`);
    console.log(`    End:    ${this.formatBytes(endMemory.rss)}`);
    console.log(`    Growth: ${this.formatBytes(rssGrowth)} (${rssGrowthPercent.toFixed(2)}%)\n`);

    // Trend analysis
    if (this.memorySnapshots.length > 2) {
      console.log('📈 Memory Trend Analysis:\n');

      const snapshots = this.memorySnapshots.filter(s => !s.label);
      if (snapshots.length > 0) {
        const firstHalf = snapshots.slice(0, Math.floor(snapshots.length / 2));
        const secondHalf = snapshots.slice(Math.floor(snapshots.length / 2));

        const avgFirstHalf = firstHalf.reduce((sum, s) => sum + s.heapUsed, 0) / firstHalf.length;
        const avgSecondHalf = secondHalf.reduce((sum, s) => sum + s.heapUsed, 0) / secondHalf.length;

        const trendGrowth = avgSecondHalf - avgFirstHalf;
        const trendGrowthPercent = (trendGrowth / avgFirstHalf) * 100;

        console.log(`  First Half Average:  ${this.formatBytes(avgFirstHalf)}`);
        console.log(`  Second Half Average: ${this.formatBytes(avgSecondHalf)}`);
        console.log(`  Trend Growth: ${this.formatBytes(trendGrowth)} (${trendGrowthPercent.toFixed(2)}%)`);

        if (trendGrowthPercent > 5) {
          console.log(`  ⚠️  WARNING: Memory trending upward (>5% growth)\n`);
        } else {
          console.log(`  ✅ Memory stable (trend <5%)\n`);
        }
      }
    }

    // Final verdict
    console.log('═'.repeat(70));

    if (heapGrowthPercent < 10) {
      console.log('✅ MEMORY LEAK TEST PASSED');
      console.log(`   Heap growth: ${heapGrowthPercent.toFixed(2)}% (target: <10%)`);
      console.log('   No memory leaks detected over simulated 8-hour session');
    } else {
      console.log('❌ MEMORY LEAK TEST FAILED');
      console.log(`   Heap growth: ${heapGrowthPercent.toFixed(2)}% (target: <10%)`);
      console.log('   ⚠️  Potential memory leak detected!');
    }

    console.log('═'.repeat(70) + '\n');

    // Save detailed report
    this.saveReport({
      startMemory,
      endMemory,
      heapGrowthPercent,
      totalGrowthPercent,
      rssGrowthPercent,
      passed: heapGrowthPercent < 10,
      snapshots: this.memorySnapshots
    });

    // Assert for test frameworks
    if (heapGrowthPercent >= 10) {
      throw new Error(`Memory leak detected: ${heapGrowthPercent.toFixed(2)}% growth (target: <10%)`);
    }
  }

  /**
   * Save detailed report to file
   */
  async saveReport(data) {
    const fs = require('fs').promises;
    const path = require('path');

    const reportDir = path.join(__dirname, '../reports');
    const reportPath = path.join(reportDir, `memory-leak-test-${Date.now()}.json`);

    try {
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testConfig: {
          iterations: this.iterations,
          gcInterval: this.gcInterval,
          samplingInterval: this.samplingInterval
        },
        results: data,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          gcAvailable: !!global.gc
        }
      }, null, 2));

      console.log(`📄 Detailed report saved: ${reportPath}\n`);
    } catch (err) {
      console.warn(`⚠️  Could not save report: ${err.message}\n`);
    }
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  }
}

/**
 * Execute memory leak test if run directly
 */
if (require.main === module) {
  // Check if --expose-gc flag is set
  if (!global.gc) {
    console.warn('⚠️  WARNING: Run with --expose-gc flag for accurate results:');
    console.warn('   node --expose-gc tests/performance/memory-leak.test.js\n');
  }

  const test = new MemoryLeakTest({
    iterations: 1000,      // Simulates heavy 8-hour usage
    gcInterval: 100,       // Force GC every 100 iterations
    samplingInterval: 50   // Sample memory every 50 iterations
  });

  test.run()
    .then(() => {
      console.log('✅ Memory leak test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Memory leak test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { MemoryLeakTest };
