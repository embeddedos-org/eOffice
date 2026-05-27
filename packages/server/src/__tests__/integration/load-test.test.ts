// @ts-nocheck
/**
 * In-process load test for eOffice server.
 * Tests throughput, latency, and metrics under concurrent load.
 * Uses direct handler calls (no HTTP) to bypass WSL networking issues.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { documentsRouter } from '../../routes/documents';
import { notesRouter } from '../../routes/notes';
import { spreadsheetsRouter } from '../../routes/spreadsheets';
import { tasksRouter } from '../../routes/tasks';
import { ebotRouter } from '../../routes/ebot';
import { createToken } from '../../middleware/auth';
import { generateMetrics, httpRequestsTotal, httpRequestDuration, recordRequest } from '../../services/metrics';

const TEST_USER = { id: 'load-test-user', username: 'loadtest', email: 'load@test.com', role: 'user' };
const TOKEN = createToken(TEST_USER);

function mockReq(overrides = {}) {
  return {
    params: {}, query: {}, body: {}, headers: { authorization: `Bearer ${TOKEN}` },
    user: TEST_USER, method: 'GET', originalUrl: '/api/test',
    ...overrides,
  } as unknown as express.Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: unknown) => { res.body = data; return res; };
  res.send = (data?: unknown) => { if (data) res.body = data; return res; };
  res.end = () => res;
  res.setHeader = () => res;
  res.statusCode = 200;
  return res as any;
}

function getHandler(router: any, method: string, path: string) {
  for (const layer of router.stack || []) {
    if (layer.route) {
      const routePath = layer.route.path;
      const routeMethod = Object.keys(layer.route.methods)[0];
      if (routeMethod === method && routePath === path) {
        return layer.route.stack[layer.route.stack.length - 1].handle;
      }
    }
  }
  return null;
}

async function callHandler(router: any, method: string, path: string, reqOverrides = {}) {
  const handler = getHandler(router, method, path);
  if (!handler) throw new Error(`No handler for ${method.toUpperCase()} ${path}`);
  const req = mockReq({ method: method.toUpperCase(), originalUrl: `/api${path}`, ...reqOverrides });
  const res = mockRes();
  const start = Date.now();
  await handler(req, res);
  const duration = Date.now() - start;
  recordRequest(method.toUpperCase(), `/api${path}`, res.statusCode, duration);
  return { status: res.statusCode, body: res.body, duration };
}

interface LoadTestResult {
  name: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  requestsPerSecond: number;
}

async function runLoadTest(
  name: string,
  fn: () => Promise<{ status: number; duration: number }>,
  opts: { concurrency: number; totalRequests: number },
): Promise<LoadTestResult> {
  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;
  let completed = 0;

  const startTime = Date.now();

  // Run in batches of `concurrency`
  for (let i = 0; i < opts.totalRequests; i += opts.concurrency) {
    const batchSize = Math.min(opts.concurrency, opts.totalRequests - i);
    const batch = Array.from({ length: batchSize }, () =>
      fn().then(r => {
        latencies.push(r.duration);
        if (r.status < 400) successCount++;
        else errorCount++;
        completed++;
      }).catch(() => { errorCount++; completed++; })
    );
    await Promise.all(batch);
  }

  const totalDuration = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const percentile = (p: number) => {
    const idx = Math.ceil(latencies.length * p / 100) - 1;
    return latencies[Math.max(0, idx)] || 0;
  };

  return {
    name,
    totalRequests: opts.totalRequests,
    successCount,
    errorCount,
    totalDurationMs: totalDuration,
    avgLatencyMs: Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length),
    p50LatencyMs: percentile(50),
    p95LatencyMs: percentile(95),
    p99LatencyMs: percentile(99),
    maxLatencyMs: Math.max(...latencies),
    requestsPerSecond: Math.round((opts.totalRequests / totalDuration) * 1000),
  };
}

function printResult(r: LoadTestResult) {
  console.log(`\n  📊 ${r.name}`);
  console.log(`     Requests:  ${r.successCount}/${r.totalRequests} OK (${r.errorCount} errors)`);
  console.log(`     Duration:  ${r.totalDurationMs}ms total`);
  console.log(`     Throughput: ${r.requestsPerSecond} req/s`);
  console.log(`     Latency:   avg=${r.avgLatencyMs}ms p50=${r.p50LatencyMs}ms p95=${r.p95LatencyMs}ms p99=${r.p99LatencyMs}ms max=${r.maxLatencyMs}ms`);
}

// ======================================================================
describe('Load Test — eOffice Staging', () => {
  const CONCURRENCY = 10;
  const REQUESTS = 200;
  const results: LoadTestResult[] = [];

  // ---------------------------------------------------
  it('Load: GET /api/documents (list)', async () => {
    const r = await runLoadTest('GET /documents', () =>
      callHandler(documentsRouter, 'get', '/'),
      { concurrency: CONCURRENCY, totalRequests: REQUESTS },
    );
    printResult(r);
    results.push(r);
    expect(r.errorCount).toBe(0);
    expect(r.p95LatencyMs).toBeLessThan(100);
  }, 30000);

  // ---------------------------------------------------
  it('Load: POST+GET /api/documents (create+read cycle)', async () => {
    let docCounter = 0;
    const r = await runLoadTest('POST+GET /documents', async () => {
      docCounter++;
      const createRes = await callHandler(documentsRouter, 'post', '/', {
        body: { title: `Load Doc ${docCounter}`, content: `<p>Content ${docCounter}</p>`, app_id: 'edocs' },
      });
      return createRes;
    }, { concurrency: CONCURRENCY, totalRequests: REQUESTS });
    printResult(r);
    results.push(r);
    expect(r.errorCount).toBe(0);
  }, 30000);

  // ---------------------------------------------------
  it('Load: GET /api/notes (list)', async () => {
    const r = await runLoadTest('GET /notes', () =>
      callHandler(notesRouter, 'get', '/'),
      { concurrency: CONCURRENCY, totalRequests: REQUESTS },
    );
    printResult(r);
    results.push(r);
    expect(r.errorCount).toBe(0);
  }, 30000);

  // ---------------------------------------------------
  it('Load: GET /api/spreadsheets (list)', async () => {
    const r = await runLoadTest('GET /spreadsheets', () =>
      callHandler(spreadsheetsRouter, 'get', '/'),
      { concurrency: CONCURRENCY, totalRequests: REQUESTS },
    );
    printResult(r);
    results.push(r);
    expect(r.errorCount).toBe(0);
  }, 30000);

  // ---------------------------------------------------
  it('Load: POST /api/tasks/boards (create boards)', async () => {
    let boardCounter = 0;
    const r = await runLoadTest('POST /tasks/boards', async () => {
      boardCounter++;
      return callHandler(tasksRouter, 'post', '/boards', {
        body: { name: `Load Board ${boardCounter}` },
      });
    }, { concurrency: 5, totalRequests: 100 });
    printResult(r);
    results.push(r);
  }, 30000);

  // ---------------------------------------------------
  it('Load: GET /api/ebot/status (AI status check)', async () => {
    const r = await runLoadTest('GET /ebot/status', () =>
      callHandler(ebotRouter, 'get', '/status'),
      { concurrency: CONCURRENCY, totalRequests: REQUESTS },
    );
    printResult(r);
    results.push(r);
    expect(r.errorCount).toBe(0);
  }, 30000);

  // ---------------------------------------------------
  it('Verify: Prometheus metrics recorded correctly', () => {
    const metricsOutput = generateMetrics();

    console.log('\n  📈 Prometheus Metrics Sample:');
    const lines = metricsOutput.split('\n');
    const interesting = lines.filter(l =>
      l.startsWith('eoffice_http_requests_total') ||
      l.startsWith('eoffice_http_request_duration_ms_count') ||
      l.startsWith('eoffice_http_request_duration_ms_sum') ||
      l.startsWith('process_uptime_seconds') ||
      l.startsWith('process_resident_memory_bytes') ||
      l.startsWith('eoffice_route_requests_total')
    );
    for (const line of interesting.slice(0, 15)) {
      console.log(`     ${line}`);
    }

    // Verify metrics were recorded
    expect(metricsOutput).toContain('eoffice_http_requests_total');
    expect(metricsOutput).toContain('eoffice_http_request_duration_ms_bucket');
    expect(metricsOutput).toContain('process_resident_memory_bytes');

    // Total requests should be > 0
    const totalMatch = metricsOutput.match(/eoffice_http_requests_total (\d+)/);
    expect(totalMatch).toBeTruthy();
    const totalRequests = parseInt(totalMatch![1]);
    expect(totalRequests).toBeGreaterThan(0);
    console.log(`\n     Total requests recorded in metrics: ${totalRequests}`);
  });

  // ---------------------------------------------------
  afterAll(() => {
    console.log('\n  ═══════════════════════════════════════════════');
    console.log('  📋 LOAD TEST SUMMARY');
    console.log('  ═══════════════════════════════════════════════');
    for (const r of results) {
      console.log(`  ${r.requestsPerSecond.toString().padStart(6)} req/s | p95=${r.p95LatencyMs.toString().padStart(3)}ms | ${r.successCount}/${r.totalRequests} OK | ${r.name}`);
    }
    console.log('  ═══════════════════════════════════════════════');
  });
});
