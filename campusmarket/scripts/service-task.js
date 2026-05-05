const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const services = [
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
  console.error('Usage: node service-task.js <install|build|test>');
  process.exit(1);
}

const commands = {
  install: 'npm install',
  build: 'npm run build',
  test: 'npm test',
};

const command = commands[task];
if (!command) {
  console.error('Unknown task:', task);
  process.exit(1);
}

// Install shared module first
if (task === 'install') {
  const sharedPath = path.join(__dirname, '..', 'backend', 'shared');
  if (existsSync(sharedPath)) {
    console.log('\n=== INSTALL shared ===');
    execSync(command, {
      cwd: sharedPath,
      stdio: 'inherit',
    });
  }
}

services.forEach((service) => {
  const servicePath = path.join(__dirname, '..', 'backend', 'services', service);
  if (!existsSync(servicePath)) {
    console.warn(`Skipping missing service: ${service}`);
    return;
  }

  console.log(`\n=== ${task.toUpperCase()} ${service} ===`);
  execSync(command, {
    cwd: servicePath,
    stdio: 'inherit',
  });
});
