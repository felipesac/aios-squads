/**
 * Baseline Performance Benchmark
 *
 * Profiles the CURRENT (unoptimized) implementation to establish baseline metrics.
 * Tests scenarios with 10, 50, 100, and 500 tasks to identify bottlenecks.
 *
 * This script is for Phase A (Profiling) of Story 1.10.
 * Results will guide optimization efforts in Phase B.
 *
 * @module tests/performance/baseline-benchmark
 * @created 2025-01-19 (Story 1.10 - Phase A)
 */

const { PerformanceProfiler } = require('../../utils/performance-profiler');
const { PedroValerioMind } = require('../../utils/mind-loader');
const { AxiomaValidator } = require('../../utils/axioma-validator');

/**
 * Baseline Benchmark Runner
 */
class BaselineBenchmark {
  constructor() {
    this.profiler = new PerformanceProfiler();
    this.mind = null;
    this.validator = null;
  }

  /**
   * Run all baseline benchmark scenarios
   */
  async runAll() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  BASELINE PERFORMANCE BENCHMARK (Story 1.10 Phase A)  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 Testing CURRENT (unoptimized) implementation\n');
    console.log('Scenarios:');
    console.log('  1. Mind loading (cold start)');
    console.log('  2. Mind loading (warm start)');
    console.log('  3. Heuristic execution (10 tasks)');
    console.log('  4. Heuristic execution (50 tasks)');
    console.log('  5. Heuristic execution (100 tasks)');
    console.log('  6. Heuristic execution (500 tasks)');
    console.log('  7. Axioma validation (10 tasks)');
    console.log('  8. Axioma validation (50 tasks)');
    console.log('  9. Axioma validation (100 tasks)');
    console.log('  10. Axioma validation (500 tasks)\n');

