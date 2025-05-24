// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [url, setUrl] = useState('');
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState(null);

  // Fetch past audits on mount
  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const response = await fetch('https://cookie-manager.africancontent807.workers.dev/audits', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (response.ok) {
        setAudits(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch audits');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  const handleScan = async () => {
    if (!url.match(/^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[\/]?.*$/)) {
      setError('Invalid URL');
      return;
    }
    try {
      const response = await fetch('https://your-worker.workers.dev/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, cookies: [] })
      });
      const data = await response.json();
      if (response.ok) {
        setError(null);
        fetchAudits(); // Refresh audit list
      } else {
        setError(data.error || 'Failed to scan');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  // Chart data for latest audit
  const latestAudit = audits[0];
  const chartData = latestAudit?.cookies
    ? {
        labels: JSON.parse(latestAudit.cookies).map(cookie => cookie.name),
        datasets: [
          {
            label: 'Deprecated Cookies',
            data: JSON.parse(latestAudit.cookies).map(cookie => (cookie.deprecated ? 1 : 0)),
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
          placeholder="Enter URL (e.g., https://example.com)"
        />
        <button onClick={handleScan}>Scan Cookies</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {audits.length > 0 && (
        <div>
          <h2>Recent Audits</h2>
          {audits.map(audit => (
            <div key={audit.id}>
              <h3>{audit.url}</h3>
              <pre>{JSON.stringify(JSON.parse(audit.cookies), null, 2)}</pre>
            </div>
          ))}
          {chartData && (
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: { title: { display: true, text: 'Latest Audit Summary' } }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
