// Synthetic fixtures based on sleepme-device-control.reference.yaml.
const http = require('node:http');
const fs = require('node:fs');

http.createServer((request, response) => {
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    const url = new URL(request.url, 'http://localhost');
    if (process.env.SLEEPME_MOCK_LOG) {
      fs.appendFileSync(process.env.SLEEPME_MOCK_LOG, JSON.stringify({
        method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body,
      }) + '\n');
    }
    const mode = process.env.SLEEPME_MOCK_CASE || 'success';
    let code = 200;
    let result;
    if (request.headers.authorization !== 'Bearer mock-token' || mode === 'unauthorized') {
      code = 401;
      result = { error: 'Unauthorized' };
    } else if (request.method === 'GET' && url.pathname === '/devices') {
      result = mode === 'empty' ? [] : [{ id: 'mock-device', name: 'Example Dock Pro', attachments: ['CHILIPAD_PRO'] }];
    } else if (request.method === 'GET' && url.pathname === '/devices/mock-device') {
      result = mode === 'tracker'
        ? { about: { model: 'Example Sleep Tracker' }, status: { is_connected: true, tracker_specific_field: 1 } }
        : { about: { model: 'DP999NA' }, control: { thermal_control_status: 'standby', set_temperature_f: 72 },
          status: { is_connected: true, is_water_low: false, water_level: 100 } };
    } else if (request.method === 'PATCH' && url.pathname === '/devices/mock-device') {
      result = {};
    } else if (request.method === 'GET' && url.pathname === '/sleep-reports/') {
      result = { reports: mode === 'empty' ? [] : [{ date: '2026-01-15', sleep_score_percent: 80,
        sessions: [{ id: 'synthetic-session', total_sleep_duration: 420, awake_duration: null }] }] };
    } else {
      code = 404;
      result = { error: 'Endpoint not defined' };
    }
    if (mode === 'wrong-shape') result = { unexpected: true };
    if (mode === 'invalid-duration' && result.reports?.[0]) {
      result.reports[0].sessions[0].total_sleep_duration = '420';
    }
    response.writeHead(code, { 'Content-Type': mode === 'wrong-content-type' ? 'text/plain' : 'application/json' });
    response.end(mode === 'malformed-json' ? '{broken' : JSON.stringify(result));
  });
}).listen(process.env.PORT || 4500);
