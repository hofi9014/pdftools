// Reports the last 30 days of Vercel usage against the Hobby plan's included amounts and exits
// with code 2 when any of them reaches the warning threshold (80% by default). On Hobby there is
// no paid overage: a limit that is passed pauses that part of the service for 30 days.
//
//   node scripts/vercel-usage-check.mjs            # human-readable report
//   node scripts/vercel-usage-check.mjs --json     # one JSON object
//   USAGE_WARN_PERCENT=50 node scripts/vercel-usage-check.mjs
//
// Needs the Vercel CLI signed in and this folder linked to the project (`vercel link`). Reads only.
// The data comes from /v2/usage, the endpoint the dashboard's Usage tab uses; Hobby teams cannot
// call /v1/usage or `vercel usage` (both answer that they are Pro/Enterprise only).
import { execFileSync } from 'node:child_process';

// Included amounts per 30 days (https://vercel.com/docs/plans/hobby). Only what /v2/usage reports.
const LIMITS = [
  { key: 'transfer', label: 'Fast Data Transfer', limit: 100e9, unit: 'GB', scale: 1e9 },
  { key: 'requests', label: 'CDN Requests', limit: 1_000_000, unit: '', scale: 1 },
  { key: 'functions', label: 'Function Invocations', limit: 1_000_000, unit: '', scale: 1 },
  { key: 'memory', label: 'Provisioned Memory', limit: 360, unit: 'GB-h', scale: 1 },
];
const warnAt = Number(process.env.USAGE_WARN_PERCENT ?? 80);

const to = new Date();
const from = new Date(to.getTime() - 30 * 86_400_000);
const path = `/v2/usage?type=requests&from=${from.toISOString()}&to=${to.toISOString()}`;
let raw;
try {
  // Quoted: the shell would otherwise split the address at "&".
  raw = execFileSync('npx', ['vercel', 'api', `"${path}"`], {
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Git Bash on Windows would rewrite the leading "/v2/..." into a disk path.
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
} catch (e) {
  console.error(`Could not read usage from Vercel: ${String(e.stderr || e.message).trim().split('\n').pop()}`);
  process.exit(1);
}
const days = JSON.parse(raw.slice(raw.indexOf('{'))).data ?? [];
const sum = (f) => days.reduce((a, d) => a + (f(d) || 0), 0);
const used = {
  transfer: sum((d) => d.bandwidth_outgoing_bytes),
  requests: sum((d) => d.request_hit_count + d.request_miss_count),
  functions: sum((d) => d.function_invocation_successful_count + d.function_invocation_error_count
    + d.function_invocation_throttle_count + d.function_invocation_timeout_count),
  memory: sum((d) => d.function_execution_successful_gb_hours + d.function_execution_error_gb_hours
    + d.function_execution_timeout_gb_hours),
};

const rows = LIMITS.map((l) => ({ ...l, used: used[l.key], percent: (used[l.key] / l.limit) * 100 }));
const over = rows.filter((r) => r.percent >= warnAt);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    from: from.toISOString(), to: to.toISOString(), warnAt,
    usage: Object.fromEntries(rows.map((r) => [r.key, { used: r.used, limit: r.limit, percent: Number(r.percent.toFixed(1)) }])),
    warnings: over.map((r) => r.key),
  }));
} else {
  console.log(`Vercel usage, last 30 days (${days.length} days of data), warning at ${warnAt}%:`);
  for (const r of rows) {
    const fmt = (v) => (v / r.scale).toLocaleString('en-US', { maximumFractionDigits: r.scale === 1 && !r.unit ? 0 : 2 });
    console.log(`  ${r.percent >= warnAt ? '!!' : '  '} ${r.label.padEnd(22)} ${fmt(r.used)} / ${fmt(r.limit)} ${r.unit}  (${r.percent.toFixed(1)}%)`);
  }
}
process.exit(over.length ? 2 : 0);
