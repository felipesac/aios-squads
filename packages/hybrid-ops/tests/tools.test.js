/**
 * @fileoverview Unit Tests for Cognitive Tools
 *
 * Tests for standalone CLI tools: coherence-scanner, future-backcaster, automation-checker
 * Using Node.js built-in test runner
 *
 * Run: node --test tests/tools.test.js
 *
 * @module tests/tools.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tool paths
const TOOLS_DIR = path.join(__dirname, '..', 'tools');
const COHERENCE_SCANNER = path.join(TOOLS_DIR, 'coherence-scanner.js');
const FUTURE_BACKCASTER = path.join(TOOLS_DIR, 'future-backcaster.js');
const AUTOMATION_CHECKER = path.join(TOOLS_DIR, 'automation-checker.js');

// Fixture paths
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const EXECUTOR_VALID = path.join(FIXTURES_DIR, 'executor-valid.json');
const EXECUTOR_LOW_TRUTHFULNESS = path.join(FIXTURES_DIR, 'executor-low-truthfulness.json');
const DECISION_HIGH_PRIORITY = path.join(FIXTURES_DIR, 'decision-high-priority.json');
const TASK_AUTOMATE_READY = path.join(FIXTURES_DIR, 'task-automate-ready.json');

/**
 * Format JSON object as a properly escaped CLI argument for Windows CMD
 *
 * @param {Object} obj - Object to convert to JSON
 * @returns {string} - Properly escaped JSON string for Windows CMD
 */
function jsonArg(obj) {
  const json = JSON.stringify(obj);
  // Windows CMD: Pass JSON as-is with quotes - CMD shell handles them correctly
  return json;
}

/**
 * Execute a tool and return parsed result
 *
 * @param {string} toolPath - Path to tool
 * @param {string|Array} args - CLI arguments string or array
 * @returns {Object} - { stdout, stderr, exitCode, json }
 */
function executeTool(toolPath, args) {
  // Convert args string to array if needed
  const argsArray = Array.isArray(args) ? args : args.split(' ').filter(a => a);

  const result = spawnSync('node', [toolPath, ...argsArray], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let json = null;

  // Try to parse JSON from stdout first (success case)
  if (result.status === 0 && result.stdout) {
    try {
      // Filter out console.log lines from heuristic-compiler
      const jsonLines = result.stdout.split('\n').filter(line =>
        line.trim() && !line.startsWith('✓') && !line.startsWith('🔧')
      );
      json = JSON.parse(jsonLines.join('\n'));
    } catch (e) {
      // Stdout is not JSON
    }
  }

  // Try to parse JSON from stderr (error case)
  if (!json && result.stderr) {
    try {
      // Parse the entire stderr as JSON (error messages are formatted JSON)
      json = JSON.parse(result.stderr.trim());
    } catch (e) {
      // Stderr is not JSON - this is fine, tools may output other error messages
    }
  }

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status || 0,
    json
  };
}

// ============================================================================
// COHERENCE SCANNER TESTS
// ============================================================================

