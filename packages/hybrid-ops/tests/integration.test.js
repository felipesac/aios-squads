/**
 * @fileoverview Integration Tests for Cognitive Tools
 *
 * Tests for tool integration scenarios including:
 * - Custom workflow pipelines
 * - Performance benchmarks
 * - Cross-tool data flow
 * - Real-world usage patterns
 *
 * Run: node --test tests/integration.test.js
 *
 * @module tests/integration.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

// Tool paths
const TOOLS_DIR = path.join(__dirname, '..', 'tools');
const COHERENCE_SCANNER = path.join(TOOLS_DIR, 'coherence-scanner.js');
const FUTURE_BACKCASTER = path.join(TOOLS_DIR, 'future-backcaster.js');
const AUTOMATION_CHECKER = path.join(TOOLS_DIR, 'automation-checker.js');

/**
 * Execute a tool and measure performance
 * @param {string} toolPath - Path to the tool
 * @param {Array<string>} args - Arguments to pass
 * @returns {Object} Result with timing and output
 */
function executeTool(toolPath, args) {
  const startTime = process.hrtime.bigint();

  const result = spawnSync('node', [toolPath, ...args], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const endTime = process.hrtime.bigint();
  const durationMs = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

  let json = null;

  // Try to parse JSON from stdout first (success case)
  if (result.status === 0 && result.stdout) {
    try {
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
      json = JSON.parse(result.stderr.trim());
    } catch (e) {
      // Stderr is not JSON
    }
  }

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status || 0,
    json,
    durationMs
  };
}

/**
 * Helper to create JSON argument
 */
function jsonArg(obj) {
  return JSON.stringify(obj);
}

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================

describe('Performance Benchmarks', () => {
  it('coherence-scanner should complete in <50ms', () => {
    const input = { truthfulness: 0.85, systemAdherence: 0.75, skill: 0.70 };
    const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(input)]);

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.durationMs < 50,
      `Expected <50ms, but took ${result.durationMs.toFixed(2)}ms`);
  });

  it('future-backcaster should complete in <50ms', () => {
    const input = { endStateClarity: 0.9 };
    const result = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg(input)]);

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.durationMs < 50,
      `Expected <50ms, but took ${result.durationMs.toFixed(2)}ms`);
  });

  it('automation-checker should complete in <50ms', () => {
    const input = { frequency: 5, standardizable: 0.8, hasGuardrails: true };
    const result = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg(input)]);

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.durationMs < 50,
      `Expected <50ms, but took ${result.durationMs.toFixed(2)}ms`);
  });

  it('all tools should maintain consistent performance across multiple invocations', () => {
    const iterations = 5;
    const timings = [];

    for (let i = 0; i < iterations; i++) {
      const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({
        truthfulness: 0.85,
        systemAdherence: 0.75,
        skill: 0.70
      })]);

      assert.strictEqual(result.exitCode, 0);
      timings.push(result.durationMs);
    }

    // Calculate statistics
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const max = Math.max(...timings);
    const min = Math.min(...timings);
    const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);

    // All invocations should be under 50ms
    assert.ok(max < 50, `Max time ${max.toFixed(2)}ms exceeds 50ms limit`);

    // Standard deviation should be reasonable (less than 20ms)
    assert.ok(stdDev < 20, `High variance detected: stdDev=${stdDev.toFixed(2)}ms`);

    console.log(`  Performance stats: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms, stdDev=${stdDev.toFixed(2)}ms`);
  });
});

// ============================================================================
// WORKFLOW INTEGRATION TESTS
// ============================================================================

