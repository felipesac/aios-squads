/**
 * Simplified Workflow Orchestration Test Suite
 * Story: 1.8 - Phase 3 Workflow Orchestration (Phase C.7)
 *
 * Core functionality tests for validation gates and workflow orchestration
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Set up mocks BEFORE requiring modules under test
const heuristicCompilerPath = path.resolve(__dirname, '../utils/heuristic-compiler.js');
const validationGatePath = path.resolve(__dirname, '../utils/validation-gate.js');

// Clear any existing cache
delete require.cache[heuristicCompilerPath];
delete require.cache[validationGatePath];

// Install mock for heuristic compiler
require.cache[heuristicCompilerPath] = {
  exports: {
    getCompiler: () => ({
      compile: (heuristicId) => {
        if (heuristicId === 'PV_BS_001') {
          return (context) => ({
            recommendation: context.end_state_vision >= 0.8 ? 'PROCEED' : 'DEFER',
            weighted_score: context.end_state_vision * 10,
            score: context.end_state_vision * 10
          });
        }
        if (heuristicId === 'PV_PA_001') {
          return (context) => ({
            recommendation: context.executors?.every(e => e.truthfulness >= 0.7) ? 'PROCEED' : 'DEFER',
            weighted_score: context.executors?.[0]?.truthfulness * 10 || 7.0,
            score: context.executors?.[0]?.truthfulness * 10 || 7.0
          });
        }
        if (heuristicId === 'PV_PM_001') {
          return (context) => ({
            recommendation: (context.frequency || 0) >= 2 ? 'AUTOMATE' : 'DEFER',
            score: (context.standardization || 0.7) * 10
          });
        }
        return () => ({ recommendation: 'UNKNOWN', score: 0 });
      }
    })
  }
};

// NOW require the modules under test
const { executeValidationGate } = require('../utils/validation-gate');
const feedbackGenerator = require('../utils/validation-feedback-generator');

console.log('==============================================================================');
console.log('  Workflow Orchestration Test Suite - Story 1.8 Phase C.7');
console.log('==============================================================================');
console.log('  Core Tests: 10');
console.log('  Coverage: Validation checkpoints, feedback generation, performance');
console.log('==============================================================================');

describe('Core Validation Checkpoint Tests', () => {

  test('Test 1: Strategic Alignment - Pass', async () => {
    const phase = {
      name: 'Architecture',
      validation: {
        checkpoint: 'strategic-alignment',
        heuristic: 'PV_BS_001',
        criteria: [
          'End-state vision ≥0.8',
          'Score ≥7.0'
        ]
      }
    };

    const context = {
      end_state_vision: 0.85,
      market_signals: 0.6
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.passed, true, 'Validation should pass');
    assert.strictEqual(result.gate, 'strategic-alignment');
    assert.ok(result.score >= 7.0, `Score ${result.score} should be >= 7.0`);
  });

  test('Test 2: Strategic Alignment - Fail', async () => {
    const phase = {
      name: 'Architecture',
      validation: {
        checkpoint: 'strategic-alignment',
        heuristic: 'PV_BS_001',
        criteria: [
          'End-state vision ≥0.8',
          'Score ≥7.0'
        ]
      }
    };

    const context = {
      end_state_vision: 0.65,
      market_signals: 0.4
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.passed, false, 'Validation should fail');
    assert.ok(result.feedback, 'Should have feedback');
    assert.ok(result.feedback.includes('❌'), 'Feedback should contain failure marker');
  });

  test('Test 3: Coherence Scan - Pass', async () => {
    const phase = {
      name: 'Executors',
      validation: {
        checkpoint: 'coherence-scan',
        heuristic: 'PV_PA_001',
        criteria: [
          'Score ≥7.0'
        ]
      }
    };

    const context = {
      executors: [
        { name: 'Process Mapper', truthfulness: 0.9 },
        { name: 'Workflow Designer', truthfulness: 0.85 }
      ]
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.passed, true, 'Validation should pass');
    assert.strictEqual(result.gate, 'coherence-scan');
  });

  test('Test 4: Coherence Scan - VETO (Truthfulness < 0.7)', async () => {
    const phase = {
      name: 'Executors',
      validation: {
        checkpoint: 'coherence-scan',
        heuristic: 'PV_PA_001',
        criteria: [
          'Score ≥7.0'
        ],
        veto_conditions: ['Truthfulness <0.7']
      }
    };

    const context = {
      executors: [
        { name: 'Bad Executor', truthfulness: 0.6 }
      ]
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.veto, true, 'VETO should be triggered');
    assert.ok(result.vetoes.length > 0, 'Should have veto reasons');
    assert.ok(result.feedback.includes('🛑'), 'Feedback should contain veto marker');
  });

  test('Test 5: Automation Readiness - Pass', async () => {
    const phase = {
      name: 'Workflows',
      validation: {
        checkpoint: 'automation-readiness',
        heuristic: 'PV_PM_001',
        criteria: [
          'Score ≥7.0'
        ]
      }
    };

    const context = {
      frequency: 3,
      standardization: 0.8,
      guardrails: ['Error handling', 'Rollback procedure']
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.passed, true, 'Validation should pass');
  });

  test('Test 6: Automation Readiness - VETO (No Guardrails)', async () => {
    const phase = {
      name: 'Workflows',
      validation: {
        checkpoint: 'automation-readiness',
        heuristic: 'PV_PM_001',
        criteria: [
          'Guardrails present'
        ],
        veto_conditions: ['No guardrails']
      }
    };

    const context = {
      frequency: 3,
      standardization: 0.8
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.veto, true, 'VETO should be triggered for missing guardrails');
    assert.ok(result.feedback.includes('🛑'), 'Feedback should contain veto marker');
  });

  test('Test 7: Axioma Compliance - Pass', async () => {
    const phase = {
      name: 'QA',
      validation: {
        checkpoint: 'axioma-compliance',
        validator: 'axioma-validator',
        criteria: [
          'Overall score ≥7.0',
          'No dimension below 6.0'
        ]
      }
    };

    const context = {
      axioma: {
        'Truthfulness': 7.5,
        'Coherence': 8.0,
        'Strategic Alignment': 7.2
      }
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.passed, true, 'Axioma validation should pass');
    assert.ok(result.score >= 7.0, 'Score should meet threshold');
  });

  test('Test 8: Task Anatomy - Pass', async () => {
    const phase = {
      name: 'ClickUp Creation',
      validation: {
        checkpoint: 'task-anatomy',
        validator: 'task-anatomy',
        criteria: [
          'Task Anatomy fields present'
        ]
      }
    };

    const context = {
      tasks: [
        {
          name: 'Setup ClickUp',
          description: 'Create workspace',
          status: 'pending',
          assignee: 'Admin',
          'due date': '2025-02-01',
          dependencies: [],
          'automation trigger': 'manual',
          'validation criteria': 'Workspace created'
        }
      ]
    };

    const result = await executeValidationGate(phase, context);

    assert.strictEqual(result.passed, true, 'Task anatomy validation should pass');
  });
});

describe('Validation Feedback Tests', () => {

  test('Test 9: Feedback Exists in Validation Results', async () => {
    // Verify feedback is generated for failures
    const failPhase = {
      name: 'Test',
      validation: {
        checkpoint: 'test-checkpoint',
        heuristic: 'PV_BS_001',
        criteria: ['Score ≥10.0'],
        feedback_on_failure: ['Improve score']
      }
    };

    const lowScoreContext = { end_state_vision: 0.5 };
    const result = await executeValidationGate(failPhase, lowScoreContext);

    assert.ok(result.feedback, 'Failure should have feedback');
    assert.ok(result.feedback.length > 0, 'Feedback should not be empty');
  });
});

describe('Performance Tests', () => {

  test('Test 12: Checkpoint Execution Time < 100ms', async () => {
    const phase = {
      name: 'Architecture',
      validation: {
        checkpoint: 'strategic-alignment',
        heuristic: 'PV_BS_001',
        criteria: ['Score ≥7.0']
      }
    };

    const context = { end_state_vision: 0.85, market_signals: 0.6 };

    const start = Date.now();
    await executeValidationGate(phase, context);
    const duration = Date.now() - start;

    assert.ok(duration < 100, `Execution took ${duration}ms, should be < 100ms`);
  });
});

console.log('\\n==============================================================================');
console.log('  Test suite completed');
console.log('==============================================================================\\n');