describe('Coherence Scanner (PV_PA_001)', () => {
  it('should display help message with --help', () => {
    const result = executeTool(COHERENCE_SCANNER, '--help');
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /Coherence Scanner/);
    assert.match(result.stdout, /USAGE/);
    assert.match(result.stdout, /OPTIONS/);
  });

  it('should display version with --version', () => {
    const result = executeTool(COHERENCE_SCANNER, '--version');
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /Coherence Scanner v\d+\.\d+\.\d+/);
    assert.match(result.stdout, /PV_PA_001/);
  });

  it('should process valid executor profile from file', () => {
    const result = executeTool(COHERENCE_SCANNER, ['--input', EXECUTOR_VALID]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_PA_001');
    assert.strictEqual(typeof result.json.score, 'number');
    assert.strictEqual(typeof result.json.veto, 'boolean');
    assert.ok(['APPROVE', 'REVIEW', 'REJECT'].includes(result.json.recommendation));
  });

  it('should process valid executor via inline JSON', () => {
    const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({ truthfulness: 0.85, systemAdherence: 0.75, skill: 0.70 })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_PA_001');
  });

  it('should trigger veto for low truthfulness', () => {
    const result = executeTool(COHERENCE_SCANNER, ['--input', EXECUTOR_LOW_TRUTHFULNESS]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.veto, true);
    assert.strictEqual(result.json.recommendation, 'REJECT');
    assert.match(result.json.vetoReason, /TRUTHFULNESS_BELOW_THRESHOLD/);
  });

  it('should return VALIDATION_ERROR for missing required field', () => {
    const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({ truthfulness: 0.85 })]); // Missing systemAdherence and skill
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.match(result.json.message, /Missing required field/);
  });

  it('should return VALIDATION_ERROR for invalid input type', () => {
    const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({ truthfulness: 'invalid', systemAdherence: 0.75, skill: 0.70 })]);
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.match(result.json.message, /must be a number/);
  });

  it('should return VALIDATION_ERROR for out of range value', () => {
    const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({ truthfulness: 1.5, systemAdherence: 0.75, skill: 0.70 })]);
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.match(result.json.message, /between 0 and 1/);
  });

  it('should return error when no input method specified', () => {
    const result = executeTool(COHERENCE_SCANNER, '');
    assert.strictEqual(result.exitCode, 1);
    assert.match(result.stderr, /No input method specified/);
  });
});

// ============================================================================
// FUTURE BACKCASTER TESTS
// ============================================================================

describe('Future Backcaster (PV_BS_001)', () => {
  it('should display help message with --help', () => {
    const result = executeTool(FUTURE_BACKCASTER, '--help');
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /Future Backcaster/);
    assert.match(result.stdout, /USAGE/);
    assert.match(result.stdout, /OPTIONS/);
  });

  it('should display version with --version', () => {
    const result = executeTool(FUTURE_BACKCASTER, '--version');
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /Future Backcaster v\d+\.\d+\.\d+/);
    assert.match(result.stdout, /PV_BS_001/);
  });

  it('should process high-priority decision from file', () => {
    const result = executeTool(FUTURE_BACKCASTER, ['--input', DECISION_HIGH_PRIORITY]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_BS_001');
    assert.strictEqual(typeof result.json.score, 'number');
    assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(result.json.priority));
    assert.ok(['high', 'medium', 'low'].includes(result.json.confidence));
    assert.ok(['PROCEED', 'REVIEW', 'DEFER'].includes(result.json.recommendation));
  });

  it('should process decision via inline JSON (nested format)', () => {
    const result = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({
      endStateVision: { clarity: 0.9 },
      marketSignals: { alignment: 0.3 }
    })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_BS_001');
  });

  it('should process decision via inline JSON (simplified format)', () => {
    const result = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({
      endStateClarity: 0.9,
      marketAlignment: 0.3
    })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_BS_001');
  });

  it('should work with only end-state clarity (market alignment optional)', () => {
    const result = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({ endStateClarity: 0.85 })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_BS_001');
  });

  it('should return VALIDATION_ERROR for missing end-state clarity', () => {
    const result = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({ marketAlignment: 0.3 })]);
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.match(result.json.message, /end.*clarity/i);
  });

  it('should return VALIDATION_ERROR for invalid end-state clarity type', () => {
    const result = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({ endStateClarity: 'high' })]);
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
  });
});

// ============================================================================
// AUTOMATION CHECKER TESTS
// ============================================================================

