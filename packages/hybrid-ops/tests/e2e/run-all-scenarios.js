/**
 * @fileoverview Master Test Runner - Phase 4 Integration Testing
 *
 * Orchestrates execution of all 6 E2E test scenarios for Story 1.13.
 * Provides comprehensive test suite execution with aggregated reporting.
 *
 * Usage:
 *   node run-all-scenarios.js              # Run all scenarios
 *   node run-all-scenarios.js --scenario=1 # Run specific scenario
 *   node run-all-scenarios.js --verbose    # Verbose output
 *   node run-all-scenarios.js --parallel   # Run independent tests in parallel
 *
 * Scenarios:
 * - Scenario 1: E2E Success Path
 * - Scenario 2: Validation Gate Failures (2A-2E)
 * - Scenario 3: Dual-Mode Operation (3A-3D)
 * - Scenario 4: Performance Benchmarks (10/50/100/500)
 * - Scenario 5: Validation Accuracy (30 scenarios)
 * - Scenario 6: Regression Testing (6A-6D)
 *
 * Story: 1.13 - Phase 4 Integration Testing
 * Author: Quinn (AIOS-QA Agent)
 * Date: 2025-01-19
 */

const { runScenario1 } = require('./scenario-1-happy-path.test');
const { runScenario2 } = require('./scenario-2-validation-failures.test');
const { runScenario3 } = require('./scenario-3-dual-mode.test');
const { runScenario4 } = require('./scenario-4-performance-benchmarks.test');
const { runScenario5 } = require('./scenario-5-validation-accuracy.test');
const { runScenario6 } = require('./scenario-6-regression.test');
const path = require('path');
const fs = require('fs');

/**
 * Configuration for test execution
 */
const CONFIG = {
  scenarios: [
    {
      id: 1,
      name: 'E2E Success Path',
      runner: runScenario1,
      description: 'Complete process mapping from Discovery to ClickUp',
      enabled: true,
      dependsOn: [] // No dependencies
    },
    {
      id: 2,
      name: 'Validation Gate Failures',
      runner: runScenario2,
      description: '5 test cases for validation gate failures',
      enabled: true,
      dependsOn: [] // Independent
    },
    {
      id: 3,
      name: 'Dual-Mode Operation',
      runner: runScenario3,
      description: 'PV mode vs Generic mode switching',
      enabled: true,
      dependsOn: [] // Independent
    },
    {
      id: 4,
      name: 'Performance Benchmarks',
      runner: runScenario4,
      description: 'Scalability testing with 10/50/100/500 tasks',
      enabled: true,
      dependsOn: [1] // Requires baseline from Scenario 1
    },
    {
      id: 5,
      name: 'Validation Accuracy',
      runner: runScenario5,
      description: '30 validation scenarios against expected judgments',
      enabled: true,
      dependsOn: [1, 2] // Requires validation logic from 1 & 2
    },
    {
      id: 6,
      name: 'Regression Testing',
      runner: runScenario6,
      description: 'Ensures Phase 1-3 functionality intact',
      enabled: true,
      dependsOn: [1, 2, 3] // Should run last to validate no regressions
    }
  ],
  reporting: {
    saveIndividualReports: true,
    saveSummaryReport: true,
    reportDir: path.join(__dirname, '..', 'reports'),
    summaryFileName: 'test-suite-summary.json'
  }
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    scenario: null,      // Run specific scenario (1-6)
    verbose: false,      // Verbose output
    parallel: false,     // Run independent scenarios in parallel
    skipRegression: false, // Skip regression tests
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--parallel' || arg === '-p') {
      options.parallel = true;
    } else if (arg === '--skip-regression') {
      options.skipRegression = true;
    } else if (arg.startsWith('--scenario=')) {
      options.scenario = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('-s=')) {
      options.scenario = parseInt(arg.split('=')[1]);
    }
  }

  return options;
}

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Phase 4 Integration Testing - Master Runner          ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  node run-all-scenarios.js [OPTIONS]

OPTIONS:
  --scenario=N, -s=N     Run specific scenario (1-6)
  --verbose, -v          Enable verbose output
  --parallel, -p         Run independent scenarios in parallel
  --skip-regression      Skip regression tests (Scenario 6)
  --help, -h             Display this help message

SCENARIOS:
  1  E2E Success Path            Complete workflow from Discovery to ClickUp
  2  Validation Gate Failures    Test all validation gate failure conditions
  3  Dual-Mode Operation         Test PV mode and Generic mode switching
  4  Performance Benchmarks      Test scalability with various task counts
  5  Validation Accuracy         Test accuracy against expected judgments
  6  Regression Testing          Ensure Phase 1-3 functionality intact

