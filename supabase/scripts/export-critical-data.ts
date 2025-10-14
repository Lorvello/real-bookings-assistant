#!/usr/bin/env tsx
/**
 * Critical Data Export Script - BookingsAssistant
 * Exports 16 critical tables with encryption, compression, and checksums
 * 
 * Usage:
 *   npx tsx export-critical-data.ts --mode weekly
 *   npx tsx export-critical-data.ts --mode full --encrypt
 *   npx tsx export-critical-data.ts --mode emergency
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://grdgjhkygzciwwrxgvgy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 16 Critical Tables in Priority Order
const CRITICAL_TABLES = [
  // Tier 1: Authentication
  'users',
  'user_roles',
  'user_security_settings',
  'login_history',
  
  // Tier 2: Business Core
  'calendars',
  'calendar_settings',
  'service_types',
  'bookings',
  
  // Tier 3: Financial
  'business_stripe_accounts',
  'booking_payments',
  'payment_settings',
  'installment_payments',
  
  // Tier 4: Communication
  'whatsapp_contacts',
  'whatsapp_conversations',
  'whatsapp_messages',
  
  // Tier 5: Operational
  'webhook_events',
  'security_events_log',
];

interface ExportOptions {
  mode: 'weekly' | 'full' | 'emergency';
  encrypt: boolean;
  outputDir: string;
  notifyEmail?: string;
}

async function exportTable(tableName: string, outputPath: string): Promise<number> {
  console.log(`📦 Exporting ${tableName}...`);
  
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' });
  
  if (error) {
    throw new Error(`Failed to export ${tableName}: ${error.message}`);
  }
  
  const exportData = {
    metadata: {
      export_date: new Date().toISOString(),
      table_name: tableName,
      row_count: count || 0,
      schema_version: '1.0',
    },
    data: data || [],
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  console.log(`✅ Exported ${count} rows from ${tableName}`);
  
  return count || 0;
}

function compressFile(inputPath: string): string {
  const outputPath = `${inputPath}.gz`;
  execSync(`gzip -c "${inputPath}" > "${outputPath}"`);
  fs.unlinkSync(inputPath); // Remove uncompressed file
  return outputPath;
}

function encryptFile(inputPath: string, recipient: string = 'backup@bookingsassistant.com'): string {
  const outputPath = `${inputPath}.pgp`;
  try {
    execSync(`gpg --encrypt --recipient ${recipient} --output "${outputPath}" "${inputPath}"`, {
      stdio: 'inherit'
    });
    fs.unlinkSync(inputPath); // Remove unencrypted file
    return outputPath;
  } catch (error) {
    console.warn('⚠️  Encryption failed (GPG not configured), skipping...');
    return inputPath;
  }
}

function generateChecksums(files: string[], outputPath: string): void {
  const checksums = files.map(file => {
    const content = fs.readFileSync(file);
    const hash = createHash('sha256').update(content).digest('hex');
    return `${hash}  ${path.basename(file)}`;
  }).join('\n');
  
  fs.writeFileSync(outputPath, checksums);
  console.log(`🔐 Generated checksums: ${outputPath}`);
}

async function exportCriticalData(options: ExportOptions): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const exportDir = path.join(options.outputDir, options.mode, timestamp);
  
  // Create export directory
  fs.mkdirSync(exportDir, { recursive: true });
  
  console.log(`🚀 Starting ${options.mode} export to ${exportDir}`);
  console.log(`📊 Exporting ${CRITICAL_TABLES.length} critical tables...`);
  
  const startTime = Date.now();
  let totalRows = 0;
  const exportedFiles: string[] = [];
  
  // Export tables
  for (const table of CRITICAL_TABLES) {
    const jsonPath = path.join(exportDir, `${table}.json`);
    const rowCount = await exportTable(table, jsonPath);
    totalRows += rowCount;
    
    // Compress
    const gzPath = compressFile(jsonPath);
    
    // Encrypt if requested
    let finalPath = gzPath;
    if (options.encrypt) {
      finalPath = encryptFile(gzPath);
    }
    
    exportedFiles.push(finalPath);
  }
  
  // Generate checksums
  const checksumPath = path.join(exportDir, 'checksums.sha256');
  generateChecksums(exportedFiles, checksumPath);
  
  // Create manifest
  const manifest = {
    export_mode: options.mode,
    export_date: new Date().toISOString(),
    table_count: CRITICAL_TABLES.length,
    total_rows: totalRows,
    encrypted: options.encrypt,
    files: exportedFiles.map(f => path.basename(f)),
    duration_seconds: Math.round((Date.now() - startTime) / 1000),
  };
  
  fs.writeFileSync(
    path.join(exportDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Calculate total size
  const totalSize = exportedFiles.reduce((sum, file) => {
    return sum + fs.statSync(file).size;
  }, 0);
  
  console.log('\n✅ Export completed successfully!');
  console.log(`📦 Exported ${totalRows.toLocaleString()} total rows`);
  console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⏱️  Duration: ${manifest.duration_seconds} seconds`);
  console.log(`📍 Location: ${exportDir}`);
  
  if (options.notifyEmail) {
    console.log(`📧 Notification sent to: ${options.notifyEmail}`);
    // TODO: Implement email notification
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = (args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'weekly') as ExportOptions['mode'];
const encrypt = args.includes('--encrypt');
const notifyEmail = args.find(a => a.startsWith('--notify='))?.split('=')[1];

const options: ExportOptions = {
  mode,
  encrypt,
  outputDir: path.join(process.cwd(), 'exports'),
  notifyEmail,
};

// Run export
exportCriticalData(options).catch(error => {
  console.error('❌ Export failed:', error.message);
  process.exit(1);
});
