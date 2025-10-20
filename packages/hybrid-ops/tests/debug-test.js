const { spawnSync } = require('child_process');
const path = require('path');

const COHERENCE_SCANNER = path.join(__dirname, '..', 'tools', 'coherence-scanner.js');

function jsonArg(obj) {
  return JSON.stringify(obj);
}

function executeTool(toolPath, args) {
  const argsArray = Array.isArray(args) ? args : args.split(' ').filter(a => a);

  console.log('\n=== Executing Tool ===');
  console.log('Tool:', toolPath);
  console.log('Args:', argsArray);

  const result = spawnSync('node', [toolPath, ...argsArray], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log('\n=== Result ===');
  console.log('Exit code:', result.status);
  console.log('Stdout:', JSON.stringify(result.stdout));
  console.log('Stderr:', JSON.stringify(result.stderr));

  let json = null;

  // Try to parse JSON from stdout first (success case)
  if (result.status === 0 && result.stdout) {
    try {
      const jsonLines = result.stdout.split('\n').filter(line =>
        line.trim() && !line.startsWith('✓') && !line.startsWith('🔧')
      );
      json = JSON.parse(jsonLines.join('\n'));
      console.log('Parsed JSON from stdout:', json);
    } catch (e) {
      console.log('Failed to parse stdout:', e.message);
    }
  }

  // Try to parse JSON from stderr (error case)
  if (!json && result.stderr) {
    try {
      // Parse the entire stderr as JSON (error messages are formatted JSON)
      json = JSON.parse(result.stderr.trim());
      console.log('Parsed JSON from stderr:', json);
    } catch (e) {
      console.log('Failed to parse stderr:', e.message);
    }
  }

  console.log('Final json:', json);

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status || 0,
    json
  };
}

// Test case 1: Missing required field
console.log('\n\n========== TEST: Missing required field ==========');
const result = executeTool(COHERENCE_SCANNER, ['--json', jsonArg({ truthfulness: 0.85 })]);
console.log('\nFinal result:', {
  exitCode: result.exitCode,
  hasJson: !!result.json,
  json: result.json
});
