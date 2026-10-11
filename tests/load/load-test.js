#!/usr/bin/env node

/**
 * Load test benchmark script for Mirai MSOT Course Progression Tracker
 * Benchmarks API endpoints under 50, 100, and 200 concurrent connections.
 */

import autocannon from 'autocannon';

const targetUrl = process.env.TARGET_URL || 'http://localhost:5001/api/health';
const concurrencyLevels = [50, 100, 200];
const durationSeconds = 10;

async function runBenchmark(connections) {
  console.log(`\n======================================================`);
  console.log(`Running benchmark: ${connections} concurrent connections for ${durationSeconds}s`);
  console.log(`Target: ${targetUrl}`);
  console.log(`======================================================`);

  return new Promise((resolve, reject) => {
    autocannon(
      {
        url: targetUrl,
        connections,
        duration: durationSeconds,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (err, result) => {
        if (err) return reject(err);

        console.log(`Completed ${connections} connections test:`);
        console.log(`  Requests/sec:   Avg = ${result.requests.average}, Min = ${result.requests.min}, Max = ${result.requests.max}`);
        console.log(`  Latency (ms):   Avg = ${result.latency.average} ms, p97.5 = ${result.latency.p97_5} ms`);
        console.log(`  Throughput:     ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
        console.log(`  Total requests: ${result.requests.total}`);
        console.log(`  Errors:         ${result.errors}`);
        console.log(`  Timeouts:       ${result.timeouts}`);

        resolve({
          connections,
          avgReqPerSec: result.requests.average,
          avgLatencyMs: result.latency.average,
          p97LatencyMs: result.latency.p97_5,
          totalRequests: result.requests.total,
          errors: result.errors,
          timeouts: result.timeouts,
        });
      }
    );
  });
}

async function main() {
  const summary = [];
  for (const conn of concurrencyLevels) {
    try {
      const res = await runBenchmark(conn);
      summary.push(res);
    } catch (e) {
      console.error(`Failed benchmark at ${conn} connections:`, e.message);
    }
  }

  console.log('\n======================================================');
  console.log('LOAD TEST SUMMARY REPORT');
  console.log('======================================================');
  console.table(summary);
}

main();
