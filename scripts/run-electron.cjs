const { spawnSync } = require('child_process');
const electronPath = require('electron');

const args = process.argv.slice(2);
console.log('Launching Electron at:', electronPath, 'with args:', args);

const env = { ...process.env, ELECTRON_ENABLE_LOGGING: '1' };
delete env.ELECTRON_RUN_AS_NODE;

const result = spawnSync(electronPath, args, {
  stdio: 'inherit',
  env
});

if (result.error) {
  console.error('\n[Carrel] Could not launch local electron.exe binary:', result.error.message);
  console.log('\n[Carrel] If Windows Smart App Control / security policy prevents running unsigned electron.exe:');
  console.log('   Run "npm run preview" or "npm run dev" to open Carrel in your desktop browser immediately!\n');
  process.exit(1);
}

console.log('Electron exited with code:', result.status);
process.exit(result.status || 0);
