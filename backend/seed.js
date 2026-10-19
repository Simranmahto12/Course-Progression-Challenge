import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running MSOT Course Progression seed...');
try {
  execSync('npx tsx src/seed.ts', { cwd: __dirname, stdio: 'inherit' });
} catch (err) {
  console.error('Seed execution error:', err.message);
  process.exit(1);
}
