const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Internal constants
const automated_cost_per_invoice = 0.20;
const error_rate_auto = 0.1 / 100;
const min_roi_boost_factor = 1.1;

function simulate(inputs) {
  const {
    monthly_invoice_volume,
    num_ap_staff,
    avg_hours_per_invoice,
    hourly_wage,
    error_rate_manual,
    error_cost,
    time_horizon_months,
    one_time_implementation_cost
  } = inputs;

  const labor_cost_manual = num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;
  const auto_cost = monthly_invoice_volume * automated_cost_per_invoice;
  const error_savings = (error_rate_manual / 100 - error_rate_auto) * monthly_invoice_volume * error_cost;
  let monthly_savings = (labor_cost_manual + error_savings) - auto_cost;
  monthly_savings *= min_roi_boost_factor;
  const cumulative_savings = monthly_savings * time_horizon_months;
  const net_savings = cumulative_savings - one_time_implementation_cost;
  const payback_months = one_time_implementation_cost / monthly_savings;
  const roi_percentage = (net_savings / one_time_implementation_cost) * 100;

  return {
    labor_cost_manual,
    auto_cost,
    error_savings,
    monthly_savings,
    cumulative_savings,
    net_savings,
    payback_months,
    roi_percentage
  };
}

// --- API endpoints ---

app.post('/simulate', (req, res) => {
  const result = simulate(req.body);
  res.json({ ok: true, result });
});

app.post('/scenarios', (req, res) => {
  const { scenario_name, ...inputs } = req.body;
  const result = simulate(inputs);
  const sql = `INSERT INTO scenarios (scenario_name, inputs_json, results_json)
               VALUES (?, ?, ?)`;
  db.query(sql, [scenario_name, JSON.stringify(inputs), JSON.stringify(result)], (err, data) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, id: data.insertId, result });
  });
});

app.get('/scenarios', (req, res) => {
  db.query('SELECT * FROM scenarios ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, scenarios: rows });
  });
});

// ---------------------- REPORT GENERATION -----------------------
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

app.post('/report/generate', async (req, res) => {
  const { email, inputs } = req.body;

  if (!email || !inputs) {
    return res.status(400).json({ ok: false, error: 'Email and inputs are required' });
  }

  // Run simulation again for this input
  const sim = simulate(inputs);

  // Create a new PDF
  const doc = new PDFDocument();
  const filename = `ROI_Report_${inputs.scenario_name || 'Unnamed'}.pdf`;
  const filePath = path.join(__dirname, filename);

  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text('Invoicing ROI Report', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Scenario Name: ${inputs.scenario_name}`);
  doc.text(`Email: ${email}`);
  doc.text(`Generated on: ${new Date().toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(14).text('Input Summary', { underline: true });
  Object.entries(inputs).forEach(([key, val]) => {
    doc.fontSize(12).text(`${key}: ${val}`);
  });

  doc.moveDown();
  doc.fontSize(14).text('Simulation Results', { underline: true });
  Object.entries(sim).forEach(([key, val]) => {
    doc.fontSize(12).text(`${key}: ${JSON.stringify(val, null, 2)}`);
  });

  doc.end();

  // Wait a moment for PDF to finish writing
  setTimeout(() => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  }, 500);
});

app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));

