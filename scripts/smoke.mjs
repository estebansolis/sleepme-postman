import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const jsonCollection = 'postman/files/sleepme-public-developer-api.postman_collection.json';
const yamlCollection = 'postman/collections/sleepme-public-developer-api';
const requests = [
  'Devices/List Devices',
  'Devices/Get Device Status',
  'Sleep Reports/List Sleep Reports',
  'Sleep Reports/Get Today Sleep Reports',
];

try {
  const { values } = parseArgs({ options: {
    mock: { type: 'boolean', default: false },
    environment: { type: 'string' },
    format: { type: 'string', default: 'json' },
  } });
  if (!['json', 'yaml'].includes(values.format)) throw new Error('Use --format json or yaml.');
  if (values.mock === Boolean(values.environment)) {
    throw new Error('Choose --mock OR --environment <private-file>.');
  }

  // Refuse to silently select a missing or changed recipe.
  const collection = JSON.parse(readFileSync(resolve(root, jsonCollection), 'utf8'));
  for (const selector of requests) {
    const [folder, name] = selector.split('/');
    const item = collection.item.find(item => item.name === folder)?.item.find(item => item.name === name);
    if (item?.request.method !== 'GET') throw new Error(`Smoke request must be GET: ${selector}`);
  }

  const args = ['collection', 'run', values.format === 'yaml' ? yamlCollection : jsonCollection];
  // CLI 1.69 accepts unique request names for both formats; JSON folder paths fail.
  for (const request of requests) args.push('-i', request.split('/')[1]);
  if (values.mock) {
    args.push('--use-mock', '{{SleepMeAPI_Url}} mock:./postman/mocks/sleepme',
      '--env-var', 'SleepMeAPI_Token=mock-token', '--env-var', 'device_id=mock-device');
  } else {
    const environment = resolve(values.environment);
    const data = JSON.parse(readFileSync(environment, 'utf8'));
    for (const key of ['SleepMeAPI_Token', 'device_id']) {
      const entry = data.values?.find(entry => entry.key === key && entry.enabled !== false);
      if (typeof entry?.value !== 'string' || !entry.value.trim() || entry.value.includes('{{')) {
        throw new Error(`Set ${key} in the exported private JSON environment before running smoke tests.`);
      }
    }
    args.push('-e', environment, '--delay-request', '6500');
  }
  args.push('--env-var', 'allowed_control_request=', '--no-report-events', '--ignore-redirects',
    '--timeout-request', '10000', '--timeout', '120000', '--bail');
  const result = spawnSync('postman', args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
