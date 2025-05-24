import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './index.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [url, setUrl] = useState('');
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const response = await fetch('[invalid url, do not cite] {
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
      const response = await fetch('[invalid url, do not cite] {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, cookies: [] })
      });
      const data = await response.json();
      if (response.ok) {
        setError(null);
        fetchAudits();
      } else {
        setError(data.error || 'Failed to scan');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  const latestAudit = audits[0];
  const chartData = latestAudit?.cookies
    ? {
        labels: JSON.parse(latestAudit.cookies).map(cookie => cookie.name),
        datasets: [
          {
            label: 'Deprecated Cookies',
            data: JSON.parse(latestAudit.cookies).map(cookie => (cookie.deprecated ? 1 : 0)),
            backgroundColor: 'rgba(59, 130, 246, 0.5)'
          }
        ]
      }
    : null;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-primary mb-6">Cookie Manager Dashboard</h1>
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter URL (e.g., [invalid url, do not cite])"
          className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={handleScan}
          className="px-4 py-2 bg-accent text-white rounded-md hover:bg-blue-700 transition"
        >
          Scan Cookies
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {audits.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-primary mb-4">Recent Audits</h2>
          <table className="w-full border-collapse mb-6 table-auto">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3 text-left font-semibold">URL</th>
                <th className="p-3 text-left font-semibold">Date</th>
                <th className="p-3 text-left font-semibold">Cookies</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(audit => (
                <tr key={audit.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{audit.url}</td>
                  <td className="p-3">{audit.created_at}</td>
                  <td className="p-3">{JSON.parse(audit.cookies).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {chartData && (
            <div className="bg-white p-4 rounded-md shadow">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  plugins: { title: { display: true, text: 'Latest Audit Summary' } }
                }}
              />
            </div>
          )}
          <button
            onClick={() => {
              const csv = audits.map(a => `${a.url},${a.created_at},${JSON.parse(a.cookies).map(c => c.name).join(';')}`).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'audits.csv';
              a.click();
            }}
            className="mt-4 px-4 py-2 bg-accent text-white rounded-md hover:bg-blue-700 transition"
          >
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
