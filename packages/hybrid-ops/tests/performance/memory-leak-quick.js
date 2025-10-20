/**
 * Quick Memory Leak Test (100 iterations)
 * Faster version for development/testing
 */

const { MemoryLeakTest } = require('./memory-leak.test.js');

const test = new MemoryLeakTest({
  iterations: 100,       // Reduced from 1000 for faster testing
  gcInterval: 10,        // GC every 10 iterations
  samplingInterval: 10   // Sample every 10 iterations
});

test.run()
  .then(() => {
    console.log('\n✅ Quick memory leak test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Quick memory leak test failed:', error.message);
    process.exit(1);
  });
