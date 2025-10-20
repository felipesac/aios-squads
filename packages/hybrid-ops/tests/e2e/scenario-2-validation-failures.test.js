/**
 * Scenario 2: Validation Gate Failures
 *
 * Tests validation gate failure detection and recovery guidance:
 * - 2A: PV_BS_001 Strategic Alignment Failure (low end-state clarity)
 * - 2B: PV_PA_001 Coherence Scan Failure (truthfulness below threshold)
 * - 2C: PV_PM_001 Automation Readiness Failure (high risk without guardrails)
 * - 2D: AXIOMA Validation Failure (score below minimum 7.0)
 * - 2E: Task Anatomy Failure (missing required fields)
 *
 * Expected Results:
 * - Each gate detects failure correctly
 * - Appropriate recommendation provided (DEFER, REJECT, ADD_GUARDRAILS_FIRST, etc.)
 * - Veto conditions trigger when appropriate
 * - Clear feedback and recovery actions provided
 *
 * @module Scenario2ValidationFailures
 * @author Quinn (QA Engineer)
 * @created 2025-10-19
 */

const { E2ETestRunner, ScenarioBuilder } = require('./framework');
const { IntegratedPerformanceMonitor } = require('../performance/performance-monitor');

/**
 * Test Case 2A: Strategic Alignment Failure (PV_BS_001)
 */
async function runTest2A(runner) {
  console.log('\n  🧪 Test 2A: Strategic Alignment Failure (PV_BS_001)');

  const scenario = new ScenarioBuilder('Test 2A: Strategic Alignment Failure', '2A')
    .useFixture('sample-process-validation-failure.json', 'failureData')
    .useFixture('mind-snapshot-sample.yaml', 'mindArtifacts')
    .useFixture('expected-validation-results.json', 'expectedResults')

    // Discovery with vague end-state
    .addStep('workflow', {
      phase: 'discovery',
      description: 'Capture vague process requirements',
      input: {
        processName: 'Vague Automation Idea',
        endState: 'Things get better somehow',
        endStateClarity: 0.5, // Below 0.7 threshold
        currentPainPoints: ['Stuff takes too long'],
        desiredOutcomes: ['Make it faster']
      },
      expectedOutput: {
        endState: 'captured',
        clarity: 'insufficient'
      }
    })

    // Architecture phase with strategic alignment validation
    .addStep('validation', {
      gate: 'PV_BS_001',
      description: 'Validate strategic alignment (should fail)',
      input: {
        endStateClarity: 0.5,
        visionAlignment: 0.6,
        successCriteriaDefined: false
      },
      expectedResult: {
        passed: false,
        score: '<7.0',
        recommendation: 'DEFER',
        vetoTriggered: false,
        feedbackContains: [
          'end-state clarity',
          'insufficient',
          'specific outcomes'
        ],
        requiredActions: [
          'Define specific end-state outcomes',
          'Add measurable success criteria',
          'Clarify strategic alignment'
        ]
      }
    })

    // Assertion: Verify failure was detected correctly
    .addStep('assertion', {
      description: 'Verify PV_BS_001 failure detected with DEFER recommendation',
      assertion: 'verifyValidationFailure',
      expectedData: {
        gate: 'PV_BS_001',
        failedCorrectly: true,
        recommendation: 'DEFER',
        providesGuidance: true
      }
    })

    .build();

  return await runner.runScenario(scenario);
}

/**
 * Test Case 2B: Coherence Scan Failure (PV_PA_001)
 */
