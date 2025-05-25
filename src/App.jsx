import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './index.css'; // Assuming your Tailwind setup is here

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [url, setUrl] = useState('');
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // New state for loading
  const workerUrl = 'https://cookie-manager.africancontent807.workers.dev';

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${workerUrl}/audits`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setAudits(data);
      } else {
        setError(data.error || 'Failed to fetch audits');
        setAudits([]); // Clear audits on error
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      setAudits([]); // Clear audits on network error
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    if (!url.match(/^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/)) {
        // Slightly improved regex to better match URLs with paths/queries/fragments
      setError('Invalid URL format. Please use a format like https://example.com');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${workerUrl}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, cookies: [] }), // Backend now fetches cookies itself
      });
      const data = await response.json();
      if (response.ok) {
        // Optionally, you could show a success message like data.message
        fetchAudits(); // Refresh the audits list
      } else {
        setError(data.error || 'Failed to complete scan');
      }
    } catch (err) {
      setError('Network error during scan: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const latestAudit = audits[0];
  let parsedCookiesForChart = [];

  if (latestAudit && latestAudit.cookies) {
    try {
      const parsed = JSON.parse(latestAudit.cookies);
      if (Array.isArray(parsed)) {
        parsedCookiesForChart = parsed;
      } else {
        console.error("Parsed cookies for chart is not an array:", parsed);
      }
    } catch (e) {
      console.error("Failed to parse cookies for chart:", e);
      // parsedCookiesForChart remains an empty array
    }
  }

  const chartData = latestAudit && parsedCookiesForChart.length > 0 ? {
    labels: parsedCookiesForChart.map((cookie) => cookie.name || 'Unnamed Cookie'),
    datasets: [
      {
        label: 'Deprecated Cookies',
        data: parsedCookiesForChart.map((cookie) => (cookie.deprecated ? 1 : 0)),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  } : null;

  const handleExportCSV = () => {
    if (audits.length === 0) {
      setError("No audit data to export.");
      return;
    }
    setError(null);

    const csvRows = [
      ['AuditURL', 'AuditCreatedAt', 'CookieName', 'Domain', 'Expires', 'Secure', 'HttpOnly', 'SameSite', 'IsDeprecated']
    ];

    audits.forEach(audit => {
      try {
        const cookies = JSON.parse(audit.cookies); // These are the sanitizedCookies from your backend
        if (Array.isArray(cookies)) {
          if (cookies.length === 0) {
            // Add a row indicating no cookies for this audit if you want
             csvRows.push([
              audit.url,
              new Date(audit.created_at).toISOString(),
              'N/A - No cookies found', '', '', '', '', '', ''
            ]);
          } else {
            cookies.forEach(cookie => {
              csvRows.push([
                audit.url,
                new Date(audit.created_at).toISOString(),
                cookie.name || '',
                cookie.domain || '',
                cookie.expires ? new Date(cookie.expires).toISOString() : 'Session',
                cookie.secure ? 'true' : 'false',
                cookie.httpOnly ? 'true' : 'false',
                cookie.sameSite || 'Not Set',
                cookie.deprecated ? 'true' : 'false'
              ]);
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse cookies for CSV export for audit ID:", audit.id, e);
        // Optionally add a row indicating parse error for this audit's cookies
        csvRows.push([
          audit.url,
          new Date(audit.created_at).toISOString(),
          'Error parsing cookie data', '', '', '', '', '', ''
        ]);
      }
    });

    // CSV content generation with proper quoting
    const csvContent = csvRows.map(row =>
      row.map(cell => {
        const cellString = String(cell === null || cell === undefined ? '' : cell);
        // Escape double quotes by doubling them, and enclose in double quotes if it contains comma, newline or double quote
        if (cellString.includes(',') || cellString.includes('\n') || cellString.includes('"')) {
          return `"${cellString.replace(/"/g, '""')}"`;
        }
        return cellString;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'cookie_audits.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
        setError("CSV download is not supported in your browser.");
    }
  };


  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Cookie Manager Dashboard</h1>
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL (e.g., https://example.com)"
          className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={isLoading}
        />
        <button
          onClick={handleScan}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:bg-blue-300"
          disabled={isLoading}
        >
          {isLoading ? 'Scanning...' : 'Scan Cookies'}
        </button>
      </div>

      {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded-md">{error}</p>}

      {isLoading && audits.length === 0 && <p className="text-blue-500 mb-4">Loading audits...</p>}

      {audits.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Recent Audits</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse mb-6 table-auto">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 text-left font-semibold">URL</th>
                  <th className="p-3 text-left font-semibold">Date</th>
                  <th className="p-3 text-left font-semibold">Cookies Found</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  let cookieCount = 0;
                  try {
                    const parsed = JSON.parse(audit.cookies);
                    if(Array.isArray(parsed)) cookieCount = parsed.length;
                  } catch (e) { /* ignore parse error for count, will be 0 */ }
                  return (
                    <tr key={audit.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 whitespace-nowrap">{audit.url}</td>
                      <td className="p-3 whitespace-nowrap">{new Date(audit.created_at).toLocaleString()}</td>
                      <td className="p-3 text-center">{cookieCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {chartData && (
            <div className="bg-white p-4 rounded-md shadow mb-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                Latest Audit Summary: {latestAudit?.url ? new URL(latestAudit.url).hostname : 'N/A'}
              </h3>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                      display: true,
                      text: `Deprecated Cookies Analysis (Total: ${parsedCookiesForChart.length})`,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                // For this chart, data is 1 for deprecated, 0 for not.
                                // We can provide more context if needed.
                                const cookieIndex = context.dataIndex;
                                const cookie = parsedCookiesForChart[cookieIndex];
                                if(cookie) {
                                    return `${cookie.name}: ${cookie.deprecated ? 'Deprecated' : 'Not Deprecated'}`;
                                }
                                return label;
                            }
                        }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1 // Show integer ticks like 0, 1
                      },
                      title: {
                        display: true,
                        text: 'Count (1 if Deprecated)'
                      }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Cookie Name'
                        }
                    }
                  }
                }}
              />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:bg-green-300"
            disabled={isLoading || audits.length === 0}
          >
            Export All Audits to CSV
          </button>
        </div>
      )}
      {audits.length === 0 && !isLoading && !error && (
         <p className="text-gray-500">No audits found. Try scanning a URL.</p>
      )}
    </div>
  );
}

export default App;