EXAMPLES:
  node run-all-scenarios.js
      → Run all scenarios sequentially

  node run-all-scenarios.js --scenario=1 --verbose
      → Run Scenario 1 only with verbose output

  node run-all-scenarios.js --parallel
      → Run independent scenarios in parallel

  node run-all-scenarios.js --skip-regression
      → Run all scenarios except regression tests

DEPENDENCIES:
  • Scenario 4 depends on Scenario 1 (baseline metrics)
  • Scenario 5 depends on Scenarios 1 & 2 (validation logic)
  • Scenario 6 depends on Scenarios 1-3 (regression baseline)

REPORTS:
  Individual reports saved to: tests/reports/scenario-N-*.json
  Summary report saved to: tests/reports/test-suite-summary.json
`);
}

/**
 * Run a single scenario with error handling
 */
async function runScenarioSafe(scenarioConfig) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  Scenario ${scenarioConfig.id}: ${scenarioConfig.name}`);
  console.log(`  ${scenarioConfig.description}`);
  console.log(`${'═'.repeat(64)}\n`);

  const startTime = performance.now();
  let result = null;
  let error = null;

  try {
    const runResult = await scenarioConfig.runner();
    const duration = performance.now() - startTime;

    // Handle both exit code (number) and object return values
    const success = typeof runResult === 'number' ? runResult === 0 : runResult.success;

    result = {
      scenarioId: scenarioConfig.id,
      scenarioName: scenarioConfig.name,
      passed: success,
      duration: duration.toFixed(2),
      runResult
    };

    console.log(`\n✅ Scenario ${scenarioConfig.id} completed in ${duration.toFixed(2)}ms`);

  } catch (err) {
    const duration = performance.now() - startTime;
    error = err;

    result = {
      scenarioId: scenarioConfig.id,
      scenarioName: scenarioConfig.name,
      passed: false,
      duration: duration.toFixed(2),
      error: {
        message: err.message,
        stack: err.stack
      }
    };

    console.error(`\n❌ Scenario ${scenarioConfig.id} failed after ${duration.toFixed(2)}ms`);
    console.error(`   Error: ${err.message}`);
  }

  return result;
}

/**
 * Check if scenario dependencies are met
 */
function checkDependencies(scenarioId, completedScenarios) {
  const scenario = CONFIG.scenarios.find(s => s.id === scenarioId);
  if (!scenario || !scenario.dependsOn || scenario.dependsOn.length === 0) {
    return true;
  }

  const allDependenciesMet = scenario.dependsOn.every(depId =>
    completedScenarios.some(cs => cs.scenarioId === depId && cs.passed)
  );

  return allDependenciesMet;
}

/**
 * Run all scenarios sequentially
 */
async function runAllScenariosSequential(options) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Phase 4 Integration Testing - Sequential Mode         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const results = [];
  const startTime = performance.now();

  for (const scenarioConfig of CONFIG.scenarios) {
    if (!scenarioConfig.enabled) {
      console.log(`\n⏭️  Skipping Scenario ${scenarioConfig.id} (disabled)`);
      continue;
    }

    if (options.skipRegression && scenarioConfig.id === 6) {
      console.log(`\n⏭️  Skipping Scenario 6 (--skip-regression flag)`);
      continue;
    }

    // Check dependencies
    if (!checkDependencies(scenarioConfig.id, results)) {
      console.log(`\n⚠️  Skipping Scenario ${scenarioConfig.id}: dependencies not met`);
      const deps = scenarioConfig.dependsOn.map(id => `Scenario ${id}`).join(', ');
      console.log(`   Required: ${deps}`);
      continue;
    }

    const result = await runScenarioSafe(scenarioConfig);
    results.push(result);

    // If a critical scenario fails, consider stopping
    if (!result.passed && scenarioConfig.id <= 3) {
      console.log(`\n⚠️  Critical scenario failed. Consider reviewing before continuing.`);
      // For now, continue anyway to gather all results
    }
  }

  const totalDuration = performance.now() - startTime;

  return { results, totalDuration };
}

/**
 * Run independent scenarios in parallel (respecting dependencies)
 */
async function runAllScenariosParallel(options) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Phase 4 Integration Testing - Parallel Mode           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const results = [];
  const startTime = performance.now();

  // Group scenarios by dependency level
  const independentScenarios = CONFIG.scenarios.filter(s =>
    s.enabled &&
    s.dependsOn.length === 0 &&
    !(options.skipRegression && s.id === 6)
  );

  console.log(`\n🚀 Running ${independentScenarios.length} independent scenarios in parallel...`);

  // Run independent scenarios in parallel
  const parallelResults = await Promise.all(
    independentScenarios.map(sc => runScenarioSafe(sc))
  );

  results.push(...parallelResults);

  // Now run dependent scenarios sequentially
  const dependentScenarios = CONFIG.scenarios.filter(s =>
    s.enabled &&
    s.dependsOn.length > 0 &&
    !(options.skipRegression && s.id === 6)
  );

  console.log(`\n📋 Running ${dependentScenarios.length} dependent scenarios sequentially...`);

  for (const scenarioConfig of dependentScenarios) {
    if (!checkDependencies(scenarioConfig.id, results)) {
      console.log(`\n⚠️  Skipping Scenario ${scenarioConfig.id}: dependencies not met`);
      continue;
    }

    const result = await runScenarioSafe(scenarioConfig);
    results.push(result);
  }

  const totalDuration = performance.now() - startTime;

  return { results, totalDuration };
}