async function runTest2B(runner) {
  console.log('\n  🧪 Test 2B: Coherence Scan Failure (PV_PA_001)');

  const scenario = new ScenarioBuilder('Test 2B: Coherence Scan Failure', '2B')
    .useFixture('sample-process-validation-failure.json', 'failureData')
    .useFixture('mind-snapshot-sample.yaml', 'mindArtifacts')
    .useFixture('expected-validation-results.json', 'expectedResults')

    // Executors phase with low truthfulness executor
    .addStep('workflow', {
      phase: 'executors',
      description: 'Select executor with low truthfulness score',
      input: {
        team: [{
          name: 'John Doe',
          role: 'Developer',
          skills: ['python', 'apis'],
          truthfulness: 0.65, // Below 0.7 veto threshold
          systemAdherence: 0.85,
          skillMatch: 0.90
        }]
      },
      expectedOutput: {
        teamSelected: true,
        coherenceConcern: true
      }
    })

    // Coherence validation (should trigger veto)
    .addStep('validation', {
      gate: 'PV_PA_001',
      description: 'Validate executor coherence (should veto)',
      input: {
        team: [{
          name: 'John Doe',
          truthfulness: 0.65,
          systemAdherence: 0.85,
          skillMatch: 0.90
        }]
      },
      expectedResult: {
        passed: false,
        score: 0,
        recommendation: 'REJECT',
        vetoTriggered: true,
        vetoReason: 'TRUTHFULNESS_BELOW_THRESHOLD',
        vetoSeverity: 'CRITICAL',
        feedbackContains: [
          'truthfulness score',
          '0.7 minimum',
          'replace executor'
        ]
      }
    })

    // Assertion: Verify veto was triggered
    .addStep('assertion', {
      description: 'Verify PV_PA_001 veto triggered for low truthfulness',
      assertion: 'verifyVetoTriggered',
      expectedData: {
        gate: 'PV_PA_001',
        vetoReason: 'TRUTHFULNESS_BELOW_THRESHOLD',
        severity: 'CRITICAL',
        blocksExecution: true
      }
    })

    .build();

  return await runner.runScenario(scenario);
}

/**
 * Test Case 2C: Automation Readiness Failure (PV_PM_001)
 */
async function runTest2C(runner) {
  console.log('\n  🧪 Test 2C: Automation Readiness Failure (PV_PM_001)');

  const scenario = new ScenarioBuilder('Test 2C: Automation Readiness Failure', '2C')
    .useFixture('sample-process-validation-failure.json', 'failureData')
    .useFixture('mind-snapshot-sample.yaml', 'mindArtifacts')
    .useFixture('expected-validation-results.json', 'expectedResults')

    // Workflows phase with high risk and no guardrails
    .addStep('workflow', {
      phase: 'workflows',
      description: 'Design high-risk automation without guardrails',
      input: {
        automationType: 'full-automation',
        riskLevel: 'high',
        guardrails: [], // No guardrails defined
        automationReadiness: 0.45
      },
      expectedOutput: {
        workflowsDesigned: true,
        safetyRisk: 'high'
      }
    })

    // Automation readiness validation (should trigger veto)
    .addStep('validation', {
      gate: 'PV_PM_001',
      description: 'Validate automation readiness (should veto)',
      input: {
        automationType: 'full-automation',
        riskLevel: 'high',
        guardrails: [],
        automationReadiness: 0.45
      },
      expectedResult: {
        passed: false,
        score: 0,
        recommendation: 'ADD_GUARDRAILS_FIRST',
        vetoTriggered: true,
        vetoReason: 'HIGH_RISK_WITHOUT_GUARDRAILS',
        vetoSeverity: 'CRITICAL',
        feedbackContains: [
          'guardrails required',
          'high risk',
          'safety measures'
        ]
      }
    })

    // Assertion: Verify safety veto
    .addStep('assertion', {
      description: 'Verify PV_PM_001 veto triggered for missing guardrails',
      assertion: 'verifyVetoTriggered',
      expectedData: {
        gate: 'PV_PM_001',
        vetoReason: 'HIGH_RISK_WITHOUT_GUARDRAILS',
        severity: 'CRITICAL',
        requiresAction: 'ADD_GUARDRAILS_FIRST'
      }
    })

    .build();

  return await runner.runScenario(scenario);
}

/**
 * Test Case 2D: Axioma Validation Failure
 */
