import { useState } from 'react';
import './App.css';

function App() {
  // ✅ Dynamic backend base URL — uses environment variable when deployed, falls back to localhost for local testing
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const [form, setForm] = useState({
    scenario_name: '',
    monthly_invoice_volume: '',
    num_ap_staff: '',
    avg_hours_per_invoice: '',
    hourly_wage: '',
    error_rate_manual: '',
    error_cost: '',
    time_horizon_months: '',
    one_time_implementation_cost: ''
  });

  const [result, setResult] = useState(null);

  // Update form values
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Validate all required fields
  function validateForm() {
    for (const key in form) {
      if (form[key] === '' || form[key] === null) {
        alert(`Please enter a value for "${key.replace(/_/g, ' ')}"`);
        return false;
      }
    }
    return true;
  }

  // Run simulation + auto-save scenario
  async function handleSimulate() {
    if (!validateForm()) return;

    try {
      // ✅ Use API_BASE for backend URL
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (data.ok) {
        setResult(data.result);

        // Then auto-save to DB
        const saveRes = await fetch(`${API_BASE}/scenarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const saveData = await saveRes.json();

        if (saveData.ok) {
          alert(`✅ Scenario "${form.scenario_name}" saved successfully!`);
        } else {
          alert('⚠️ Simulation worked, but saving failed.');
        }
      } else {
        alert('Simulation failed. Please check your inputs.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend.');
    }
  }

  // Download PDF Report
  async function handleDownloadReport() {
    if (!result) {
      alert('Please run a simulation first before downloading the report.');
      return;
    }

    const enteredEmail = prompt('Enter your email to receive the report:');
    if (!enteredEmail) {
      alert('Email is required to generate the report.');
      return;
    }

    try {
      // ✅ Use API_BASE here too
      const res = await fetch(`${API_BASE}/report/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: enteredEmail, inputs: form })
      });

      if (!res.ok) {
        alert('Report generation failed.');
        return;
      }

      // Convert response to a downloadable PDF blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ROI_Report_${form.scenario_name || 'Report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      alert('✅ PDF Report downloaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Error downloading report.');
    }
  }

  // Clear form fields
  function handleClearForm() {
    setForm({
      scenario_name: '',
      monthly_invoice_volume: '',
      num_ap_staff: '',
      avg_hours_per_invoice: '',
      hourly_wage: '',
      error_rate_manual: '',
      error_cost: '',
      time_horizon_months: '',
      one_time_implementation_cost: ''
    });
    setResult(null);
  }

  return (
    <div className="app">
      <h1>Invoicing ROI Simulator</h1>

      <div className="layout">
        {/* Left Column: Form */}
        <div className="form-section">
          <h2>Input Details</h2>
          <div className="form-grid">
            {Object.keys(form).map((k) => (
              <label key={k}>
                {k.replace(/_/g, ' ')}
                <input
                  name={k}
                  value={form[k]}
                  onChange={handleChange}
                  placeholder={`Enter ${k.replace(/_/g, ' ')}`}
                />
              </label>
            ))}
          </div>

          <div className="buttons">
            <button onClick={handleSimulate}>Simulate</button>
            <button
              onClick={handleDownloadReport}
              style={{ marginLeft: '10px', backgroundColor: '#0b5fff', color: 'white' }}
            >
              Download Report (PDF)
            </button>
            <button
              onClick={handleClearForm}
              style={{
                marginLeft: '0px',
                backgroundColor: '#e63946',
                color: 'white',
              }}
            >
              Clear Form
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="results-section">
          <h2>Results</h2>
          {result ? (
            <pre className="result-box">{JSON.stringify(result, null, 2)}</pre>
          ) : (
            <p>Fill out the form and click <strong>Simulate</strong> to view results here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