    try {
      // Scenario 1: Cold mind loading
      await this.benchmarkMindLoadingCold();

      // Scenario 2: Warm mind loading (cache hit)
      await this.benchmarkMindLoadingWarm();

      // Scenarios 3-6: Heuristic execution at scale
      await this.benchmarkHeuristicExecution(10);
      await this.benchmarkHeuristicExecution(50);
      await this.benchmarkHeuristicExecution(100);
      await this.benchmarkHeuristicExecution(500);

      // Scenarios 7-10: Axioma validation at scale
      await this.benchmarkAxiomaValidation(10);
      await this.benchmarkAxiomaValidation(50);
      await this.benchmarkAxiomaValidation(100);
      await this.benchmarkAxiomaValidation(500);

      // Generate comprehensive report
      this.generateBaselineReport();

    } catch (error) {
      console.error('\n❌ Benchmark failed:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  /**
   * Benchmark: Mind loading (cold start - no cache)
   */
  async benchmarkMindLoadingCold() {
    console.log('Running: Mind loading (cold start)...');

    const start = this.profiler.startTimer('mind-loading-cold');

    this.mind = new PedroValerioMind();
    await this.mind.load();

    this.profiler.endTimer('mind-loading-cold', start);

    const stats = this.profiler.getStats('mind-loading-cold');
    console.log(`  ✓ Completed in ${stats.mean.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark: Mind loading (warm start - should hit cache)
   */
  async benchmarkMindLoadingWarm() {
    console.log('Running: Mind loading (warm start - cached)...');

    const start = this.profiler.startTimer('mind-loading-warm');

    // Should return immediately (already loaded)
    await this.mind.load();

    this.profiler.endTimer('mind-loading-warm', start);

    const stats = this.profiler.getStats('mind-loading-warm');
    console.log(`  ✓ Completed in ${stats.mean.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark: Heuristic execution at scale
   * @param {number} taskCount - Number of tasks to process
   */
  async benchmarkHeuristicExecution(taskCount) {
    console.log(`Running: Heuristic execution (${taskCount} tasks)...`);

    const operationName = `heuristic-execution-${taskCount}`;

    for (let i = 0; i < taskCount; i++) {
      const start = this.profiler.startTimer(operationName);

      // Execute each heuristic (PV_BS_001, PV_PA_001, PV_PM_001)
      await this.executeAllHeuristics({
        taskId: `task-${i}`,
        endStateClarity: 0.8 + Math.random() * 0.2,
        truthfulness: 0.7 + Math.random() * 0.3,
        automationReadiness: 0.6 + Math.random() * 0.4
      });

      this.profiler.endTimer(operationName, start);
    }

    const stats = this.profiler.getStats(operationName);
    console.log(`  ✓ Processed ${taskCount} tasks`);
    console.log(`    Mean: ${stats.mean.toFixed(2)}ms | P95: ${stats.p95.toFixed(2)}ms | P99: ${stats.p99.toFixed(2)}ms\n`);
  }

  /**
   * Benchmark: Axioma validation at scale
   * @param {number} taskCount - Number of validation operations
   */
  async benchmarkAxiomaValidation(taskCount) {
    console.log(`Running: Axioma validation (${taskCount} tasks)...`);

    if (!this.validator) {
      this.validator = new AxiomaValidator(this.mind.metaAxiomas);
    }

    const operationName = `axioma-validation-${taskCount}`;

    for (let i = 0; i < taskCount; i++) {
      const start = this.profiler.startTimer(operationName);

      // Validate task against axiomas
      await this.validator.validate({
        taskName: `Task ${i}`,
        description: 'Sample task for baseline profiling',
        completeness: 0.8 + Math.random() * 0.2,
        actionOrientation: 0.7 + Math.random() * 0.3,
        progressIndicators: 0.8 + Math.random() * 0.2,
        riskMitigation: 0.6 + Math.random() * 0.4
      });

      this.profiler.endTimer(operationName, start);
    }

    const stats = this.profiler.getStats(operationName);
    console.log(`  ✓ Validated ${taskCount} tasks`);
    console.log(`    Mean: ${stats.mean.toFixed(2)}ms | P95: ${stats.p95.toFixed(2)}ms | P99: ${stats.p99.toFixed(2)}ms\n`);
  }

  /**
   * Execute all three heuristics on a task context
   * @param {Object} context - Task context
   */
  async executeAllHeuristics(context) {
    // PV_BS_001: Future Back-Casting
    this.mind.futureBackCasting(context);

    // PV_PA_001: Coherence Scan
    this.mind.coherenceScan({
      person: {
        truthfulness: context.truthfulness,
        systemAdherence: 0.85,
        skillMatch: 0.9
      }
    });

    // PV_PM_001: Automation Check
    this.mind.automationCheck({
      frequency: 5,
      standardization: 0.8,
      riskLevel: 'low',
      automationReadiness: context.automationReadiness
    });
  }

  /**
   * Generate comprehensive baseline report
   */
  generateBaselineReport() {
    console.log('\n' + '═'.repeat(70));
    console.log('BASELINE PERFORMANCE REPORT');
    console.log('═'.repeat(70) + '\n');

    const report = this.profiler.generateReport();

    // Mind Loading Performance
    console.log('🧠 MIND LOADING PERFORMANCE\n');

    const coldStats = report['mind-loading-cold'];
    const warmStats = report['mind-loading-warm'];

    console.log('  Cold Start (first load):');
    console.log(`    Duration: ${coldStats.mean.toFixed(2)}ms`);
    console.log(`    Target:   <500ms (${this.profiler.meetsTarget('mind-loading-cold', 500) ? '✅ PASS' : '❌ FAIL'})`);

    console.log('\n  Warm Start (cached):');
    console.log(`    Duration: ${warmStats.mean.toFixed(2)}ms`);
    console.log(`    Target:   <10ms (${this.profiler.meetsTarget('mind-loading-warm', 10) ? '✅ PASS' : '❌ FAIL'})`);

    // Heuristic Execution Performance
    console.log('\n⚡ HEURISTIC EXECUTION PERFORMANCE\n');

    const heuristicScenarios = [10, 50, 100, 500];
    heuristicScenarios.forEach(count => {
      const stats = report[`heuristic-execution-${count}`];
      if (stats) {
        console.log(`  ${count} tasks:`);
        console.log(`    Mean:   ${stats.mean.toFixed(2)}ms`);
        console.log(`    P95:    ${stats.p95.toFixed(2)}ms`);
        console.log(`    P99:    ${stats.p99.toFixed(2)}ms`);
        console.log(`    Target: <50ms P95 (${this.profiler.meetsTarget(`heuristic-execution-${count}`, 50) ? '✅ PASS' : '❌ FAIL'})\n`);
      }
    });

    // Axioma Validation Performance
    console.log('🔍 AXIOMA VALIDATION PERFORMANCE\n');

    heuristicScenarios.forEach(count => {
      const stats = report[`axioma-validation-${count}`];
      if (stats) {
        console.log(`  ${count} tasks:`);
        console.log(`    Mean:   ${stats.mean.toFixed(2)}ms`);
        console.log(`    P95:    ${stats.p95.toFixed(2)}ms`);
        console.log(`    P99:    ${stats.p99.toFixed(2)}ms`);
        console.log(`    Target: <50ms P95 (${this.profiler.meetsTarget(`axioma-validation-${count}`, 50) ? '✅ PASS' : '❌ FAIL'})\n`);
      }
    });

    // Overall Validation Overhead
    console.log('📊 OVERALL VALIDATION OVERHEAD\n');

    // Calculate total validation time (heuristic + axioma)
    const validation100Stats = {
      mean: (report['heuristic-execution-100']?.mean || 0) + (report['axioma-validation-100']?.mean || 0),
      p95: (report['heuristic-execution-100']?.p95 || 0) + (report['axioma-validation-100']?.p95 || 0)
    };

    console.log(`  Total overhead (100 tasks):`);
    console.log(`    Mean:   ${validation100Stats.mean.toFixed(2)}ms`);
    console.log(`    P95:    ${validation100Stats.p95.toFixed(2)}ms`);
    console.log(`    Target: <100ms P95 (${validation100Stats.p95 < 100 ? '✅ PASS' : '❌ FAIL'})\n`);

    // Memory Usage (current snapshot)
    const memUsage = process.memoryUsage();
    console.log('💾 MEMORY USAGE (Current Snapshot)\n');
    console.log(`  Heap Used:  ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  RSS:        ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Target:     <100 MB per session (${(memUsage.heapUsed / 1024 / 1024) < 100 ? '✅ PASS' : '❌ FAIL'})\n`);

    console.log('═'.repeat(70));
    console.log('✅ Baseline benchmark complete!');
    console.log('📄 Use this data to guide Phase B optimization efforts');
    console.log('═'.repeat(70) + '\n');

    // Save report to file
    const fs = require('fs').promises;
    const path = require('path');
    const reportPath = path.join(__dirname, '../reports', `baseline-benchmark-${Date.now()}.json`);

    fs.mkdir(path.dirname(reportPath), { recursive: true })
      .then(() => fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        baseline: report,
        memoryUsage: memUsage,
        nodeVersion: process.version,
        platform: process.platform
      }, null, 2)))
      .then(() => console.log(`\n📁 Detailed report saved: ${reportPath}`))
      .catch(err => console.warn(`⚠️  Could not save report: ${err.message}`));
  }
}

/**
 * Execute baseline benchmark if run directly
 */
if (require.main === module) {
  const benchmark = new BaselineBenchmark();

  benchmark.runAll()
    .then(() => {
      console.log('\n✅ Baseline benchmark completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Baseline benchmark failed:', error);
      process.exit(1);
    });
}

module.exports = { BaselineBenchmark };
