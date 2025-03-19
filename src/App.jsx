import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie, Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

function App() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [newColumn, setNewColumn] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [chartType, setChartType] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [eventSource, setEventSource] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchData();
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/data/');
      setData(res.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post('http://localhost:8000/api/upload/', formData);
      fetchData();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Handle edit
  const startEditing = (row) => setEditingRow(row.id);
  const handleEdit = async (id, updatedData) => {
    try {
      await axios.put(`http://localhost:8000/api/data/${id}/`, updatedData);
      setEditingRow(null);
      fetchData();
    } catch (error) {
      console.error('Error editing data:', error);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/data/${id}/`);
      fetchData();
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  // Add new column
  const addNewColumn = () => {
    if (newColumn) {
      setData(data.map(item => ({ ...item, [newColumn]: '' })));
      setNewColumn('');
    }
  };

  // Continuous random data generation
  const startGenerating = () => {
    if (!generating) {
      setGenerating(true);
      const source = new EventSource('http://localhost:8000/api/generate/start/');
      setEventSource(source);
      source.onopen = () => {
        console.log('SSE connection opened');
      };
      source.onmessage = (event) => {
        console.log('Raw SSE data:', event.data); // Debug raw data
        const newData = JSON.parse(event.data);
        console.log('Parsed new data:', newData);
        setData(prev => [...prev, { ...newData, id: Date.now() }]); // Temporary ID
      };
      source.onerror = (err) => {
        console.error('EventSource error:', err);
        source.close();
        setGenerating(false);
        setEventSource(null);
      };
    }
  };

  const stopGenerating = async () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    try {
      await axios.post('http://localhost:8000/api/generate/stop/');
      setGenerating(false);
      fetchData(); // Refresh with actual DB data
    } catch (error) {
      console.error('Error stopping generation:', error);
      setGenerating(false);
    }
  };

  // Chart data fetching
  const fetchBarChartData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/charts/revenue/');
      setChartType('bar');
      setChartData({
        labels: res.data.map(item => item.name),
        datasets: [{
          label: 'Revenue > 10k',
          data: res.data.map(item => item.revenue),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        }]
      });
    } catch (error) {
      console.error('Error fetching bar chart data:', error);
    }
  };

  const fetchPieChartData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/charts/country/');
      setChartType('pie');
      setChartData({
        labels: res.data.map(item => item.country),
        datasets: [{
          label: 'Companies by Country',
          data: res.data.map(item => item.count),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        }]
      });
    } catch (error) {
      console.error('Error fetching pie chart data:', error);
    }
  };

  const fetchDynamicChartData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/charts/dynamic/');
      setChartType('scatter');
      setChartData({
        datasets: [{
          label: 'Profit vs Employees',
          data: res.data.map(item => ({ x: item.employees, y: item.profit })),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
        }]
      });
    } catch (error) {
      console.error('Error fetching dynamic chart data:', error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left Section: Table and Controls */}
      <div style={{ width: '50%', padding: '20px', overflowY: 'auto' }}>
        <h1>ETL Project</h1>

        {/* File Upload */}
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleFileUpload}>Upload Excel</button>

        {/* Scrollable Table */}
        <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '20px' }}>
          {data.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    key !== 'id' && <th key={key} style={{ border: '1px solid #ddd' }}>{key}</th>
                  ))}
                  <th style={{ border: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    {Object.keys(row).map((key) => (
                      key !== 'id' && (
                        <td key={key} style={{ border: '1px solid #ddd' }}>
                          {editingRow === row.id ? (
                            <input
                              value={row[key]}
                              onChange={(e) => setData(data.map(r => r.id === row.id ? { ...r, [key]: e.target.value } : r))}
                            />
                          ) : (
                            row[key]
                          )}
                        </td>
                      )
                    ))}
                    <td style={{ border: '1px solid #ddd' }}>
                      {editingRow === row.id ? (
                        <button onClick={() => handleEdit(row.id, row)}>Save</button>
                      ) : (
                        <button onClick={() => startEditing(row)}>Edit</button>
                      )}
                      <button onClick={() => handleDelete(row.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No data available</p>
          )}
        </div>

        {/* Add New Column */}
        <input
          value={newColumn}
          onChange={(e) => setNewColumn(e.target.value)}
          placeholder="New column name"
          style={{ marginTop: '20px' }}
        />
        <button onClick={addNewColumn}>Add Column</button>

        {/* Generate Controls */}
        <div style={{ marginTop: '20px' }}>
          {!generating ? (
            <button onClick={startGenerating}>Start Generating</button>
          ) : (
            <button onClick={stopGenerating}>Stop Generating</button>
          )}
        </div>
      </div>

      {/* Right Section: Charts */}
      <div style={{ width: '50%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button onClick={fetchBarChartData}>Bar Chart (Revenue {'>'} 10k)</button>
        <button onClick={fetchPieChartData}>Pie Chart (Companies by Country)</button>
        <button onClick={fetchDynamicChartData}>Dynamic Chart (Profit vs Employees)</button>

        {chartType === 'bar' && chartData && (
          <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        )}
        {chartType === 'pie' && chartData && (
          <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        )}
        {chartType === 'scatter' && chartData && (
          <Scatter data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        )}
      </div>
    </div>
  );
}

export default App;