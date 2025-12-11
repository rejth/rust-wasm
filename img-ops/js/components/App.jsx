import React, { useState, useEffect } from 'react';

import init, { scale_canvas_2x } from '../../pkg/index.js';
import { browserScale2x } from '../utils/scalingUtils.js';

import { ScalingCard } from './ScalingCard.jsx';
import { Benchmark } from './Benchmark.jsx';
import { VisualDemo } from './VisualDemo.jsx';

import { styles } from '../styles.js';

export function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('demo');
  const initialSize = 100;

  const methods = [
    {
      id: 'lanczos',
      title: 'WASM Lanczos-2',
      color: '#e67e22',
      fn: scale_canvas_2x,
    },
    {
      id: 'browser',
      title: 'Browser Native',
      color: '#666',
      fn: browserScale2x,
    },
  ];

  useEffect(() => {
    init().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{ ...styles.app, color: '#888', paddingTop: '100px', textAlign: 'center' }}>
        Loading WASM module...
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span>🦀</span>
        <span>WASM Lanczos Resampling vs Browser Scaling</span>
        <span style={styles.badge}>React + Rust</span>
      </header>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('demo')}
          style={{
            ...styles.tab,
            ...(activeTab === 'demo' ? styles.tabActive : styles.tabInactive),
          }}>
          🖼️ Visual Demo
        </button>
        <button
          onClick={() => setActiveTab('benchmark')}
          style={{
            ...styles.tab,
            ...(activeTab === 'benchmark' ? styles.tabActive : styles.tabInactive),
          }}>
          📊 Benchmark
        </button>
      </div>

      {activeTab === 'demo' && <VisualDemo />}

      {activeTab === 'benchmark' && (
        <>
          <div style={styles.container}>
            {methods.map((method) => (
              <ScalingCard
                key={method.id}
                {...method}
                scaleFn={method.fn}
                initialSize={initialSize}
              />
            ))}
          </div>
          <Benchmark methods={methods} />
        </>
      )}
    </div>
  );
}
