const { execSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

const services = [
  'api-gateway',
  'auth-service',
  'user-service',
  'listing-service',
  'chat-service',
  'admin-service',
  'ai-service',
  'search-service',
  'notification-service',
];

const task = process.argv[2];
if (!task) {
  console.error('Usage: node service-task.js <install|build|test|audit>');
  process.exit(1);
}

if (!['install', 'build', 'test', 'audit'].includes(task)) {
  console.error('Unknown task:', task);
  process.exit(1);
}

function hasPackageJson(targetPath) {
  return existsSync(path.join(targetPath, 'package.json'));
}

function hasLockfile(targetPath) {
  return existsSync(path.join(targetPath, 'package-lock.json'));
}

function readPackageScripts(targetPath) {
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return {};
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return packageJson.scripts || {};
}

function runCommand(command, cwd) {
  execSync(command, {
    cwd,
    stdio: 'inherit',
  });
}

function runTask(targetPath, taskName) {
  const scripts = readPackageScripts(targetPath);

  if (taskName === 'install') {
    runCommand(hasLockfile(targetPath) ? 'npm ci' : 'npm install', targetPath);
    return;
  }

  if (taskName === 'build') {
    if (scripts.build) {
      runCommand('npm run build', targetPath);
      return;
    }

    runCommand('node --check server.js', targetPath);
    return;
  }

  if (taskName === 'test') {
    if (scripts.test) {
      runCommand('npm test -- --passWithNoTests', targetPath);
      return;
    }

    console.log('No test script found, skipping');
    return;
  }

  if (taskName === 'audit') {
    runCommand('npm audit --omit=dev --audit-level=high', targetPath);
  }
}

// Install shared module first
if (task === 'install') {
  const sharedPath = path.join(__dirname, '..', 'backend', 'shared');
  if (hasPackageJson(sharedPath)) {
    console.log('\n=== INSTALL shared ===');
    runTask(sharedPath, task);
  }
}

services.forEach((service) => {
  const servicePath = path.join(__dirname, '..', 'backend', 'services', service);
  if (!existsSync(servicePath) || !hasPackageJson(servicePath)) {
    console.warn(`Skipping missing service: ${service}`);
    return;
  }

  console.log(`\n=== ${task.toUpperCase()} ${service} ===`);
  runTask(servicePath, task);
});
