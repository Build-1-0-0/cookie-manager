// src/components/ScanForm.jsx
export default function ScanForm({ url, setUrl, onScan, isLoading }) {
  return (
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
        onClick={onScan}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:bg-blue-300"
        disabled={isLoading}
      >
        {isLoading ? 'Scanning...' : 'Scan Cookies'}
      </button>
    </div>
  );
}