describe('Automation Checker (PV_PM_001)', () => {
  it('should display help message with --help', () => {
    const result = executeTool(AUTOMATION_CHECKER, '--help');
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /Automation Checker/);
    assert.match(result.stdout, /USAGE/);
    assert.match(result.stdout, /OPTIONS/);
  });

  it('should display version with --version', () => {
    const result = executeTool(AUTOMATION_CHECKER, '--version');
    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /Automation Checker v\d+\.\d+\.\d+/);
    assert.match(result.stdout, /PV_PM_001/);
  });

  it('should process automation-ready task from file', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--input', TASK_AUTOMATE_READY]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_PM_001');
    assert.strictEqual(typeof result.json.readyToAutomate, 'boolean');
    assert.strictEqual(typeof result.json.tippingPoint, 'boolean');
    assert.strictEqual(typeof result.json.score, 'number');
    assert.strictEqual(typeof result.json.veto, 'boolean');
  });

  it('should process task via inline JSON', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: 5, standardizable: 0.8, hasGuardrails: true })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_PM_001');
  });

  it('should detect tipping point (frequency > 2)', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: 5, standardizable: 0.8, hasGuardrails: true })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.tippingPoint, true);
  });

  it('should not detect tipping point (frequency <= 2)', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: 1, standardizable: 0.8, hasGuardrails: true })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.tippingPoint, false);
  });

  it('should trigger veto for missing guardrails', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: 5, standardizable: 0.8, hasGuardrails: false })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.veto, true);
    assert.strictEqual(result.json.readyToAutomate, false);
    assert.match(result.json.vetoReason, /MISSING_GUARDRAILS/);
    assert.strictEqual(result.json.recommendation, 'ADD_GUARDRAILS_FIRST');
  });

  it('should support alternative field names', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({
      executionsPerMonth: 5,
      standardization: 0.8,
      guardrails: true
    })]);
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.json);
    assert.strictEqual(result.json.heuristic, 'PV_PM_001');
  });

  it('should return VALIDATION_ERROR for missing required field', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: 5 })]); // Missing standardizable and hasGuardrails
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.match(result.json.message, /Missing required field/);
  });

  it('should return VALIDATION_ERROR for invalid hasGuardrails type', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: 5, standardizable: 0.8, hasGuardrails: 'yes' })]);
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.match(result.json.message, /boolean/);
  });

  it('should return VALIDATION_ERROR for negative frequency', () => {
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: -1, standardizable: 0.8, hasGuardrails: true })]);
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.match(result.json.message, /non-negative/);
  });
});

// ============================================================================
// CROSS-TOOL CONSISTENCY TESTS
// ============================================================================

describe('Cross-Tool Consistency', () => {
  it('should produce identical results for same input (idempotency)', () => {
    const inputObj = { truthfulness: 0.85, systemAdherence: 0.75, skill: 0.70 };

    const result1 = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(inputObj)]);
    const result2 = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(inputObj)]);

    assert.strictEqual(result1.exitCode, 0);
    assert.strictEqual(result2.exitCode, 0);
    assert.deepStrictEqual(result1.json.score, result2.json.score);
    assert.deepStrictEqual(result1.json.recommendation, result2.json.recommendation);
  });

  it('should have consistent error format across all tools', () => {
    const coherenceResult = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({})]);
    const backcastResult = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({})]);
    const automationResult = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({})]);

    // All should return exit code 2 (validation error)
    assert.strictEqual(coherenceResult.exitCode, 2);
    assert.strictEqual(backcastResult.exitCode, 2);
    assert.strictEqual(automationResult.exitCode, 2);

    // All should have consistent error structure
    assert.ok(coherenceResult.json.error);
    assert.ok(coherenceResult.json.message);
    assert.ok(backcastResult.json.error);
    assert.ok(backcastResult.json.message);
    assert.ok(automationResult.json.error);
    assert.ok(automationResult.json.message);
  });

  it('should all include heuristic ID in successful output', () => {
    const coherenceResult = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({ truthfulness: 0.85, systemAdherence: 0.75, skill: 0.70 })]);
    const backcastResult = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({ endStateClarity: 0.9 })]);
    const automationResult = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({ frequency: 5, standardizable: 0.8, hasGuardrails: true })]);

    assert.strictEqual(coherenceResult.json.heuristic, 'PV_PA_001');
    assert.strictEqual(backcastResult.json.heuristic, 'PV_BS_001');
    assert.strictEqual(automationResult.json.heuristic, 'PV_PM_001');
  });
});

console.log('✓ All cognitive tools tests passed!');