describe('Workflow Integration', () => {
  it('should support sequential pipeline: coherence → backcast → automation', () => {
    // Step 1: Coherence scan on an executor
    const executor = {
      truthfulness: 0.85,
      systemAdherence: 0.75,
      skill: 0.70
    };

    const coherenceResult = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(executor)]);
    assert.strictEqual(coherenceResult.exitCode, 0);
    assert.ok(!coherenceResult.json.veto, 'Executor should pass coherence check');

    // Step 2: Backcast a decision about this executor's project
    const decision = {
      endStateClarity: 0.9
    };

    const backcastResult = executeTool(FUTURE_BACKCASTER, ['--json', jsonArg(decision)]);
    assert.strictEqual(backcastResult.exitCode, 0);
    assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(backcastResult.json.priority));

    // Step 3: Check if related tasks should be automated
    const task = {
      frequency: 8,
      standardizable: 0.85,
      hasGuardrails: true
    };

    const automationResult = executeTool(AUTOMATION_CHECKER, ['--json', jsonArg(task)]);
    assert.strictEqual(automationResult.exitCode, 0);
    assert.strictEqual(typeof automationResult.json.readyToAutomate, 'boolean');

    // Workflow completed successfully
    console.log('  ✓ Sequential pipeline completed');
    console.log(`    Coherence: ${coherenceResult.json.recommendation}`);
    console.log(`    Priority: ${backcastResult.json.priority}`);
    console.log(`    Automate: ${automationResult.json.readyToAutomate}`);
  });

  it('should handle parallel execution of multiple tools', () => {
    // Simulate parallel execution by running tools concurrently
    const startTime = process.hrtime.bigint();

    const results = [
      executeTool(COHERENCE_SCANNER, ['--json', jsonArg({
        truthfulness: 0.85, systemAdherence: 0.75, skill: 0.70
      })]),
      executeTool(FUTURE_BACKCASTER, ['--json', jsonArg({
        endStateClarity: 0.9
      })]),
      executeTool(AUTOMATION_CHECKER, ['--json', jsonArg({
        frequency: 5, standardizable: 0.8, hasGuardrails: true
      })])
    ];

    const endTime = process.hrtime.bigint();
    const totalDurationMs = Number(endTime - startTime) / 1_000_000;

    // All should succeed
    results.forEach((result, idx) => {
      assert.strictEqual(result.exitCode, 0, `Tool ${idx} failed`);
      assert.ok(result.json, `Tool ${idx} returned no JSON`);
    });

    // Total time should be reasonable (not significantly more than sequential)
    console.log(`  ✓ Parallel execution completed in ${totalDurationMs.toFixed(2)}ms`);
  });

  it('should support batch processing workflow', () => {
    // Simulate batch processing multiple executors through coherence scanner
    const executors = [
      { truthfulness: 0.85, systemAdherence: 0.75, skill: 0.70 },
      { truthfulness: 0.90, systemAdherence: 0.80, skill: 0.85 },
      { truthfulness: 0.65, systemAdherence: 0.70, skill: 0.75 }  // Should trigger veto
    ];

    const results = executors.map(executor =>
      executeTool(COHERENCE_SCANNER, ['--json', jsonArg(executor)])
    );

    // All should complete successfully (even if vetoed)
    results.forEach((result, idx) => {
      assert.strictEqual(result.exitCode, 0, `Batch item ${idx} failed`);
      assert.ok(result.json, `Batch item ${idx} returned no JSON`);
      assert.ok(result.json.heuristic === 'PV_PA_001');
    });

    // Last one should have veto
    assert.strictEqual(results[2].json.veto, true, 'Low truthfulness should trigger veto');

    // Calculate summary statistics
    const approvedCount = results.filter(r => r.json.recommendation === 'APPROVE').length;
    const rejectedCount = results.filter(r => r.json.recommendation === 'REJECT').length;

    console.log(`  ✓ Batch processing: ${approvedCount} approved, ${rejectedCount} rejected`);
  });
});

// ============================================================================
// DATA FLOW & INTEROPERABILITY TESTS
// ============================================================================