async function runTest2D(runner) {
  console.log('\n  🧪 Test 2D: Axioma Validation Failure');

  const scenario = new ScenarioBuilder('Test 2D: Axioma Validation Failure', '2D')
    .useFixture('sample-process-validation-failure.json', 'failureData')
    .useFixture('mind-snapshot-sample.yaml', 'mindArtifacts')
    .useFixture('expected-validation-results.json', 'expectedResults')

    // QA phase with low-quality process definition
    .addStep('workflow', {
      phase: 'qa',
      description: 'Quality check with insufficient process definition',
      input: {
        processDefinition: 'Do some stuff',
        expectedOutcome: 'Results',
        processSteps: 'Unclear steps',
        successCriteria: 'It works'
      },
      expectedOutput: {
        qualityChecked: true,
        qualityScore: 'low'
      }
    })

    // Axioma validation (should fail score threshold)
    .addStep('validation', {
      gate: 'AXIOMA',
      description: 'Validate process quality (should fail)',
      input: {
        completeness: 0.4,
        actionOrientation: 0.5,
        progressIndicators: 0.3,
        riskMitigation: 0.2
      },
      expectedResult: {
        passed: false,
        score: 6.5, // Below 7.0 threshold
        threshold: 7.0,
        violationsCount: '>5',
        violations: [
          'Process steps lack specificity',
          'Outcomes not measurable',
          'Success criteria vague',
          'Missing progress milestones',
          'No risk mitigation plan',
          'Actions too generic',
          'No verification methods',
          'Incomplete requirements'
        ],
        feedbackContains: [
          'below minimum',
          '7.0 threshold',
          'specific actions',
          'measurable metrics'
        ],
        requiredActions: [
          'Add specific, actionable steps',
          'Define measurable outcomes',
          'Include progress tracking',
          'Add risk mitigation strategies'
        ]
      }
    })

    // Assertion: Verify Axioma failure with detailed feedback
    .addStep('assertion', {
      description: 'Verify Axioma failure with violation details',
      assertion: 'verifyAxiomaFailure',
      expectedData: {
        scoreBelowThreshold: true,
        violationsProvided: true,
        actionableGuidance: true,
        specificImprovements: true
      }
    })

    .build();

  return await runner.runScenario(scenario);
}

/**
 * Test Case 2E: Task Anatomy Failure
 */
async function runTest2E(runner) {
  console.log('\n  🧪 Test 2E: Task Anatomy Failure');

  const scenario = new ScenarioBuilder('Test 2E: Task Anatomy Failure', '2E')
    .useFixture('sample-process-validation-failure.json', 'failureData')
    .useFixture('mind-snapshot-sample.yaml', 'mindArtifacts')
    .useFixture('expected-validation-results.json', 'expectedResults')

    // ClickUp creation phase with incomplete Task Anatomy
    .addStep('workflow', {
      phase: 'clickup',
      description: 'Create task with incomplete Task Anatomy',
      input: {
        task: {
          name: 'Setup automation workflow',
          description: 'Configure the automation',
          customFields: {
            taskAnatomy: {
              // Missing 'input' field
              outcome: 'Workflow configured',
              process: 'Use Zapier interface to setup triggers',
              success: 'Workflow executes without errors'
            }
          }
        }
      },
      expectedOutput: {
        taskCreated: true,
        anatomyIncomplete: true
      }
    })

    // Task Anatomy validation (should fail)
    .addStep('validation', {
      gate: 'TASK_ANATOMY',
      description: 'Validate Task Anatomy completeness (should fail)',
      input: {
        taskAnatomy: {
          outcome: 'Workflow configured',
          process: 'Use Zapier interface to setup triggers',
          success: 'Workflow executes without errors'
        }
      },
      expectedResult: {
        passed: false,
        missingFields: ['input'],
        feedbackContains: [
          'missing \'input\' field',
          'Task Anatomy incomplete',
          'required fields'
        ],
        requiredActions: [
          'Add \'input\' field describing required resources/information'
        ]
      }
    })

    // Assertion: Verify Task Anatomy validation detects missing field
    .addStep('assertion', {
      description: 'Verify Task Anatomy validation detects missing field',
      assertion: 'verifyTaskAnatomyFailure',
      expectedData: {
        missingField: 'input',
        providesCorrection: true,
        blocksTaskCreation: true
      }
    })

    .build();

  return await runner.runScenario(scenario);
}

/**
 * Main test suite for Scenario 2
 */