/**
 * Generate and display summary report
 */
function generateSummaryReport(results, totalDuration, options) {
  const summary = {
    timestamp: new Date().toISOString(),
    executionMode: options.parallel ? 'parallel' : 'sequential',
    totalScenarios: results.length,
    passedScenarios: results.filter(r => r.passed).length,
    failedScenarios: results.filter(r => !r.passed).length,
    totalDuration: totalDuration.toFixed(2),
    scenarios: results
  };

  // Calculate pass rate
  summary.passRate = ((summary.passedScenarios / summary.totalScenarios) * 100).toFixed(1);

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUITE SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Scenario Results:');
  console.log('┌─────┬───────────────────────────────┬──────────┬──────────────┐');
  console.log('│ ID  │         Scenario Name         │  Status  │   Duration   │');
  console.log('├─────┼───────────────────────────────┼──────────┼──────────────┤');

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const name = result.scenarioName.padEnd(29);
    const duration = `${result.duration}ms`.padStart(12);
    console.log(`│  ${result.scenarioId}  │ ${name} │ ${status}  │ ${duration} │`);
  }

  console.log('└─────┴───────────────────────────────┴──────────┴──────────────┘');

  console.log('\n📈 Overall Metrics:');
  console.log(`   Total Scenarios: ${summary.totalScenarios}`);
  console.log(`   ✅ Passed: ${summary.passedScenarios}`);
  console.log(`   ❌ Failed: ${summary.failedScenarios}`);
  console.log(`   Pass Rate: ${summary.passRate}%`);
  console.log(`   Total Duration: ${summary.totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
  console.log(`   Execution Mode: ${summary.executionMode}`);

  // Display errors if any
  const failedResults = results.filter(r => !r.passed);
  if (failedResults.length > 0) {
    console.log('\n❌ Failed Scenarios:');
    for (const result of failedResults) {
      console.log(`\n   Scenario ${result.scenarioId}: ${result.scenarioName}`);
      if (result.error) {
        console.log(`   Error: ${result.error.message}`);
      }
    }
  }

  // Overall test suite verdict
  if (summary.failedScenarios === 0) {
    console.log('\n✅ TEST SUITE PASSED');
    console.log('   All Phase 4 integration tests completed successfully.');
  } else {
    console.log('\n❌ TEST SUITE FAILED');
    console.log(`   ${summary.failedScenarios} scenario(s) failed. Review details above.`);
  }

  return summary;
}

/**
 * Save summary report to file
 */
function saveSummaryReport(summary) {
  if (!CONFIG.reporting.saveSummaryReport) {
    return;
  }

  const reportDir = CONFIG.reporting.reportDir;
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, CONFIG.reporting.summaryFileName);
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  console.log(`\n💾 Summary report saved to: ${reportPath}`);
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    displayHelp();
    return 0;
  }

  // Run specific scenario if requested
  if (options.scenario !== null) {
    const scenarioConfig = CONFIG.scenarios.find(s => s.id === options.scenario);

    if (!scenarioConfig) {
      console.error(`\n❌ ERROR: Scenario ${options.scenario} not found.`);
      console.error('   Valid scenarios: 1-6');
      return 1;
    }

    if (!scenarioConfig.enabled) {
      console.error(`\n❌ ERROR: Scenario ${options.scenario} is disabled.`);
      return 1;
    }

    const result = await runScenarioSafe(scenarioConfig);
    return result.passed ? 0 : 1;
  }

  // Run all scenarios
  let executionResult;
  if (options.parallel) {
    executionResult = await runAllScenariosParallel(options);
  } else {
    executionResult = await runAllScenariosSequential(options);
  }

  const { results, totalDuration } = executionResult;

  // Generate and display summary
  const summary = generateSummaryReport(results, totalDuration, options);

  // Save summary report
  saveSummaryReport(summary);

  // Return appropriate exit code
  return summary.failedScenarios > 0 ? 1 : 0;
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('\n❌ FATAL ERROR: Test suite execution failed');
      console.error(`   ${error.message}`);
      console.error(`\n   Stack trace:`);
      console.error(`   ${error.stack}`);
      process.exit(1);
    });
}

module.exports = {
  main,
  runAllScenariosSequential,
  runAllScenariosParallel,
  generateSummaryReport
};
