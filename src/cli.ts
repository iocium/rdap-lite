#!/usr/bin/env node
/* istanbul ignore file */

import { Command } from 'commander';
import { queryRDAP } from './client';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as https from 'https';
import Ajv from 'ajv';

// JSON Schema for IANA bootstrap files
const bootstrapSchema = {
  type: 'object',
  properties: {
    services: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'array',
        minItems: 2,
        items: [
          { type: 'array', minItems: 1, items: { type: 'string' } },
          { type: 'array', minItems: 1, items: { type: 'string' } }
        ]
      }
    }
  },
  required: ['services'],
  additionalProperties: true
};
const ajv = new Ajv({ strictTuples: false });
const validateBootstrap = ajv.compile(bootstrapSchema);
const program = new Command();

program
  .name('rdap-lite')
  .usage('<domain|ip|autnum> [options]')
  .description('Lightweight RDAP client for domain, IP, and ASN lookups')
  .option('--json', 'output raw JSON')
  .arguments('<input>')
  .action(async (input: string, options: { json?: boolean }) => {
    try {
      const result = await queryRDAP(input);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`🔍 RDAP result for ${input}\n`);
        console.log(`Handle:     ${result.handle || '—'}`);
        console.log(`Name:       ${result.name || '—'}`);
        console.log(`Org:        ${result.org || '—'}`);
        console.log(`Country:    ${result.country || '—'}`);
        console.log(`Registrar:  ${result.registrar || '—'}`);
        console.log(`Created:    ${result.created || '—'}`);
        console.log(`Updated:    ${result.updated || '—'}`);
        if (result.entities?.length) {
          console.log('Entities:');
          for (const ent of result.entities) {
            console.log(`- ${ent.roles?.join(', ') || 'Entity'}: ${ent.name || 'Unknown'} (${ent.email || 'no email'})`);
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  });

// Command to update embedded IANA bootstrap JSON files
program
  .command('update-bootstraps [type]')
  .description('Fetch IANA bootstrap JSON (domain, ipv4, ipv6, autnum, or all) and save to src/data')
  .action(async (type: string = 'all') => {
    const map: Record<string, { url: string; file: string }> = {
      domain: { url: 'https://data.iana.org/rdap/dns.json', file: 'dns.json' },
      ipv4:   { url: 'https://data.iana.org/rdap/ipv4.json', file: 'ipv4.json' },
      ipv6:   { url: 'https://data.iana.org/rdap/ipv6.json', file: 'ipv6.json' },
      autnum: { url: 'https://data.iana.org/rdap/asn.json', file: 'asn.json' },
    };
    const types = type === 'all' ? Object.keys(map) : [type];
    for (const key of types) {
      if (!map[key]) {
        console.error(`Unknown type: ${key}. Valid: domain, ipv4, ipv6, autnum, all.`);
        process.exit(1);
      }
    }
    // Fetch and validate all bootstrap JSON in parallel
    const tasks = types.map(async key => {
      const { url, file } = map[key];
      const outPath = path.resolve(__dirname, 'data', file);
      // Fetch raw JSON text
      const text = await new Promise<string>((resolve, reject) => {
        https.get(url, res => {
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          let buf = '';
          res.setEncoding('utf8');
          res.on('data', c => buf += c);
          res.on('end', () => resolve(buf));
        }).on('error', reject);
      });
      // Parse and validate against schema
      const obj = JSON.parse(text);
      if (!validateBootstrap(obj)) {
        const errMsg = (validateBootstrap.errors || [])
          .map(e => `${e.instancePath} ${e.message}`)
          .join('; ');
        throw new Error(`Schema validation failed for ${file}: ${errMsg}`);
      }
      return { file, content: JSON.stringify(obj), outPath };
    });
    let resultsAll;
    try {
      resultsAll = await Promise.all(tasks);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
    for (const { file, content, outPath } of resultsAll) {
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, content, 'utf8');
      console.log(`Updated src/data/${file} (${Buffer.byteLength(content, 'utf8')} bytes)`);
    }
    process.exit(0);
  });

// Show help when no arguments are provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);