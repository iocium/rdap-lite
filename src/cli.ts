#!/usr/bin/env node

/**
 * CLI interface for RDAP lookups
 */
import { queryRDAP } from './client';
import { argv } from 'node:process';
import * as fs from 'fs';

async function main() {
  const [, , input, ...rest] = argv;
  const flags = new Set(rest);
  if (!input || input === '--help' || flags.has('--help')) {
    console.log(`Usage: rdap-lite <domain|ip> [--json]

Examples:
  rdap-lite example.com
  rdap-lite 8.8.8.8 --json`);
    process.exit(0);
  }

  try {
    const result = await queryRDAP(input);
    if (flags.has('--json')) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`🔍 RDAP result for ${input}
`);
      console.log(`Handle:     ${result.handle || '—'}`);
      console.log(`Name:       ${result.name || '—'}`);
      console.log(`Org:        ${result.org || '—'}`);
      console.log(`Country:    ${result.country || '—'}`);
      console.log(`Registrar:  ${result.registrar || '—'}`);
      console.log(`Created:    ${result.created || '—'}`);
      console.log(`Updated:    ${result.updated || '—'}`);

      if (result.entities?.length) {
        console.log(`\nEntities:`);
        for (const ent of result.entities) {
          console.log(`- ${ent.roles?.join(', ') || 'Entity'}: ${ent.name || 'Unknown'} (${ent.email || 'no email'})`);
        }
      }
    }
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();