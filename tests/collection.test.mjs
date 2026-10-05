import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const collections = {
  json: 'postman/files/sleepme-public-developer-api.postman_collection.json',
  yaml: 'postman/collections/sleepme-public-developer-api',
};
const readPaths = ['/devices', '/devices/mock-device', '/sleep-reports/', '/sleep-reports/'];

function run(format, { args = [], mode = 'success', variables = {}, smoke = false } = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'sleepme-test-'));
  const log = join(temp, 'requests.jsonl');
  const env = { ...process.env, SLEEPME_MOCK_LOG: log, SLEEPME_MOCK_CASE: mode };
  const command = smoke ? process.execPath : 'postman';
  const cliArgs = smoke ? ['scripts/smoke.mjs', '--mock', '--format', format] : [
    'collection', 'run', collections[format],
    '--use-mock', '{{SleepMeAPI_Url}} mock:./postman/mocks/sleepme',
    '--no-report-events', '--ignore-redirects', '--timeout-request', '5000', '--timeout', '20000',
  ];
  if (!smoke) {
    for (const [key, value] of Object.entries({ SleepMeAPI_Token: 'mock-token', device_id: 'mock-device', ...variables })) {
      cliArgs.push('--env-var', `${key}=${value}`);
    }
    cliArgs.push(...args);
  }
  try {
    const result = spawnSync(command, cliArgs, { cwd: root, env, encoding: 'utf8', timeout: 45000 });
    if (result.error) throw result.error;
    assert.equal(result.signal, null, result.stderr);
    const requests = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
    return { code: result.status, output: result.stdout + result.stderr, requests };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function passed(result, assertionCount) {
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, new RegExp(`\\|\\s+assertions\\s+\\|\\s+${assertionCount}\\s+\\|\\s+0\\s+\\|`));
}

function readsOnly(result) {
  assert.deepEqual(result.requests.map(request => request.method), ['GET', 'GET', 'GET', 'GET']);
  assert.deepEqual(result.requests.map(request => request.path), readPaths);
  assert.equal(result.requests[2].query.days_back, '6');
  assert.equal(result.requests[3].query.days_back, '0');
}

for (const format of Object.keys(collections)) {
  test(`${format}: a full default run sends only the four reads`, () => {
    const result = run(format);
    passed(result, 16);
    readsOnly(result);
    assert.equal((result.output.match(/Skipped device control/g) || []).length, 10);
  });

  test(`${format}: smoke command runs all four reads and their assertions`, () => {
    const result = run(format, { smoke: true });
    passed(result, 16);
    readsOnly(result);
  });

  test(`${format}: opting in enables only the named PATCH recipe`, () => {
    const result = run(format, { variables: { allowed_control_request: 'Turn Device On' } });
    passed(result, 20);
    const writes = result.requests.filter(request => request.method !== 'GET');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].method, 'PATCH');
    assert.equal(writes[0].path, '/devices/mock-device');
    assert.deepEqual(JSON.parse(writes[0].body), { thermal_control_status: 'active' });
    assert.equal(result.requests.length, 5);
  });

  for (const [name, variables] of [
    ['boolean-like opt-in', { allowed_control_request: 'true' }],
    ['a different recipe', { allowed_control_request: 'Turn Device Off' }],
    ['missing device ID', { allowed_control_request: 'Turn Device On', device_id: '' }],
    ['missing token', { allowed_control_request: 'Turn Device On', SleepMeAPI_Token: '' }],
  ]) {
    test(`${format}: ${name} cannot send a control`, () => {
      const result = run(format, { args: ['-i', 'Turn Device On'], variables });
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, /Skipped device control/);
      assert.deepEqual(result.requests, []);
    });
  }

  for (const mode of ['empty', 'tracker']) {
    test(`${format}: smoke accepts ${mode} fixtures`, () => {
      const result = run(format, { smoke: true, mode });
      passed(result, 16);
      readsOnly(result);
    });
  }

  for (const [mode, name, assertion] of [
    ['unauthorized', 'List Devices', 'HTTP status is 200'],
    ['malformed-json', 'List Devices', 'Response is valid JSON'],
    ['wrong-content-type', 'List Devices', 'Content-Type is JSON'],
    ['wrong-shape', 'List Devices', 'Device list contains valid device IDs'],
    ['wrong-shape', 'Get Device Status', 'Device status has identity and status objects'],
    ['wrong-shape', 'List Sleep Reports', 'Sleep reports contain dates and sessions'],
    ['invalid-duration', 'List Sleep Reports', 'Sleep reports contain dates and sessions'],
  ]) {
    test(`${format}: ${name} fails on ${mode}`, () => {
      const result = run(format, { args: ['-i', name], mode });
      assert.notEqual(result.code, 0, result.output);
      assert.equal(result.requests.length, 1, result.output);
      assert.ok(result.output.includes(assertion), result.output);
      assert.match(result.output, /AssertionError|JSONError/);
    });
  }
}

test('live smoke rejects incomplete configuration before making requests', () => {
  const temp = mkdtempSync(join(tmpdir(), 'sleepme-config-'));
  try {
    const environment = join(temp, 'private.json');
    writeFileSync(environment, JSON.stringify({ values: [{ key: 'SleepMeAPI_Token', value: '', enabled: true }] }));
    const result = spawnSync(process.execPath, ['scripts/smoke.mjs', '--environment', environment], {
      cwd: root, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Set SleepMeAPI_Token/);
    assert.equal(result.stdout, '');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
