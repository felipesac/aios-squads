/**
 * Scenario 5: Validation Accuracy Test
 *
 * Tests validation accuracy against Pedro Valério's expected judgments.
 * Compares system validation results with 30 pre-judged real scenarios.
 *
 * Accuracy Targets (from Story 1.13):
 * - Overall accuracy: >=95%
 * - No false approvals (Type I errors) for critical gates
 * - Acceptable false rejections (Type II errors) <5%
 *
 * @module Scenario5ValidationAccuracy
 * @author Quinn (QA Engineer)
 * @created 2025-10-19
 */

const { E2ETestRunner } = require('./framework');
const { IntegratedPerformanceMonitor } = require('../performance/performance-monitor');

/**
 * Sample validation scenarios with Pedro's expected judgments
 * In production, these would be loaded from a fixture file with 30+ scenarios
 */
const VALIDATION_SCENARIOS = [
  // Strategic Alignment (PV_BS_001) - 6 scenarios
  {
    id: 'VAL-001',
    gate: 'PV_BS_001',
    description: 'Clear end-state with measurable outcomes',
    input: { endStateClarity: 0.92, visionAlignment: 0.88, successCriteriaDefined: true },
    expectedJudgment: { passed: true, score: 8.8, recommendation: 'APPROVE' }
  },
  {
    id: 'VAL-002',
    gate: 'PV_BS_001',
    description: 'Vague vision statement',
    input: { endStateClarity: 0.55, visionAlignment: 0.60, successCriteriaDefined: false },
    expectedJudgment: { passed: false, score: 5.2, recommendation: 'DEFER' }
  },
  {
    id: 'VAL-003',
    gate: 'PV_BS_001',
    description: 'Good clarity but misaligned vision',
    input: { endStateClarity: 0.85, visionAlignment: 0.62, successCriteriaDefined: true },
    expectedJudgment: { passed: false, score: 6.8, recommendation: 'REFINE' }
  },
  {
    id: 'VAL-004',
    gate: 'PV_BS_001',
    description: 'Borderline case - just meets threshold',
    input: { endStateClarity: 0.72, visionAlignment: 0.71, successCriteriaDefined: true },
    expectedJudgment: { passed: true, score: 7.1, recommendation: 'APPROVE' }
  },
  {
    id: 'VAL-005',
    gate: 'PV_BS_001',
    description: 'Excellent strategic alignment',
    input: { endStateClarity: 0.95, visionAlignment: 0.93, successCriteriaDefined: true },
    expectedJudgment: { passed: true, score: 9.3, recommendation: 'APPROVE' }
  },
  {
    id: 'VAL-006',
    gate: 'PV_BS_001',
    description: 'Missing success criteria',
    input: { endStateClarity: 0.80, visionAlignment: 0.78, successCriteriaDefined: false },
    expectedJudgment: { passed: false, score: 6.5, recommendation: 'DEFER' }
  },

  // Coherence Scan (PV_PA_001) - 6 scenarios
  {
    id: 'VAL-007',
    gate: 'PV_PA_001',
    description: 'Highly truthful executor with good skills',
    input: { truthfulness: 0.95, systemAdherence: 0.90, skillMatch: 0.92 },
    expectedJudgment: { passed: true, score: 9.2, recommendation: 'APPROVE', vetoTriggered: false }
  },
  {
    id: 'VAL-008',
    gate: 'PV_PA_001',
    description: 'Truthfulness below veto threshold',
    input: { truthfulness: 0.65, systemAdherence: 0.85, skillMatch: 0.90 },
    expectedJudgment: { passed: false, score: 0, recommendation: 'REJECT', vetoTriggered: true }
  },
  {
    id: 'VAL-009',
    gate: 'PV_PA_001',
    description: 'Borderline truthfulness - just meets threshold',
    input: { truthfulness: 0.72, systemAdherence: 0.80, skillMatch: 0.85 },
    expectedJudgment: { passed: true, score: 7.8, recommendation: 'APPROVE', vetoTriggered: false }
  },
  {
    id: 'VAL-010',
    gate: 'PV_PA_001',
    description: 'Good truthfulness but poor skill match',
    input: { truthfulness: 0.90, systemAdherence: 0.85, skillMatch: 0.60 },
    expectedJudgment: { passed: true, score: 8.0, recommendation: 'APPROVE', vetoTriggered: false }
  },
  {
    id: 'VAL-011',
    gate: 'PV_PA_001',
    description: 'Perfect coherence scores',
    input: { truthfulness: 1.0, systemAdherence: 0.95, skillMatch: 0.95 },
    expectedJudgment: { passed: true, score: 9.7, recommendation: 'APPROVE', vetoTriggered: false }
  },
  {
    id: 'VAL-012',
    gate: 'PV_PA_001',
    description: 'Truthfulness exactly at threshold',
    input: { truthfulness: 0.70, systemAdherence: 0.80, skillMatch: 0.85 },
    expectedJudgment: { passed: true, score: 7.5, recommendation: 'APPROVE', vetoTriggered: false }
  },

  // Automation Readiness (PV_PM_001) - 6 scenarios
  {
    id: 'VAL-013',
    gate: 'PV_PM_001',
    description: 'High risk with adequate guardrails',
    input: { riskLevel: 'high', guardrails: ['Validation', 'Rollback', 'Monitoring'], automationReadiness: 0.85 },
    expectedJudgment: { passed: true, score: 8.5, recommendation: 'APPROVE', vetoTriggered: false }
  },
  {
    id: 'VAL-014',
    gate: 'PV_PM_001',
    description: 'High risk with NO guardrails',
    input: { riskLevel: 'high', guardrails: [], automationReadiness: 0.90 },
    expectedJudgment: { passed: false, score: 0, recommendation: 'ADD_GUARDRAILS_FIRST', vetoTriggered: true }
  },
  {
    id: 'VAL-015',
    gate: 'PV_PM_001',
    description: 'Low risk without guardrails - acceptable',
    input: { riskLevel: 'low', guardrails: [], automationReadiness: 0.88 },
    expectedJudgment: { passed: true, score: 8.8, recommendation: 'APPROVE', vetoTriggered: false }
  },
  {
    id: 'VAL-016',
    gate: 'PV_PM_001',
    description: 'Medium risk with minimal guardrails',
    input: { riskLevel: 'medium', guardrails: ['Validation'], automationReadiness: 0.75 },
    expectedJudgment: { passed: true, score: 7.5, recommendation: 'APPROVE', vetoTriggered: false }
  },
  {
    id: 'VAL-017',
    gate: 'PV_PM_001',
    description: 'Low readiness score',
    input: { riskLevel: 'low', guardrails: ['Validation'], automationReadiness: 0.55 },
    expectedJudgment: { passed: false, score: 5.5, recommendation: 'IMPROVE_READINESS', vetoTriggered: false }
  },
  {
    id: 'VAL-018',
    gate: 'PV_PM_001',
    description: 'Excellent readiness with comprehensive guardrails',
    input: { riskLevel: 'medium', guardrails: ['Validation', 'Rollback', 'Monitoring', 'Alerting'], automationReadiness: 0.95 },
    expectedJudgment: { passed: true, score: 9.5, recommendation: 'APPROVE', vetoTriggered: false }
  },

  // Axioma Quality (AXIOMA) - 6 scenarios
  {
    id: 'VAL-019',
    gate: 'AXIOMA',
    description: 'High quality across all dimensions',
    input: { completeness: 0.92, actionOrientation: 0.88, progressIndicators: 0.90, riskMitigation: 0.85 },
    expectedJudgment: { passed: true, score: 8.9, threshold: 7.0, violationsCount: 0 }
  },
  {
    id: 'VAL-020',
    gate: 'AXIOMA',
    description: 'Below threshold - generic process',
    input: { completeness: 0.50, actionOrientation: 0.45, progressIndicators: 0.40, riskMitigation: 0.35 },
    expectedJudgment: { passed: false, score: 4.3, threshold: 7.0, violationsCount: '>5' }
  },
  {
    id: 'VAL-021',
    gate: 'AXIOMA',
    description: 'Borderline - just meets threshold',
    input: { completeness: 0.75, actionOrientation: 0.70, progressIndicators: 0.68, riskMitigation: 0.65 },
    expectedJudgment: { passed: true, score: 7.0, threshold: 7.0, violationsCount: 2 }
  },
  {
    id: 'VAL-022',
    gate: 'AXIOMA',
    description: 'Good completeness but poor action orientation',
    input: { completeness: 0.90, actionOrientation: 0.50, progressIndicators: 0.75, riskMitigation: 0.70 },
    expectedJudgment: { passed: false, score: 6.8, threshold: 7.0, violationsCount: 3 }
  },
  {
    id: 'VAL-023',
    gate: 'AXIOMA',
    description: 'Excellent quality process',
    input: { completeness: 0.95, actionOrientation: 0.92, progressIndicators: 0.93, riskMitigation: 0.90 },
    expectedJudgment: { passed: true, score: 9.3, threshold: 7.0, violationsCount: 0 }
  },
  {
    id: 'VAL-024',
    gate: 'AXIOMA',
    description: 'Missing risk mitigation',
    input: { completeness: 0.85, actionOrientation: 0.80, progressIndicators: 0.82, riskMitigation: 0.30 },
    expectedJudgment: { passed: false, score: 6.5, threshold: 7.0, violationsCount: 4 }
  },

  // Task Anatomy (TASK_ANATOMY) - 6 scenarios
  {
    id: 'VAL-025',
    gate: 'TASK_ANATOMY',
    description: 'Complete Task Anatomy with all fields',
    input: { input: 'defined', outcome: 'defined', process: 'defined', success: 'defined' },
    expectedJudgment: { passed: true, missingFields: [] }
  },
  {
    id: 'VAL-026',
    gate: 'TASK_ANATOMY',
    description: 'Missing input field',
    input: { outcome: 'defined', process: 'defined', success: 'defined' },
    expectedJudgment: { passed: false, missingFields: ['input'] }
  },
  {
    id: 'VAL-027',
    gate: 'TASK_ANATOMY',
    description: 'Missing multiple fields',
    input: { input: 'defined', outcome: 'defined' },
    expectedJudgment: { passed: false, missingFields: ['process', 'success'] }
  },
  {
    id: 'VAL-028',
    gate: 'TASK_ANATOMY',
    description: 'Empty fields should fail',
    input: { input: '', outcome: 'defined', process: 'defined', success: 'defined' },
    expectedJudgment: { passed: false, missingFields: ['input'] }
  },
  {
    id: 'VAL-029',
    gate: 'TASK_ANATOMY',
    description: 'Only one field present',
    input: { process: 'defined' },
    expectedJudgment: { passed: false, missingFields: ['input', 'outcome', 'success'] }
  },
  {
    id: 'VAL-030',
    gate: 'TASK_ANATOMY',
    description: 'Complete anatomy with detailed content',
    input: {
      input: 'API credentials, data requirements',
      outcome: 'Fully functional integration',
      process: '1. Connect API\n2. Configure\n3. Test',
      success: 'All tests pass'
    },
    expectedJudgment: { passed: true, missingFields: [] }
  }
];

