const { spawnSync } = require('child_process');

console.log('🔍 Running ESLint...');
const eslint = spawnSync('eslint', ['.', '--fix'], {
  stdio: 'inherit',
  shell: true
});
if (eslint.status === 0) {
  console.log('✓ ESLint passed\n');
}

// Note: TypeScript type checking here only validates extension code (src/*).
// Webview code (src/webview/**/*) is excluded from main tsconfig.json and
// is type-checked separately by Vite during the build:webview step.
console.log('🔍 Running TypeScript type check...');
const typecheck = spawnSync('npx', ['tsc', '--noEmit'], {
  stdio: 'inherit'
});

if (eslint.status !== 0 || typecheck.status !== 0) {
  process.exit(1);
} else {
  console.log('\n✓ All checks passed!');
}
