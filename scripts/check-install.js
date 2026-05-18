if (process.env.npm_command === 'install' && !process.env.ALLOW_INSTALL) {
  console.error('\n\x1b[31m[ERROR]\x1b[0m Use "npm ci" instead of "npm install" to keep package versions locked.');
  console.error('         Run: \x1b[36mnpm ci\x1b[0m');
  console.error('         If you really need to add/update a dependency, run:');
  console.error('         \x1b[36mALLOW_INSTALL=1 npm install <pkg>\x1b[0m\n');
  process.exit(1);
}
