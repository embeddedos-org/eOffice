/**
 * Cluster wrapper for eOffice server.
 * Forks worker processes for each CPU core.
 * Usage: node dist/cluster.js (instead of node dist/index.js)
 */
import cluster from 'cluster';
import os from 'os';

const NUM_WORKERS = parseInt(process.env.CLUSTER_WORKERS || '0', 10) || os.cpus().length;

if (cluster.isPrimary) {
  console.log(`[Cluster] Primary ${process.pid} starting ${NUM_WORKERS} workers...`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`[Cluster] Worker ${worker.process.pid} died (code=${code}, signal=${signal}). Restarting...`);
    // Restart dead workers with a small delay to avoid crash loops
    setTimeout(() => cluster.fork(), 1000);
  });

  // Graceful shutdown: send SIGTERM to all workers
  const shutdown = () => {
    console.log('[Cluster] Shutting down all workers...');
    for (const id in cluster.workers) {
      cluster.workers[id]?.process.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 15000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  // Worker: import and start the server
  import('./index');
  console.log(`[Cluster] Worker ${process.pid} started`);
}
