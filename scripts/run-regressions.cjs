// Uses the installed TypeScript compiler; no npx downloads, no portfolio writes.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
if (process.argv[2] === '--child') {
  const ts = require('typescript');
  require.extensions['.css'] = () => {}; // Styles are verified by production/browser checks.
  for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.React, esModuleInterop: true }
    });
    module._compile(output.outputText, filename);
  };
  require(path.resolve(process.argv[3]));
} else {
  const files = fs.readdirSync('scripts').filter(f => /^inspect-.*\.ts$/.test(f)).sort();
  const results = [];
  for (const file of files) {
    const run = spawnSync(process.execPath, [__filename, '--child', `scripts/${file}`], {
      encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024,
      env: {...process.env, TZ: 'UTC'}
    });
    const passed = run.status === 0;
    results.push({file, passed, status: run.status, error: run.error?.message,
      stdout: run.stdout, stderr: run.stderr});
    console.log(`${passed ? 'PASS' : 'FAIL'} ${file}`);
  }
  fs.mkdirSync('delivery-audit', {recursive:true});
  fs.writeFileSync('delivery-audit/regressions.json', JSON.stringify({
    timestamp: new Date().toISOString(), passed: results.filter(r=>r.passed).length,
    total: results.length, results
  }, null, 2));
  console.log(`${results.filter(r=>r.passed).length}/${results.length} passed`);
  process.exitCode = results.every(r=>r.passed) ? 0 : 1;
}
