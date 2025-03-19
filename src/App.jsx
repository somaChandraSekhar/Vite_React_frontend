const BACKEND_URL = 'https://my-django-backend-euetcwafe5bkcrb7.canadaeast-01.azurewebsites.net/'; // Replace with your actual Azure backend URL

const fetchData = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/data/`);
    setData(res.data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

const handleFileUpload = async (e) => {
  e.preventDefault();
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    await axios.post(`${BACKEND_URL}/api/upload/`, formData);
    fetchData();
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

const handleEdit = async (id, updatedData) => {
  try {
    await axios.put(`${BACKEND_URL}/api/data/${id}/`, updatedData);
    setEditingRow(null);
    fetchData();
  } catch (error) {
    console.error('Error editing data:', error);
  }
};

const handleDelete = async (id) => {
  try {
    await axios.delete(`${BACKEND_URL}/api/data/${id}/`);
    fetchData();
  } catch (error) {
    console.error('Error deleting data:', error);
  }
};

const startGenerating = () => {
  if (!generating) {
    setGenerating(true);
    const source = new EventSource(`${BACKEND_URL}/api/generate/start/`);
    setEventSource(source);
    source.onopen = () => {
      console.log('SSE connection opened');
    };
    source.onmessage = (event) => {
      console.log('Raw SSE data:', event.data);
      const newData = JSON.parse(event.data);
      console.log('Parsed new data:', newData);
      setData(prev => [...prev, { ...newData, id: Date.now() }]);
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
    await axios.post(`${BACKEND_URL}/api/generate/stop/`);
    setGenerating(false);
    fetchData();
  } catch (error) {
    console.error('Error stopping generation:', error);
    setGenerating(false);
  }
};

const fetchBarChartData = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/charts/revenue/`);
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
    const res = await axios.get(`${BACKEND_URL}/api/charts/country/`);
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
    const res = await axios.get(`${BACKEND_URL}/api/charts/dynamic/`);
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