/**
 * Run single validation scenario and compare with expected judgment
 * @param {E2ETestRunner} runner - Test runner
 * @param {Object} scenario - Validation scenario
 * @returns {Object} Accuracy result
 */
async function testValidationScenario(runner, scenario) {
  const { id, gate, description, input, expectedJudgment } = scenario;

  // Execute validation
  const actualResult = await runner.executeValidation({
    gate,
    input,
    description
  });

  // Compare actual vs expected
  const passedMatch = actualResult.passed === expectedJudgment.passed;
  const vetoMatch = gate !== 'PV_PA_001' && gate !== 'PV_PM_001' ? true : actualResult.vetoTriggered === expectedJudgment.vetoTriggered;

  let scoreMatch = true;
  if (expectedJudgment.score !== undefined) {
    if (typeof expectedJudgment.score === 'string' && expectedJudgment.score.startsWith('>=')) {
      const minScore = parseFloat(expectedJudgment.score.substring(2));
      scoreMatch = actualResult.score >= minScore;
    } else if (typeof expectedJudgment.score === 'string' && expectedJudgment.score.startsWith('<')) {
      const maxScore = parseFloat(expectedJudgment.score.substring(1));
      scoreMatch = actualResult.score < maxScore;
    } else {
      const tolerance = 0.5;
      scoreMatch = Math.abs(actualResult.score - expectedJudgment.score) <= tolerance;
    }
  }

  const accurate = passedMatch && vetoMatch && scoreMatch;

  // Determine error type
  let errorType = null;
  if (!accurate) {
    if (expectedJudgment.passed && !actualResult.passed) {
      errorType = 'FALSE_NEGATIVE'; // Type II error
    } else if (!expectedJudgment.passed && actualResult.passed) {
      errorType = 'FALSE_POSITIVE'; // Type I error - CRITICAL
    } else {
      errorType = 'SCORE_MISMATCH';
    }
  }

  return {
    scenarioId: id,
    gate,
    description,
    accurate,
    errorType,
    expected: expectedJudgment,
    actual: {
      passed: actualResult.passed,
      score: actualResult.score,
      vetoTriggered: actualResult.vetoTriggered
    }
  };
}

