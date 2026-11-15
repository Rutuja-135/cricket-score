import { spawn } from 'node:child_process';

const server = spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit' });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host'], { stdio: 'inherit' });

function shutdown() {
  server.kill();
  vite.kill();
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});
