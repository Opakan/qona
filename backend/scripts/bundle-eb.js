import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const stagingDir = path.join(rootDir, '.eb_staging');

if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// 1. Build shared and backend first locally
console.log('Building TypeScript workspaces locally...');
execSync('npm run build:shared', { stdio: 'inherit' });
execSync('npm run build:api', { stdio: 'inherit' });

// 2. Prepare Standalone package.json for Elastic Beanstalk
const backendPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'backend', 'package.json'), 'utf8'));

// Update scripts & remove workspace pointer for @qona/shared
delete backendPkg.dependencies['@qona/shared'];
backendPkg.scripts = {
  start: 'node dist/index.js',
  postinstall: 'npx prisma generate',
};

fs.writeFileSync(
  path.join(stagingDir, 'package.json'),
  JSON.stringify(backendPkg, null, 2),
  'utf8'
);

// 3. Copy compiled dist and prisma schema
fs.cpSync(path.join(rootDir, 'backend', 'dist'), path.join(stagingDir, 'dist'), { recursive: true });
fs.cpSync(path.join(rootDir, 'backend', 'prisma'), path.join(stagingDir, 'prisma'), { recursive: true });

// 4. Copy Procfile
const procfileContent = 'web: node dist/index.js\n';
fs.writeFileSync(path.join(stagingDir, 'Procfile'), procfileContent, 'utf8');

// 5. Pre-package @qona/shared into node_modules/@qona/shared so it's guaranteed to resolve
const sharedNodeModules = path.join(stagingDir, 'node_modules', '@qona', 'shared');
fs.mkdirSync(sharedNodeModules, { recursive: true });
fs.copyFileSync(path.join(rootDir, 'shared', 'package.json'), path.join(sharedNodeModules, 'package.json'));
fs.cpSync(path.join(rootDir, 'shared', 'dist'), path.join(sharedNodeModules, 'dist'), { recursive: true });

// 6. Create Zip Archive
const zipPath = path.join(rootDir, 'qonace-backend.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

execSync('powershell -Command "Compress-Archive -Path .eb_staging/* -DestinationPath qonace-backend.zip -Force"', {
  stdio: 'inherit',
});

fs.rmSync(stagingDir, { recursive: true, force: true });
console.log('🎉 Successfully created standalone self-contained qonace-backend.zip!');