/**
 * Main test suite for Scenario 5
 */
async function runScenario5() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Scenario 5: Validation Accuracy Test (30 scenarios)     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const runner = new E2ETestRunner({
    verbose: false,
    mockClickUp: true,
    cleanupAfterEach: false,
    timeout: 600000
  });

  const perfMonitor = new IntegratedPerformanceMonitor();

  try {
    perfMonitor.start();
    const testStartTime = perfMonitor.profiler.startTimer('scenario-5-total');

    await runner.initialize();

    console.log(`📋 Testing ${VALIDATION_SCENARIOS.length} validation scenarios...\n`);

    const results = [];
    let accurateCount = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let scoreMismatches = 0;

    // Test each scenario
    for (const scenario of VALIDATION_SCENARIOS) {
      const startTime = perfMonitor.profiler.startTimer(`validate-${scenario.id}`);
      const result = await testValidationScenario(runner, scenario);
      perfMonitor.profiler.endTimer(`validate-${scenario.id}`, startTime);

      results.push(result);

      if (result.accurate) {
        accurateCount++;
      } else {
        if (result.errorType === 'FALSE_POSITIVE') falsePositives++;
        if (result.errorType === 'FALSE_NEGATIVE') falseNegatives++;
        if (result.errorType === 'SCORE_MISMATCH') scoreMismatches++;
      }

      const icon = result.accurate ? '✅' : '❌';
      const errorInfo = result.errorType ? ` (${result.errorType})` : '';
      console.log(`   ${icon} ${scenario.id}: ${scenario.description}${errorInfo}`);
    }

    perfMonitor.profiler.endTimer('scenario-5-total', testStartTime);
    perfMonitor.stop();

    // Calculate accuracy metrics
    const totalScenarios = VALIDATION_SCENARIOS.length;
    const accuracyRate = (accurateCount / totalScenarios * 100).toFixed(1);
    const falsePositiveRate = (falsePositives / totalScenarios * 100).toFixed(1);
    const falseNegativeRate = (falseNegatives / totalScenarios * 100).toFixed(1);

    // Accuracy by gate
    const byGate = {};
    for (const result of results) {
      if (!byGate[result.gate]) {
        byGate[result.gate] = { total: 0, accurate: 0 };
      }
      byGate[result.gate].total++;
      if (result.accurate) byGate[result.gate].accurate++;
    }

    // Generate report
    console.log('\n' + '='.repeat(70));
    console.log('SCENARIO 5 RESULTS SUMMARY');
    console.log('='.repeat(70));

    console.log('\n📊 Overall Accuracy:');
    console.log(`   Total Scenarios: ${totalScenarios}`);
    console.log(`   Accurate: ${accurateCount}`);
    console.log(`   Inaccurate: ${totalScenarios - accurateCount}`);
    console.log(`   Accuracy Rate: ${accuracyRate}%`);

    console.log('\n⚠️  Error Analysis:');
    console.log(`   False Positives (Type I): ${falsePositives} (${falsePositiveRate}%)`);
    console.log(`   False Negatives (Type II): ${falseNegatives} (${falseNegativeRate}%)`);
    console.log(`   Score Mismatches: ${scoreMismatches}`);

    console.log('\n🎯 Accuracy by Gate:');
    for (const [gate, stats] of Object.entries(byGate)) {
      const gateAccuracy = (stats.accurate / stats.total * 100).toFixed(1);
      const icon = gateAccuracy >= 95 ? '✅' : gateAccuracy >= 85 ? '⚠️ ' : '❌';
      console.log(`   ${icon} ${gate}: ${gateAccuracy}% (${stats.accurate}/${stats.total})`);
    }

    // Check if targets met
    const targetsMet = {
      overallAccuracy: parseFloat(accuracyRate) >= 95,
      noFalsePositives: falsePositives === 0,
      lowFalseNegatives: parseFloat(falseNegativeRate) < 5
    };

    console.log('\n✓ Target Compliance:');
    console.log(`   Overall Accuracy >=95%: ${targetsMet.overallAccuracy ? '✅ YES' : '❌ NO'} (${accuracyRate}%)`);
    console.log(`   No False Approvals: ${targetsMet.noFalsePositives ? '✅ YES' : '❌ NO'} (${falsePositives} found)`);
    console.log(`   False Rejections <5%: ${targetsMet.lowFalseNegatives ? '✅ YES' : '❌ NO'} (${falseNegativeRate}%)`);

    const allTargetsMet = Object.values(targetsMet).every(v => v);

    console.log('\n' + '='.repeat(70));
    if (allTargetsMet && accurateCount === totalScenarios) {
      console.log('✅ SCENARIO 5 PASSED - Perfect validation accuracy achieved!');
    } else if (allTargetsMet) {
      console.log('✅ SCENARIO 5 PASSED - Accuracy targets met!');
    } else {
      console.log('❌ SCENARIO 5 FAILED - Accuracy targets not met');
    }
    console.log('='.repeat(70) + '\n');

    // Save report
    const reportData = {
      scenario: 'Scenario 5: Validation Accuracy Test',
      totalScenarios,
      accurateCount,
      accuracyRate: parseFloat(accuracyRate),
      errorAnalysis: {
        falsePositives,
        falseNegatives,
        scoreMismatches,
        falsePositiveRate: parseFloat(falsePositiveRate),
        falseNegativeRate: parseFloat(falseNegativeRate)
      },
      byGate,
      targetsMet,
      detailedResults: results,
      timestamp: new Date().toISOString()
    };

    const fs = require('fs').promises;
    const path = require('path');
    const reportDir = path.join(__dirname, '..', 'reports');

    try {
      await fs.mkdir(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, `scenario-5-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📄 Detailed report saved: ${reportPath}\n`);
    } catch (err) {
      console.warn(`⚠️  Could not save report: ${err.message}\n`);
    }

    return {
      success: allTargetsMet,
      accuracyRate: parseFloat(accuracyRate),
      results,
      targetsMet
    };

  } catch (error) {
    console.error('\n❌ Fatal error during Scenario 5 execution:');
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
  runScenario5()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runScenario5, testValidationScenario, VALIDATION_SCENARIOS };
