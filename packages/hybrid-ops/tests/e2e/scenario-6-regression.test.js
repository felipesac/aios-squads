/**
 * @fileoverview Scenario 6: Regression Testing
 *
 * Validates that Phase 4 integration doesn't break existing functionality
 * from Phases 1-3. Re-runs previous tests and confirms baseline performance.
 *
 * Test Cases:
 * - 6A: Phase 1 Discovery regression (process capture, end-state vision)
 * - 6B: Phase 2 Architecture regression (workflow design, risk analysis)
 * - 6C: Phase 3 Executors regression (team selection, workflow creation)
 * - 6D: Baseline performance regression (no degradation vs Phase 3)
 *
 * Success Criteria:
 * - All Phase 1-3 features work as before
 * - No functionality breakage
 * - Performance baseline maintained or improved
 * - All validation gates unchanged
 *
 * Story: 1.13 - Phase 4 Integration Testing
 * Author: Quinn (AIOS-QA Agent)
 * Date: 2025-01-19
 */

const { E2ETestRunner } = require('./framework');
const { ScenarioBuilder } = require('./framework');
const { IntegratedPerformanceMonitor } = require('../performance/integrated-monitor');
const path = require('path');
const fs = require('fs');

/**
 * Test 6A: Phase 1 Discovery Regression
 * Validates that Discovery phase functionality remains intact after Phase 4 integration
 */
