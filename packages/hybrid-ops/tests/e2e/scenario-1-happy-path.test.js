/**
 * Scenario 1: End-to-End Success Path (Happy Path)
 *
 * Tests complete process mapping with all validation gates passing:
 * Discovery → Architecture → Executors → Workflows → QA → ClickUp
 *
 * Expected Results:
 * - All validation gates pass (PV_BS_001, PV_PA_001, PV_PM_001, AXIOMA, TASK_ANATOMY)
 * - ClickUp hierarchy created correctly
 * - All tasks include complete Task Anatomy
 * - Execution completes within performance targets
 *
 * @module Scenario1HappyPath
 * @author Quinn (QA Engineer)
 * @created 2025-10-19
 */

const { E2ETestRunner, ScenarioBuilder } = require('./framework');
const { IntegratedPerformanceMonitor } = require('../performance/performance-monitor');

/**
 * Main test suite for Scenario 1
 */
async function runScenario1() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Scenario 1: E2E Success Path (Happy Path)               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Initialize test runner with performance monitoring
  const runner = new E2ETestRunner({
    verbose: true,
    mockClickUp: true,
    cleanupAfterEach: true,
    timeout: 600000 // 10 minutes
  });

  const perfMonitor = new IntegratedPerformanceMonitor({
    memory: {
      samplingInterval: 1000,
      warningThreshold: 100 * 1024 * 1024, // 100MB
      criticalThreshold: 150 * 1024 * 1024  // 150MB
    }
  });

  try {
    // Start performance monitoring
    perfMonitor.start();
    const testStartTime = perfMonitor.profiler.startTimer('scenario-1-total');

    // Initialize test runner (load fixtures, setup mocks)
    await runner.initialize();

    // Build the test scenario using ScenarioBuilder
    const scenario = new ScenarioBuilder('Scenario 1: E2E Success Path', 'S1')
      .useFixture('sample-process-simple.json', 'processDefinition')
      .useFixture('mind-snapshot-sample.yaml', 'mindArtifacts')
      .useFixture('clickup-hierarchy-template.json', 'expectedClickUp')
      .useFixture('expected-validation-results.json', 'expectedValidation')

      // STEP 1: Discovery Phase
      .addStep('workflow', {
        phase: 'discovery',
        description: 'Capture process details and end-state vision',
        input: 'processDefinition.discovery',
        expectedOutput: {
          endState: 'defined',
          painPoints: 'captured',
          desiredOutcomes: 'listed'
        }
      })

      // STEP 2: Architecture Phase + PV_BS_001 Validation
      .addStep('workflow', {
        phase: 'architecture',
        description: 'Design solution and strategic alignment',
        input: 'processDefinition.architecture',
        expectedOutput: {
          solutionDesign: 'complete',
          strategicAlignment: 'validated'
        }
      })
      .addStep('validation', {
        gate: 'PV_BS_001',
        description: 'Validate strategic alignment and end-state clarity',
        input: {
          endStateClarity: 0.9,
          visionAlignment: 0.85,
          successCriteriaDefined: true
        },
        expectedResult: {
          passed: true,
          score: '>=8.0',
          recommendation: 'APPROVE',
          vetoTriggered: false
        }
      })

      // STEP 3: Executors Phase + PV_PA_001 Validation
      .addStep('workflow', {
        phase: 'executors',
        description: 'Select team members and validate coherence',
        input: 'processDefinition.executors',
        expectedOutput: {
          teamSelected: true,
          rolesAssigned: true
        }
      })
      .addStep('validation', {
        gate: 'PV_PA_001',
        description: 'Validate executor truthfulness and coherence',
        input: {
          team: [{
            name: 'Maria Silva',
            truthfulness: 0.95,
            systemAdherence: 0.90,
            skillMatch: 0.92
          }]
        },
        expectedResult: {
          passed: true,
          score: '>=9.0',
          recommendation: 'APPROVE',
          vetoTriggered: false
        }
      })

      // STEP 4: Workflows Phase + PV_PM_001 Validation
      .addStep('workflow', {
        phase: 'workflows',
        description: 'Design automation workflows with guardrails',
        input: 'processDefinition.workflows',
        expectedOutput: {
          workflowsDesigned: true,
          guardrailsDefined: true
        }
      })
      .addStep('validation', {
        gate: 'PV_PM_001',
        description: 'Validate automation readiness and safety',
        input: {
          automationType: 'full-automation',
          riskLevel: 'low',
          guardrails: ['Data validation before CRM insertion', 'Duplicate check mechanism'],
          automationReadiness: 0.88
        },
        expectedResult: {
          passed: true,
          score: '>=8.5',
          recommendation: 'APPROVE',
          vetoTriggered: false
        }
      })

      // STEP 5: QA Phase + Axioma Validation
      .addStep('workflow', {
        phase: 'qa',
        description: 'Quality assurance and process validation',
        input: 'processDefinition.qa',
        expectedOutput: {
          processValidated: true,
          testPlanCreated: true
        }
      })
      .addStep('validation', {
        gate: 'AXIOMA',
        description: 'Validate process completeness and quality',
        input: {
          completeness: 0.9,
          actionOrientation: 0.85,
          progressIndicators: 0.88,
          riskMitigation: 0.82
        },
        expectedResult: {
          passed: true,
          score: '>=8.0',
          threshold: 7.0,
          violationsCount: 0
        }
      })

      // STEP 6: ClickUp Creation Phase + Task Anatomy Validation
      .addStep('workflow', {
        phase: 'clickup',
        description: 'Create ClickUp hierarchy and tasks',
        input: 'processDefinition.clickup',
        expectedOutput: {
          hierarchyCreated: true,
          tasksCreated: true
        }
      })
      .addStep('validation', {
        gate: 'TASK_ANATOMY',
        description: 'Validate Task Anatomy completeness',
        input: {
          input: 'Customer data fields requirements, branding guidelines',
          outcome: 'Typeform with all required fields configured and tested',
          process: '1. Create form in Typeform\n2. Add all customer data fields\n3. Apply branding\n4. Test submission flow\n5. Get shareable link',
          success: 'Form submissions capture all required data correctly'
        },
        expectedResult: {
          passed: true,
          missingFields: []
        }
      })

      // STEP 7: Verification Assertions
      .addStep('assertion', {
        description: 'Verify ClickUp creation matches template',
        assertion: 'verifyClickUpCreation',
        expectedData: {
          hierarchy: true,
          taskCount: 10,
          requireTaskAnatomy: true,
          allFieldsPresent: ['input', 'outcome', 'process', 'success']
        }
      })
      .addStep('assertion', {
        description: 'Verify all validation gates passed',
        assertion: 'verifyAllGatesPassed',
        expectedData: {
          gates: ['PV_BS_001', 'PV_PA_001', 'PV_PM_001', 'AXIOMA', 'TASK_ANATOMY'],
          allPassed: true
        }
      })
      .addStep('assertion', {
        description: 'Verify performance targets met',
        assertion: 'verifyPerformanceTargets',
        expectedData: {
          totalDuration: '<600000', // < 10 minutes
          validationOverhead: '<300', // < 300ms total
          memoryUsage: '<100MB'
        }
      })

      .build();

    // Execute the scenario
    console.log('\n📋 Scenario Configuration:');
    console.log(`   Steps: ${scenario.steps.length}`);
    console.log(`   Fixtures: ${scenario.fixtures.length}`);
    console.log(`   Expected Results: ${scenario.expectedResults.length}`);
    console.log('\n🚀 Starting execution...\n');

    const result = await runner.runScenario(scenario);

    // End performance monitoring
    perfMonitor.profiler.endTimer('scenario-1-total', testStartTime);
    perfMonitor.stop();

    // Generate comprehensive reports
    console.log('\n' + '='.repeat(70));
    console.log('SCENARIO RESULTS');
    console.log('='.repeat(70));

    console.log('\n📊 Test Summary:');
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Duration: ${result.duration}ms (${(result.duration / 1000).toFixed(2)}s)`);
    console.log(`   Steps Executed: ${result.steps.length}`);
    console.log(`   Steps Passed: ${result.steps.filter(s => s.passed).length}`);
    console.log(`   Steps Failed: ${result.steps.filter(s => !s.passed).length}`);

    // Performance Report
    const perfReport = perfMonitor.generateComprehensiveReport();
    console.log('\n⚡ Performance Report:');
    console.log(`   Session Duration: ${perfMonitor.memoryMonitor.formatDuration(perfReport.sessionDuration)}`);
    console.log(`   Total Operations: ${perfReport.summary.totalOperations}`);
    console.log(`   Memory Leak Detected: ${perfReport.summary.memoryLeakDetected ? '❌ YES' : '✅ NO'}`);
    console.log(`   Validation Overhead Target Met: ${perfReport.summary.validationOverheadMeetsTarget ? '✅ YES' : '❌ NO'}`);

    // Memory Statistics
    if (perfReport.memory.stats) {
      console.log('\n💾 Memory Statistics:');
      console.log(`   Heap Used (mean): ${perfMonitor.memoryMonitor.formatBytes(perfReport.memory.stats.heap.mean)}`);
      console.log(`   Heap Growth: ${perfReport.memory.stats.heap.growthPercent}%`);
      console.log(`   RSS (mean): ${perfMonitor.memoryMonitor.formatBytes(perfReport.memory.stats.rss.mean)}`);
      console.log(`   Samples Collected: ${perfReport.memory.stats.sampleCount}`);
    }

    // Validation Overhead
    if (perfReport.validationOverhead.total.count > 0) {
      console.log('\n🔍 Validation Overhead:');
      console.log(`   Total Validations: ${perfReport.validationOverhead.total.count}`);
      console.log(`   Mean Duration: ${perfReport.validationOverhead.total.mean.toFixed(2)}ms`);
      console.log(`   P95 Duration: ${perfReport.validationOverhead.total.p95.toFixed(2)}ms`);

      console.log('\n   By Gate:');
      for (const [gate, stats] of Object.entries(perfReport.validationOverhead.byGate)) {
        console.log(`     ${gate}: ${stats.mean.toFixed(2)}ms (p95: ${stats.p95.toFixed(2)}ms)`);
      }
    }

    // Step-by-step results
    console.log('\n📝 Step Results:');
    result.steps.forEach((step, index) => {
      const icon = step.passed ? '✅' : '❌';
      console.log(`   ${icon} Step ${index + 1}: ${step.description}`);
      if (step.duration) {
        console.log(`      Duration: ${step.duration}ms`);
      }
      if (step.error) {
        console.log(`      Error: ${step.error}`);
      }
    });

    // Overall result
    console.log('\n' + '='.repeat(70));
    if (result.status === 'passed') {
      console.log('✅ SCENARIO 1 PASSED - E2E Success Path validated successfully!');
    } else {
      console.log('❌ SCENARIO 1 FAILED - See errors above');
    }
    console.log('='.repeat(70) + '\n');

    // Save detailed report to file
    const reportData = {
      scenario: result,
      performance: perfReport,
      timestamp: new Date().toISOString(),
      testEnvironment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    const fs = require('fs').promises;
    const path = require('path');
    const reportDir = path.join(__dirname, '..', 'reports');

    try {
      await fs.mkdir(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, `scenario-1-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📄 Detailed report saved: ${reportPath}\n`);
    } catch (err) {
      console.warn(`⚠️  Could not save report: ${err.message}\n`);
    }

    return {
      success: result.status === 'passed',
      result,
      performance: perfReport
    };

  } catch (error) {
    console.error('\n❌ Fatal error during Scenario 1 execution:');
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
  runScenario1()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runScenario1 };
