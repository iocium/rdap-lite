#!/usr/bin/env node

import { Command } from 'commander';
import { queryRDAP } from './client';

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

// Show help when no arguments are provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);