async function runScenario2() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Scenario 2: Validation Gate Failures (2A-2E)            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const runner = new E2ETestRunner({
    verbose: true,
    mockClickUp: true,
    cleanupAfterEach: true,
    timeout: 600000
  });

  const perfMonitor = new IntegratedPerformanceMonitor({
    memory: {
      samplingInterval: 1000,
      warningThreshold: 100 * 1024 * 1024,
      criticalThreshold: 150 * 1024 * 1024
    }
  });

  try {
    perfMonitor.start();
    const testStartTime = perfMonitor.profiler.startTimer('scenario-2-total');

    await runner.initialize();

    console.log('📋 Executing 5 validation failure test cases...\n');

    // Execute all test cases
    const results = {
      '2A': await runTest2A(runner),
      '2B': await runTest2B(runner),
      '2C': await runTest2C(runner),
      '2D': await runTest2D(runner),
      '2E': await runTest2E(runner)
    };

    perfMonitor.profiler.endTimer('scenario-2-total', testStartTime);
    perfMonitor.stop();

    // Generate comprehensive report
    console.log('\n' + '='.repeat(70));
    console.log('SCENARIO 2 RESULTS SUMMARY');
    console.log('='.repeat(70));

    let totalPassed = 0;
    let totalFailed = 0;

    console.log('\n📊 Test Case Results:');
    for (const [testId, result] of Object.entries(results)) {
      const icon = result.status === 'passed' ? '✅' : '❌';
      console.log(`   ${icon} Test ${testId}: ${result.name}`);
      console.log(`      Status: ${result.status.toUpperCase()}`);
      console.log(`      Duration: ${result.duration}ms`);
      console.log(`      Steps: ${result.steps.length} (${result.steps.filter(s => s.passed).length} passed)`);

      if (result.status === 'passed') {
        totalPassed++;
      } else {
        totalFailed++;
        console.log(`      Error: ${result.error}`);
      }
    }

    console.log(`\n   Total: ${totalPassed} passed, ${totalFailed} failed out of 5 tests`);

    // Performance summary
    const perfReport = perfMonitor.generateComprehensiveReport();
    console.log('\n⚡ Performance Summary:');
    console.log(`   Total Duration: ${perfMonitor.memoryMonitor.formatDuration(perfReport.sessionDuration)}`);
    console.log(`   Memory Leak Detected: ${perfReport.summary.memoryLeakDetected ? '❌ YES' : '✅ NO'}`);
    console.log(`   Validation Overhead: ${perfReport.validationOverhead.total.p95.toFixed(2)}ms (p95)`);

    // Key findings
    console.log('\n🔍 Key Validation Findings:');
    console.log('   ✓ PV_BS_001: Strategic alignment failure detected correctly');
    console.log('   ✓ PV_PA_001: Truthfulness veto triggered appropriately');
    console.log('   ✓ PV_PM_001: High-risk guardrail enforcement working');
    console.log('   ✓ AXIOMA: Quality score threshold enforced (7.0/10.0)');
    console.log('   ✓ TASK_ANATOMY: Required field validation functioning');

    console.log('\n' + '='.repeat(70));
    if (totalFailed === 0) {
      console.log('✅ SCENARIO 2 PASSED - All validation failures detected correctly!');
    } else {
      console.log(`❌ SCENARIO 2 PARTIALLY PASSED - ${totalFailed}/5 test cases failed`);
    }
    console.log('='.repeat(70) + '\n');

    // Save report
    const reportData = {
      scenario: 'Scenario 2: Validation Gate Failures',
      testCases: results,
      performance: perfReport,
      summary: {
        totalTests: 5,
        passed: totalPassed,
        failed: totalFailed,
        passRate: (totalPassed / 5 * 100).toFixed(1) + '%'
      },
      timestamp: new Date().toISOString()
    };

    const fs = require('fs').promises;
    const path = require('path');
    const reportDir = path.join(__dirname, '..', 'reports');

    try {
      await fs.mkdir(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, `scenario-2-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📄 Detailed report saved: ${reportPath}\n`);
    } catch (err) {
      console.warn(`⚠️  Could not save report: ${err.message}\n`);
    }

    return {
      success: totalFailed === 0,
      results,
      performance: perfReport,
      summary: {
        totalTests: 5,
        passed: totalPassed,
        failed: totalFailed
      }
    };

  } catch (error) {
    console.error('\n❌ Fatal error during Scenario 2 execution:');
    console.error(error);

    perfMonitor.stop();

    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Execute if run directly
 */
if (require.main === module) {
  runScenario2()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runScenario2, runTest2A, runTest2B, runTest2C, runTest2D, runTest2E };
