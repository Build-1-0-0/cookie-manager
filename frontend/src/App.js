// frontend/src/App.js
import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [url, setUrl] = useState('');
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    try {
      const response = await fetch('https://your-worker.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, cookies: [] }) // Trigger audit
      });
      const data = await response.json();
      if (response.ok) {
        setAuditData(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch audit data');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Chart data for visualization
  const chartData = auditData?.cookies
    ? {
        labels: auditData.cookies.map(cookie => cookie.name),
        datasets: [
          {
            label: 'Deprecated Cookies',
            data: auditData.cookies.map(cookie => (cookie.deprecated ? 1 : 0)),
            backgroundColor: 'rgba(255, 99, 132, 0.5)'
          }
        ]
      }
    : null;

  return (
    <div className="App">
      <h1>Cookie Manager Dashboard</h1>
      <div>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter URL to audit (e.g., https://example.com)"
        />
        <button onClick={handleScan}>Scan Cookies</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {auditData && (
        <div>
          <h2>Audit Results for {auditData.url}</h2>
          <pre>{JSON.stringify(auditData.cookies, null, 2)}</pre>
          {chartData && (
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: { title: { display: true, text: 'Cookie Audit Summary' } }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
