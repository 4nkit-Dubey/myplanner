import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
// strictRequired is disabled because Draft 2020-12 allows conditional `required`
// clauses to refer to properties declared on the surrounding object schema.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const schema = JSON.parse(await readFile(path.join(root, 'schema/plan.schema.json'), 'utf8'));
const validate = ajv.compile(schema);

async function run(kind, expected) {
  const dir = path.join(root, 'fixtures', kind);
  const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort();
  let failed = 0;
  for (const file of files) {
    const data = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
    const valid = validate(data);
    if (valid !== expected) {
      failed++;
      console.error(`FAIL ${kind}/${file}: expected ${expected ? 'valid' : 'invalid'}, got ${valid ? 'valid' : 'invalid'}`);
      if (!valid) for (const e of validate.errors ?? []) console.error(`  ${e.instancePath || '/'} ${e.keyword}: ${e.message}`);
    }
  }
  console.log(`${kind}: ${files.length - failed}/${files.length} passed`);
  return { total: files.length, failed };
}

const valid = await run('valid', true);
const invalid = await run('invalid', false);
if (valid.total < 5 || valid.total > 10 || invalid.total < 10 || invalid.total > 15) {
  console.error('Fixture counts are outside the requested ranges.');
  process.exitCode = 1;
}
if (valid.failed + invalid.failed) process.exitCode = 1;
else console.log(`All ${valid.total + invalid.total} schema fixtures passed.`);