async function runTest6A(runner) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Test 6A: Phase 1 Discovery Regression');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const scenario = new ScenarioBuilder('Test 6A: Phase 1 Discovery Regression', '6A')
    .useFixture('sample-process-simple.json', 'processDefinition')

    // Test Discovery phase workflow
    .addStep('workflow', {
      phase: 'discovery',
      description: 'Capture process details and end-state vision',
      input: {
        processName: 'Test Discovery Process',
        currentState: 'Manual process with multiple pain points',
        desiredOutcome: 'Fully automated workflow'
      },
      expectedOutput: {
        endState: 'defined',
        painPoints: ['manual tasks', 'data entry errors', 'slow turnaround'],
        desiredOutcomes: ['automation', 'accuracy', 'speed'],
        successMetrics: ['time saved', 'error rate', 'throughput']
      }
    })

    // Verify discovery artifacts generated
    .addStep('assertion', {
      description: 'Verify discovery artifacts match Phase 1 behavior',
      assertion: 'verifyDiscoveryArtifacts',
      expectedData: {
        hasEndStateVision: true,
        hasPainPointsAnalysis: true,
        hasSuccessCriteria: true,
        artifactsComplete: true
      }
    })

    // Test discovery validation (pre-Phase 4 behavior)
    .addStep('validation', {
      gate: 'DISCOVERY_COMPLETE',
      description: 'Validate discovery completeness',
      expectedResult: {
        passed: true,
        allFieldsCaptured: true,
        visionClear: true,
        recommendation: 'PROCEED_TO_ARCHITECTURE'
      }
    })

    .build();

  const startTime = performance.now();
  const result = await runner.runScenario(scenario);
  const duration = performance.now() - startTime;

  const passed = result.status === 'passed';
  const stepsCompleted = result.steps.filter(s => s.passed).length;
  const totalSteps = result.steps.length;
  const failures = result.steps.filter(s => !s.passed);

  console.log('\n📊 Test 6A Results:');
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Steps Completed: ${stepsCompleted}/${totalSteps}`);
  console.log(`   Duration: ${duration.toFixed(2)}ms`);

  if (!passed) {
    console.log(`\n   ⚠️  REGRESSION DETECTED: Phase 1 Discovery behavior changed!`);
    if (failures.length > 0) {
      console.log(`   Failures: ${failures.map(f => f.description || 'Unknown step').join(', ')}`);
    }
  }

  return { testId: '6A', passed, stepsCompleted, totalSteps, failures, duration, ...result };
}

/**
 * Test 6B: Phase 2 Architecture Regression
 * Validates that Architecture phase functionality remains intact
 */
async function runTest6B(runner) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Test 6B: Phase 2 Architecture Regression');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const scenario = new ScenarioBuilder('Test 6B: Phase 2 Architecture Regression', '6B')
    .useFixture('sample-process-simple.json', 'processDefinition')

    // Test Architecture phase workflow design
    .addStep('workflow', {
      phase: 'architecture',
      description: 'Design workflow and analyze risks',
      input: {
        endStateVision: 'Automated process with quality gates',
        constraints: ['budget: $10k', 'timeline: 3 months', 'team: 2 people'],
        riskTolerance: 'medium'
      },
      expectedOutput: {
        workflowDesigned: true,
        stepsIdentified: true,
        risksAnalyzed: true,
        mitigationPlanned: true
      }
    })

    // Test risk analysis (pre-Phase 4)
    .addStep('assertion', {
      description: 'Verify risk analysis matches Phase 2 behavior',
      assertion: 'verifyRiskAnalysis',
      expectedData: {
        hasRiskAssessment: true,
        hasMitigationStrategies: true,
        riskScoreCalculated: true,
        guardrailsIdentified: true
      }
    })

    // Test architecture validation gate
    .addStep('validation', {
      gate: 'ARCHITECTURE_COMPLETE',
      description: 'Validate architecture design completeness',
      expectedResult: {
        passed: true,
        workflowViable: true,
        risksAcceptable: true,
        recommendation: 'PROCEED_TO_EXECUTORS'
      }
    })

    // Verify workflow structure unchanged
    .addStep('assertion', {
      description: 'Verify workflow structure matches Phase 2 format',
      assertion: 'verifyWorkflowStructure',
      expectedData: {
        hasSteps: true,
        hasDependencies: true,
        hasValidationGates: true,
        formatUnchanged: true
      }
    })

    .build();

  const startTime = performance.now();
  const result = await runner.runScenario(scenario);
  const duration = performance.now() - startTime;

  const passed = result.status === 'passed';
  const stepsCompleted = result.steps.filter(s => s.passed).length;
  const totalSteps = result.steps.length;
  const failures = result.steps.filter(s => !s.passed);

  console.log('\n📊 Test 6B Results:');
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Steps Completed: ${stepsCompleted}/${totalSteps}`);
  console.log(`   Duration: ${duration.toFixed(2)}ms`);

  if (!passed) {
    console.log(`\n   ⚠️  REGRESSION DETECTED: Phase 2 Architecture behavior changed!`);
    if (failures.length > 0) {
      console.log(`   Failures: ${failures.map(f => f.description || 'Unknown step').join(', ')}`);
    }
  }

  return { testId: '6B', passed, stepsCompleted, totalSteps, failures, duration, ...result };
}

/**
 * Test 6C: Phase 3 Executors/Workflows Regression
 * Validates that Executors and Workflow phases remain intact
 */