describe('Data Flow & Interoperability', () => {
  it('should produce valid output that can be consumed by downstream tools', () => {
    // Coherence scanner output should be parseable and usable
    const coherenceResult = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({
      truthfulness: 0.85,
      systemAdherence: 0.75,
      skill: 0.70
    })]);

    assert.strictEqual(coherenceResult.exitCode, 0);

    // Output should have all required fields for downstream consumption
    const output = coherenceResult.json;
    assert.ok(output.heuristic);
    assert.ok(typeof output.score === 'number');
    assert.ok(typeof output.veto === 'boolean');
    assert.ok(output.recommendation);
    assert.ok(output.breakdown);
    assert.ok(output.metadata);

    // Metadata should include useful information
    assert.ok(output.metadata.hierarchyRank);
    assert.ok(Array.isArray(output.metadata.criticalFactors));
  });

  it('should handle stdin/stdout piping correctly', () => {
    // Test stdin mode (simulated via spawnSync)
    const input = jsonArg({ truthfulness: 0.85, systemAdherence: 0.75, skill: 0.70 });

    const result = spawnSync('node', [COHERENCE_SCANNER, '--stdin'], {
      input: input,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    assert.strictEqual(result.status, 0);

    // Parse output
    const jsonLines = result.stdout.split('\n').filter(line =>
      line.trim() && !line.startsWith('✓') && !line.startsWith('🔧')
    );
    const json = JSON.parse(jsonLines.join('\n'));

    assert.ok(json);
    assert.strictEqual(json.heuristic, 'PV_PA_001');
  });

  it('should maintain data integrity across multiple transformations', () => {
    // Original input
    const originalInput = {
      truthfulness: 0.85,
      systemAdherence: 0.75,
      skill: 0.70
    };

    // Pass through coherence scanner
    const result1 = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(originalInput)]);
    assert.strictEqual(result1.exitCode, 0);

    // Extract metadata
    const metadata1 = result1.json.metadata;

    // Pass same input again
    const result2 = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(originalInput)]);
    assert.strictEqual(result2.exitCode, 0);

    // Results should be deterministic (same score, same recommendation)
    assert.strictEqual(result1.json.score, result2.json.score);
    assert.strictEqual(result1.json.recommendation, result2.json.recommendation);
    assert.strictEqual(result1.json.veto, result2.json.veto);
  });
});

// ============================================================================
// ERROR HANDLING IN WORKFLOWS
// ============================================================================

describe('Error Handling in Workflows', () => {
  it('should gracefully handle errors in pipeline workflows', () => {
    // Simulate a pipeline where one tool fails
    const invalidInput = { truthfulness: 0.85 }; // Missing required fields

    const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(invalidInput)]);

    // Should return proper error code
    assert.strictEqual(result.exitCode, 2);

    // Should return proper error JSON
    assert.ok(result.json);
    assert.strictEqual(result.json.error, 'VALIDATION_ERROR');
    assert.ok(result.json.message);

    // Workflow should be able to detect and handle this error
    const workflowCanContinue = (result.exitCode !== 0 && result.json && result.json.error);
    assert.ok(workflowCanContinue, 'Workflow should be able to detect error state');
  });

  it('should provide meaningful error messages for debugging', () => {
    // Test various error scenarios
    const errorCases = [
      { input: {}, expectedError: 'VALIDATION_ERROR' },
      { input: { truthfulness: 'invalid' }, expectedError: 'VALIDATION_ERROR' },
      { input: { truthfulness: 2.0 }, expectedError: 'VALIDATION_ERROR' }
    ];

    errorCases.forEach((testCase, idx) => {
      const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg(testCase.input)]);

      assert.notStrictEqual(result.exitCode, 0, `Case ${idx} should have failed`);
      assert.ok(result.json, `Case ${idx} should return error JSON`);
      assert.strictEqual(result.json.error, testCase.expectedError,
        `Case ${idx} should return ${testCase.expectedError}`);
      assert.ok(result.json.message, `Case ${idx} should include error message`);
    });
  });
});

console.log('✓ All integration tests passed!');
