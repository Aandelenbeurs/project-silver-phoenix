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
    const skips=(run.stdout??'').split(/\r?\n/).filter(line=>/^SKIP(?:[: ])/.test(line));
    results.push({file, passed, skippedChecks:skips.length, status: run.status, error: run.error?.message,
      stdout: run.stdout, stderr: run.stderr});
    console.log(`${passed ? skips.length ? 'PASS_WITH_SKIPS' : 'PASS' : 'FAIL'} ${file}`);
    for(const line of skips)console.log('  '+line);
    if(file==='inspect-intelligence-storage.ts'){const summary=(run.stdout??'').split(/\r?\n/).find(line=>line.startsWith('STORAGE_RESULT '));if(summary)console.log('  '+summary);}
  }
  fs.mkdirSync('delivery-audit', {recursive:true});
  fs.writeFileSync('delivery-audit/regressions.json', JSON.stringify({
    timestamp: new Date().toISOString(), passed: results.filter(r=>r.passed).length,
    total: results.length, skippedChecks:results.reduce((sum,r)=>sum+r.skippedChecks,0), results
  }, null, 2));
  const skippedChecks=results.reduce((sum,r)=>sum+r.skippedChecks,0);
  const partial=results.filter(r=>r.passed&&r.skippedChecks>0).length;
  if(skippedChecks)console.log(`${results.filter(r=>r.passed&&r.skippedChecks===0).length} scripts volledig geslaagd; ${partial} zonder fouten met SKIP; ${results.filter(r=>!r.passed).length} mislukt; ${skippedChecks} controles overgeslagen.`);
  else console.log(`${results.filter(r=>r.passed).length}/${results.length} passed; 0 skipped checks`);
  process.exitCode = results.every(r=>r.passed) ? 0 : 1;
}