async function runTest6C(runner) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Test 6C: Phase 3 Executors/Workflows Regression');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const scenario = new ScenarioBuilder('Test 6C: Phase 3 Executors Regression', '6C')
    .useFixture('sample-process-simple.json', 'processDefinition')

    // Test Executors phase (team selection)
    .addStep('workflow', {
      phase: 'executors',
      description: 'Select team and assign roles',
      input: {
        requiredSkills: ['JavaScript', 'Node.js', 'API integration'],
        teamSize: 2,
        experienceLevel: 'senior'
      },
      expectedOutput: {
        teamSelected: true,
        rolesAssigned: true,
        skillsMatched: true,
        capacityConfirmed: true
      }
    })

    // Verify team selection logic unchanged
    .addStep('assertion', {
      description: 'Verify team selection matches Phase 3 logic',
      assertion: 'verifyTeamSelection',
      expectedData: {
        selectionCriteriaUnchanged: true,
        skillMatchingWorks: true,
        capacityCheckWorks: true,
        roleAssignmentValid: true
      }
    })

    // Test Workflows phase (workflow creation)
    .addStep('workflow', {
      phase: 'workflows',
      description: 'Create executable workflow',
      input: {
        workflowDesign: 'architecture-output',
        selectedTeam: 'executors-output',
        toolsAvailable: ['ClickUp', 'GitHub', 'Slack']
      },
      expectedOutput: {
        workflowCreated: true,
        tasksGenerated: true,
        dependenciesMapped: true,
        toolsIntegrated: true
      }
    })

    // Verify workflow generation unchanged
    .addStep('assertion', {
      description: 'Verify workflow generation matches Phase 3 behavior',
      assertion: 'verifyWorkflowGeneration',
      expectedData: {
        taskFormatUnchanged: true,
        dependencyLogicIntact: true,
        toolIntegrationWorks: true,
        outputStructureValid: true
      }
    })

    // Test workflow validation gate
    .addStep('validation', {
      gate: 'WORKFLOWS_COMPLETE',
      description: 'Validate workflow completeness',
      expectedResult: {
        passed: true,
        allTasksDefined: true,
        dependenciesResolved: true,
        recommendation: 'PROCEED_TO_QA'
      }
    })

    .build();

  const startTime = performance.now();
  const result = await runner.runScenario(scenario);
  const duration = performance.now() - startTime;

  const passed = result.status === 'passed';
  const stepsCompleted = result.steps.filter(s => s.passed).length;
  const totalSteps = result.steps.length;
  const failures = result.steps.filter(s => !s.passed);

  console.log('\n📊 Test 6C Results:');
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Steps Completed: ${stepsCompleted}/${totalSteps}`);
  console.log(`   Duration: ${duration.toFixed(2)}ms`);

  if (!passed) {
    console.log(`\n   ⚠️  REGRESSION DETECTED: Phase 3 Executors/Workflows behavior changed!`);
    if (failures.length > 0) {
      console.log(`   Failures: ${failures.map(f => f.description || 'Unknown step').join(', ')}`);
    }
  }

  return { testId: '6C', passed, stepsCompleted, totalSteps, failures, duration, ...result };
}

/**
 * Test 6D: Baseline Performance Regression
 * Validates that Phase 4 integration doesn't degrade performance
 */
async function runTest6D(runner, perfMonitor) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Test 6D: Baseline Performance Regression');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Define Phase 3 baseline metrics (from previous testing)
  const PHASE_3_BASELINE = {
    discoveryDuration: 150,  // ms
    architectureDuration: 200, // ms
    executorsDuration: 180,   // ms
    workflowsDuration: 250,   // ms
    totalDuration: 780,       // ms
    memoryUsage: 45 * 1024 * 1024, // 45MB
    validationOverhead: 85    // ms per validation
  };

  const scenario = new ScenarioBuilder('Test 6D: Baseline Performance', '6D')
    .useFixture('sample-process-simple.json', 'processDefinition')

    // Run all phases and measure performance
    .addStep('workflow', {
      phase: 'discovery',
      description: 'Discovery phase performance test',
      measurePerformance: true
    })
    .addStep('workflow', {
      phase: 'architecture',
      description: 'Architecture phase performance test',
      measurePerformance: true
    })
    .addStep('workflow', {
      phase: 'executors',
      description: 'Executors phase performance test',
      measurePerformance: true
    })
    .addStep('workflow', {
      phase: 'workflows',
      description: 'Workflows phase performance test',
      measurePerformance: true
    })

    // Test validation overhead
    .addStep('validation', {
      gate: 'GENERIC_STRATEGIC',
      description: 'Measure validation overhead',
      measurePerformance: true
    })

    .build();

  perfMonitor.startProfiling('6D-baseline-performance');

  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  const result = await runner.runScenario(scenario);

  const duration = performance.now() - startTime;
  const endMemory = process.memoryUsage().heapUsed;
  const memoryDelta = endMemory - startMemory;

  perfMonitor.stopProfiling('6D-baseline-performance');
  const perfReport = perfMonitor.generateComprehensiveReport();

  // Calculate performance comparison
  const performanceComparison = {
    totalDuration: {
      current: duration,
      baseline: PHASE_3_BASELINE.totalDuration,
      delta: duration - PHASE_3_BASELINE.totalDuration,
      percentChange: ((duration - PHASE_3_BASELINE.totalDuration) / PHASE_3_BASELINE.totalDuration * 100).toFixed(1)
    },
    memoryUsage: {
      current: memoryDelta,
      baseline: PHASE_3_BASELINE.memoryUsage,
      delta: memoryDelta - PHASE_3_BASELINE.memoryUsage,
      percentChange: ((memoryDelta - PHASE_3_BASELINE.memoryUsage) / PHASE_3_BASELINE.memoryUsage * 100).toFixed(1)
    }
  };

  // Determine if performance regression occurred
  // Only flag as regression if performance DEGRADES (positive change = slower/more memory)
  // Performance IMPROVEMENTS (negative change = faster/less memory) should not fail the test
  const ALLOWED_DEGRADATION = 10; // 10% tolerance
  const performanceRegression =
    parseFloat(performanceComparison.totalDuration.percentChange) > ALLOWED_DEGRADATION ||
    parseFloat(performanceComparison.memoryUsage.percentChange) > ALLOWED_DEGRADATION;

  const passed = result.status === 'passed' && !performanceRegression;

  console.log('\n📊 Test 6D Results:');
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('\n   Performance Comparison:');
  console.log('   ┌─────────────────┬──────────────┬──────────────┬───────────┬─────────────┐');
  console.log('   │     Metric      │   Current    │   Baseline   │   Delta   │   Change    │');
  console.log('   ├─────────────────┼──────────────┼──────────────┼───────────┼─────────────┤');
  console.log(`   │ Total Duration  │ ${duration.toFixed(0).padStart(9)}ms │ ${PHASE_3_BASELINE.totalDuration.toString().padStart(9)}ms │ ${performanceComparison.totalDuration.delta > 0 ? '+' : ''}${performanceComparison.totalDuration.delta.toFixed(0).padStart(8)}ms │ ${performanceComparison.totalDuration.percentChange > 0 ? '+' : ''}${performanceComparison.totalDuration.percentChange.padStart(8)}%  │`);
  console.log(`   │ Memory Usage    │ ${(memoryDelta / 1024 / 1024).toFixed(1).padStart(9)}MB │ ${(PHASE_3_BASELINE.memoryUsage / 1024 / 1024).toFixed(1).padStart(9)}MB │ ${performanceComparison.memoryUsage.delta > 0 ? '+' : ''}${(performanceComparison.memoryUsage.delta / 1024 / 1024).toFixed(1).padStart(8)}MB │ ${performanceComparison.memoryUsage.percentChange > 0 ? '+' : ''}${performanceComparison.memoryUsage.percentChange.padStart(8)}%  │`);
  console.log('   └─────────────────┴──────────────┴──────────────┴───────────┴─────────────┘');

  if (performanceRegression) {
    console.log(`\n   ⚠️  PERFORMANCE REGRESSION DETECTED!`);
    console.log(`   Allowed degradation: ±${ALLOWED_DEGRADATION}%`);

    if (Math.abs(performanceComparison.totalDuration.percentChange) > ALLOWED_DEGRADATION) {
      console.log(`   - Duration changed by ${performanceComparison.totalDuration.percentChange}%`);
    }
    if (Math.abs(performanceComparison.memoryUsage.percentChange) > ALLOWED_DEGRADATION) {
      console.log(`   - Memory usage changed by ${performanceComparison.memoryUsage.percentChange}%`);
    }
  } else {
    console.log(`\n   ✅ Performance maintained within ±${ALLOWED_DEGRADATION}% tolerance`);
  }

  return {
    testId: '6D',
    ...result,
    passed,  // Override scenario passed with test passed (includes performance check)
    duration,
    performanceComparison,
    performanceRegression,
    perfReport
  };
}

/**
 * Main test runner for Scenario 6
 */
async function runScenario6() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   SCENARIO 6: REGRESSION TESTING               ║');
  console.log('║                                                                ║');
  console.log('║  Validates Phase 4 integration doesn\'t break existing features ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const runner = new E2ETestRunner({
    verbose: true,
    mockClickUp: true,
    cleanupAfterEach: true,
    timeout: 600000 // 10 minutes
  });

  const perfMonitor = new IntegratedPerformanceMonitor({
    profiling: {
      enabled: true,
      sampleInterval: 100,
      percentiles: [50, 90, 95, 99]
    },
    memory: {
      samplingInterval: 1000,
      warningThreshold: 100 * 1024 * 1024,
      criticalThreshold: 150 * 1024 * 1024
    }
  });

  const results = {
    scenarioId: 'S6',
    scenarioName: 'Regression Testing',
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // Run all regression tests
    results.tests['6A'] = await runTest6A(runner);
    results.tests['6B'] = await runTest6B(runner);
    results.tests['6C'] = await runTest6C(runner);
    results.tests['6D'] = await runTest6D(runner, perfMonitor);

    // Calculate overall results
    const totalTests = Object.keys(results.tests).length;
    const passedTests = Object.values(results.tests).filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Object.values(results.tests).reduce((sum, t) => sum + t.duration, 0);

    results.summary = {
      totalTests,
      passedTests,
      failedTests,
      passRate: ((passedTests / totalTests) * 100).toFixed(1),
      totalDuration: totalDuration.toFixed(2),
      regressionDetected: failedTests > 0
    };

    // Display summary
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    SCENARIO 6: SUMMARY                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Test Results:');
    console.log('   ┌──────────┬─────────────────────────────────────┬──────────┬──────────────┐');
    console.log('   │ Test ID  │            Description              │  Status  │   Duration   │');
    console.log('   ├──────────┼─────────────────────────────────────┼──────────┼──────────────┤');

    for (const [testId, testResult] of Object.entries(results.tests)) {
      const status = testResult.passed ? '✅ PASS' : '❌ FAIL';
      const description = testResult.scenarioName || `Test ${testId}`;
      console.log(`   │   ${testId}     │ ${description.padEnd(35)} │ ${status}  │ ${testResult.duration.toFixed(2).padStart(9)}ms │`);
    }

    console.log('   └──────────┴─────────────────────────────────────┴──────────┴──────────────┘');

    console.log('\n📈 Overall Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Pass Rate: ${results.summary.passRate}%`);
    console.log(`   Total Duration: ${results.summary.totalDuration}ms`);

    if (results.summary.regressionDetected) {
      console.log('\n   ⚠️  REGRESSIONS DETECTED!');
      console.log('   Phase 4 integration has broken existing functionality.');
      console.log('   Review failed tests above for details.');
    } else {
      console.log('\n   ✅ NO REGRESSIONS DETECTED');
      console.log('   All Phase 1-3 functionality intact after Phase 4 integration.');
    }

    // Save detailed report
    const reportDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, `scenario-6-regression-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Return overall pass/fail
    return results.summary.regressionDetected ? 1 : 0;

  } catch (error) {
    console.error('\n❌ ERROR: Scenario 6 execution failed');
    console.error(`   ${error.message}`);
    console.error(`\n   Stack trace:`);
    console.error(`   ${error.stack}`);

    results.error = {
      message: error.message,
      stack: error.stack
    };

    return 1;
  } finally {
    // Framework handles cleanup automatically per scenario (cleanupAfterEach)
    perfMonitor.stop();
  }
}

// Run if executed directly
if (require.main === module) {
  runScenario6()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  runScenario6,
  runTest6A,
  runTest6B,
  runTest6C,
  runTest6D
};
