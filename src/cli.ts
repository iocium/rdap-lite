#!/usr/bin/env node

import { Command } from 'commander';
import { queryRDAP } from './client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';

const program = new Command();

program
  .name('rdap-lite')
  .usage('<domain|ip> [options]')
  .description('Lightweight RDAP client for domain and IP lookups')
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
          console.log('\\nEntities:');
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
  .description('Fetch IANA bootstrap JSON (domain, ipv4, ipv6, or all) and save to src/data')
  .action(async (type: string = 'all') => {
    const map: Record<string, { url: string; file: string }> = {
      domain: { url: 'https://data.iana.org/rdap/dns.json', file: 'dns.json' },
      ipv4:   { url: 'https://data.iana.org/rdap/ipv4.json', file: 'ipv4.json' },
      ipv6:   { url: 'https://data.iana.org/rdap/ipv6.json', file: 'ipv6.json' },
    };
    const types = type === 'all' ? Object.keys(map) : [type];
    for (const key of types) {
      if (!map[key]) {
        console.error(`Unknown type: ${key}. Valid: domain, ipv4, ipv6, all.`);
        process.exit(1);
      }
      const { url, file } = map[key];
      const outPath = path.resolve(__dirname, 'data', file);
      try {
        // Fetch raw JSON text
        const text = await new Promise<string>((resolve, reject) => {
          https.get(url, (res) => {
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          }).on('error', reject);
        });
        // Minify JSON by stripping whitespace
        let minified: string;
        try {
          const obj = JSON.parse(text);
          minified = JSON.stringify(obj);
        } catch (err: any) {
          console.warn(`Warning: failed to parse JSON for ${file}, writing raw text`);
          minified = text;
        }
        // Ensure output directory exists
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, minified, 'utf8');
        console.log(`Updated src/data/${file} (${Buffer.byteLength(minified, 'utf8')} bytes)`);
      } catch (err: any) {
        console.error(`Failed to update ${key}:`, err.message);
        process.exit(1);
      }
    }
    process.exit(0);
  });

// Show help when no arguments are provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);