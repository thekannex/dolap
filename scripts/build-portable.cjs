// Taşınabilir sürümü derler: release/win-unpacked klasörünü build/portable-launcher.nsi ile tek .exe yapar.
// electron-builder'ın kendi taşınabilir paketi her açılışta programı geçici klasöre açıp siliyor;
// bu başlatıcı programı .exe'nin yanına bir kez açar ve sonraki açılışlarda yeniden kullanır.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appDir = path.join(root, 'release', 'win-unpacked');
const outFile = path.join(root, 'release', `Dolap-Tasinabilir-${version}.exe`);
const icon = [path.join(root, 'release', '.icon-ico', 'icon.ico'), path.join(root, 'build', 'icon.ico')].find((p) => fs.existsSync(p));

/** electron-builder'ın indirdiği NSIS derleyicisi. */
function findMakensis() {
  const cache = path.join(process.env.LOCALAPPDATA ?? '', 'electron-builder', 'Cache');
  const stack = [cache];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isFile() && e.name.toLowerCase() === 'makensis.exe') return p;
      if (e.isDirectory() && /^nsis/i.test(e.name)) stack.push(p);
    }
  }
  return null;
}

if (!fs.existsSync(path.join(appDir, 'Dolap.exe'))) throw new Error('release/win-unpacked bulunamadı; önce electron-builder çalışmalı.');
if (!icon) throw new Error('Simge (icon.ico) bulunamadı.');
const makensis = findMakensis();
if (!makensis) throw new Error('makensis.exe bulunamadı (electron-builder NSIS önbelleği).');

console.log(`  • taşınabilir  ${path.relative(root, outFile)}`);
execFileSync(makensis, [
  '-V2', '-INPUTCHARSET', 'UTF8',
  `-DVERSION=${version}`, `-DAPP_DIR=${appDir}`, `-DOUT_FILE=${outFile}`, `-DICON=${icon}`,
  path.join(root, 'build', 'portable-launcher.nsi'),
], { stdio: 'inherit' });
