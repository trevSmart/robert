const { spawnSync } = require('child_process');

console.log('🔍 Running ESLint...');
const eslint = spawnSync('eslint', ['.', '--fix'], {
  stdio: 'inherit',
  shell: true
});
if (eslint.status === 0) {
  console.log('✓ ESLint passed\n');
}

console.log('🔍 Running TypeScript type check...');
const typecheck = spawnSync('npx', ['tsc', '--noEmit'], {
  stdio: 'inherit'
});

if (eslint.status !== 0 || typecheck.status !== 0) {
  process.exit(1);
} else {
  console.log('\n✓ All checks passed!');
}
