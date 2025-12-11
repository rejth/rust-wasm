import React, { useState, useCallback } from 'react';

import { runBenchmark } from '../utils/scalingUtils.js';
import { styles } from '../styles.js';

export function Benchmark({ methods }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');

  const runBenchmarks = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setStatus('Running...');

    await new Promise((r) => setTimeout(r, 50));

    const benchResults = [];
    let baselineTime = 0;

    for (const method of methods) {
      setStatus(`Testing ${method.title}...`);
      await new Promise((r) => setTimeout(r, 10));

      const { totalTime } = runBenchmark(method.fn, 100, 800);
      benchResults.push({ ...method, time: totalTime });

      if (method.id === 'lanczos') {
        baselineTime = totalTime;
      }
    }

    benchResults.sort((a, b) => a.time - b.time);
    setResults({ items: benchResults, baseline: baselineTime });
    setStatus('✅ Complete');
    setRunning(false);
  }, [methods]);

  return (
    <div style={styles.benchmarkCard}>
      <div style={styles.benchmarkHeader}>
        <span style={styles.benchmarkTitle}>📊 Benchmark</span>
        <button
          onClick={runBenchmarks}
          disabled={running}
          style={{
            ...styles.button,
            background: running ? '#555' : '#e67e22',
            color: '#fff',
            opacity: running ? 0.7 : 1,
          }}>
          {running ? 'Running...' : 'Run (100→800px)'}
        </button>
        <span style={{ color: '#888', fontSize: '12px' }}>{status}</span>
      </div>

      {results && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Method</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Time</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Comparison</th>
              <th style={{ ...styles.th, width: '120px' }}>Speed</th>
            </tr>
          </thead>
          <tbody>
            {results.items.map((item) => {
              const ratio = results.baseline / item.time;
              const isSlower = ratio < 1;
              const speedText = isSlower
                ? `${(1 / ratio).toFixed(1)}× slower`
                : `${ratio.toFixed(1)}× faster`;
              const barWidth = Math.min(100, ratio * 50);
              const barColor = isSlower ? '#e74c3c' : '#2ecc71';

              return (
                <tr key={item.id}>
                  <td style={{ ...styles.td, color: item.color }}>{item.title}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{item.time.toFixed(1)} ms</td>
                  <td style={{ ...styles.td, textAlign: 'right', color: barColor }}>
                    {item.id === 'lanczos' ? 'baseline' : speedText}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.speedBar}>
                      <div
                        style={{
                          ...styles.speedFill,
                          width: `${barWidth}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
