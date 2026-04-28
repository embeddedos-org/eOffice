/**
 * Lightweight Prometheus-compatible metrics collector.
 * No external dependencies — generates text/plain exposition format.
 */

interface HistogramBucket {
  le: number;
  count: number;
}

class Counter {
  private value = 0;
  constructor(public readonly name: string, public readonly help: string, public readonly labels: Record<string, string> = {}) {}
  inc(n = 1) { this.value += n; }
  get() { return this.value; }
}

class Gauge {
  private value = 0;
  constructor(public readonly name: string, public readonly help: string) {}
  set(n: number) { this.value = n; }
  inc(n = 1) { this.value += n; }
  dec(n = 1) { this.value -= n; }
  get() { return this.value; }
}

class Histogram {
  private sum = 0;
  private count = 0;
  private buckets: HistogramBucket[];

  constructor(
    public readonly name: string,
    public readonly help: string,
    bucketBounds: number[] = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  ) {
    this.buckets = bucketBounds.map(le => ({ le, count: 0 }));
  }

  observe(value: number) {
    this.sum += value;
    this.count++;
    for (const bucket of this.buckets) {
      if (value <= bucket.le) bucket.count++;
    }
  }

  getCount() { return this.count; }
  getSum() { return this.sum; }
  getBuckets() { return this.buckets; }
}

// --- Metric instances ---
export const httpRequestsTotal = new Counter('eoffice_http_requests_total', 'Total HTTP requests');
export const httpRequestDuration = new Histogram('eoffice_http_request_duration_ms', 'HTTP request duration in milliseconds');
export const httpRequestErrors = new Counter('eoffice_http_request_errors_total', 'Total HTTP 5xx errors');
export const httpRequest4xx = new Counter('eoffice_http_request_4xx_total', 'Total HTTP 4xx errors');
export const activeConnections = new Gauge('eoffice_active_connections', 'Active HTTP connections');
export const wsConnections = new Gauge('eoffice_ws_connections', 'Active WebSocket connections');
export const aiRequestsTotal = new Counter('eoffice_ai_requests_total', 'Total AI provider requests');
export const aiRequestErrors = new Counter('eoffice_ai_request_errors_total', 'Total AI provider errors');
export const documentsTotal = new Gauge('eoffice_documents_total', 'Total documents stored');
export const dbSizeBytes = new Gauge('eoffice_db_size_bytes', 'SQLite database size in bytes');

// --- Status counters per route ---
const routeCounters = new Map<string, { total: number; errors: number; duration: number[] }>();

export function recordRequest(method: string, path: string, status: number, duration: number) {
  httpRequestsTotal.inc();
  httpRequestDuration.observe(duration);

  if (status >= 500) httpRequestErrors.inc();
  if (status >= 400 && status < 500) httpRequest4xx.inc();

  // Per-route tracking (aggregate to first path segment)
  const route = `${method} ${path.split('/').slice(0, 4).join('/')}`;
  if (!routeCounters.has(route)) {
    routeCounters.set(route, { total: 0, errors: 0, duration: [] });
  }
  const rc = routeCounters.get(route)!;
  rc.total++;
  if (status >= 500) rc.errors++;
  rc.duration.push(duration);
  if (rc.duration.length > 100) rc.duration.shift(); // Keep last 100
}

// --- Generate Prometheus exposition format ---
export function generateMetrics(): string {
  const lines: string[] = [];

  const addMetric = (name: string, help: string, type: string, value: number, labels = '') => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    lines.push(`${name}${labels} ${value}`);
  };

  // Counters
  addMetric('eoffice_http_requests_total', 'Total HTTP requests', 'counter', httpRequestsTotal.get());
  addMetric('eoffice_http_request_errors_total', 'Total HTTP 5xx errors', 'counter', httpRequestErrors.get());
  addMetric('eoffice_http_request_4xx_total', 'Total HTTP 4xx errors', 'counter', httpRequest4xx.get());
  addMetric('eoffice_ai_requests_total', 'Total AI provider requests', 'counter', aiRequestsTotal.get());
  addMetric('eoffice_ai_request_errors_total', 'Total AI provider errors', 'counter', aiRequestErrors.get());

  // Gauges
  addMetric('eoffice_active_connections', 'Active HTTP connections', 'gauge', activeConnections.get());
  addMetric('eoffice_ws_connections', 'Active WebSocket connections', 'gauge', wsConnections.get());
  addMetric('eoffice_documents_total', 'Total documents stored', 'gauge', documentsTotal.get());
  addMetric('eoffice_db_size_bytes', 'SQLite database size in bytes', 'gauge', dbSizeBytes.get());

  // Process metrics
  const mem = process.memoryUsage();
  addMetric('process_resident_memory_bytes', 'Resident memory size', 'gauge', mem.rss);
  addMetric('process_heap_used_bytes', 'Heap used', 'gauge', mem.heapUsed);
  addMetric('process_heap_total_bytes', 'Heap total', 'gauge', mem.heapTotal);
  addMetric('process_uptime_seconds', 'Process uptime', 'gauge', Math.floor(process.uptime()));

  // Histogram
  lines.push(`# HELP eoffice_http_request_duration_ms HTTP request duration in milliseconds`);
  lines.push(`# TYPE eoffice_http_request_duration_ms histogram`);
  for (const bucket of httpRequestDuration.getBuckets()) {
    lines.push(`eoffice_http_request_duration_ms_bucket{le="${bucket.le}"} ${bucket.count}`);
  }
  lines.push(`eoffice_http_request_duration_ms_bucket{le="+Inf"} ${httpRequestDuration.getCount()}`);
  lines.push(`eoffice_http_request_duration_ms_sum ${httpRequestDuration.getSum()}`);
  lines.push(`eoffice_http_request_duration_ms_count ${httpRequestDuration.getCount()}`);

  // Per-route summary (top 20 by volume)
  const topRoutes = Array.from(routeCounters.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20);

  lines.push(`# HELP eoffice_route_requests_total Requests per route`);
  lines.push(`# TYPE eoffice_route_requests_total counter`);
  for (const [route, data] of topRoutes) {
    const safeRoute = route.replace(/"/g, '\\"');
    lines.push(`eoffice_route_requests_total{route="${safeRoute}"} ${data.total}`);
  }

  lines.push('');
  return lines.join('\n');
}
