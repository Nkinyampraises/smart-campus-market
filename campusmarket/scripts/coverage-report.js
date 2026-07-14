const { mkdirSync, readFileSync, rmSync, writeFileSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const reportRoot = path.join(root, 'coverage');
const minimum = Number(process.env.COVERAGE_MIN || 80);
const services = [
  'api-gateway',
  'auth-service',
  'user-service',
  'listing-service',
  'chat-service',
  'admin-service',
  'ai-service',
  'search-service',
  'notification-service',
];
const metrics = ['statements', 'branches', 'functions', 'lines'];

rmSync(reportRoot, { recursive: true, force: true });
mkdirSync(path.join(reportRoot, 'services'), { recursive: true });

for (const service of services) {
  const cwd = path.join(root, 'backend', 'services', service);
  const output = path.join(reportRoot, 'services', service);
  const result = spawnSync(
    'npm',
    [
      'test',
      '--',
      '--runInBand',
      '--coverage',
      '--coverageReporters=json-summary',
      '--coverageReporters=lcov',
      `--coverageDirectory=${output}`,
    ],
    { cwd, stdio: 'inherit', shell: process.platform === 'win32' },
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const totals = Object.fromEntries(metrics.map((metric) => [metric, { total: 0, covered: 0 }]));
const serviceResults = [];
for (const service of services) {
  const summaryPath = path.join(reportRoot, 'services', service, 'coverage-summary.json');
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8')).total;
  const result = { service };
  for (const metric of metrics) {
    totals[metric].total += summary[metric].total;
    totals[metric].covered += summary[metric].covered;
    result[metric] = summary[metric].pct;
  }
  serviceResults.push(result);
}

const aggregate = {};
for (const metric of metrics) {
  const { total, covered } = totals[metric];
  aggregate[metric] = total === 0 ? 100 : Number(((covered / total) * 100).toFixed(2));
}

const result = {
  generatedAt: new Date().toISOString(),
  minimum,
  aggregate,
  services: serviceResults,
};
writeFileSync(path.join(reportRoot, 'summary.json'), `${JSON.stringify(result, null, 2)}\n`);

// Jest writes each report relative to its service working directory. Rewrite
// those source paths before merging so SonarQube can map coverage back to the
// repository files mounted in the scanner container.
const combinedLcov = services.map((service) => {
  const lcovPath = path.join(reportRoot, 'services', service, 'lcov.info');
  return readFileSync(lcovPath, 'utf8').replace(
    /^SF:(.+)$/gm,
    (_, source) => `SF:${path.posix.join('backend', 'services', service, source.replace(/\\/g, '/'))}`,
  );
}).join('\n');
writeFileSync(path.join(reportRoot, 'lcov.info'), combinedLcov);

const rows = serviceResults.map((service) => `<tr><td>${service.service}</td>${metrics.map((metric) => `<td>${service[metric]}%</td>`).join('')}</tr>`).join('\n');
const cards = metrics.map((metric) => `<div class="card"><span>${metric}</span><strong>${aggregate[metric]}%</strong></div>`).join('');
writeFileSync(path.join(reportRoot, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CampusTrade coverage</title>
<style>body{margin:0;background:#0b1220;color:#eef4ff;font:15px/1.5 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:48px 24px}h1{font-size:40px;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card,table{background:#121e31;border:1px solid #283a59;border-radius:14px}.card{padding:18px}.card span{display:block;color:#9eb0ca;text-transform:capitalize}.card strong{font-size:28px;color:#65df98}table{width:100%;margin-top:24px;border-collapse:collapse;overflow:hidden}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid #283a59}th{color:#9eb0ca}@media(max-width:650px){.grid{grid-template-columns:repeat(2,1fr)}}</style></head>
<body><main><h1>CampusTrade test coverage</h1><p>Required minimum: ${minimum}% · generated ${result.generatedAt}</p><div class="grid">${cards}</div><table><thead><tr><th>Service</th>${metrics.map((metric) => `<th>${metric}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></main></body></html>\n`);

console.log(`Aggregate coverage: ${metrics.map((metric) => `${metric}=${aggregate[metric]}%`).join(' ')}`);
const failures = metrics.filter((metric) => aggregate[metric] < minimum);
if (failures.length > 0) {
  console.error(`Coverage gate failed (${minimum}%): ${failures.join(', ')}`);
  process.exit(1);
}
