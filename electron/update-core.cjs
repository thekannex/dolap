// Dolap güncelleyicisinin çekirdeği: GitHub'daki en güncel sürümü denetler, taşınabilir .exe'yi indirip
// doğrular ve çalışan programın yanındaki .exe ile değiştirir. Electron'a bağlı değildir (testlerde de çalışır).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RELEASES_API = 'https://api.github.com/repos/thekannex/dolap/releases/latest';
const RELEASES_PAGE = 'https://github.com/thekannex/dolap/releases/latest';
/** Yeni sürümlerde dosyanın sabit adı; eski sürümler "Dolap-Tasinabilir-x.y.z.exe" adını taşır. */
const EXE_NAME = 'Dolap.exe';
const VERSIONED_NAME = /^Dolap-Tasinabilir-\d+\.\d+\.\d+\.exe$/i;

function parseVersion(v) {
  const m = String(v ?? '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? m.slice(1).map(Number) : null;
}

/** a, b'den yeni mi (x.y.z karşılaştırması). */
function isNewer(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

/** Sürümün indirilecek taşınabilir dosyası. */
function pickAsset(release) {
  const assets = (release && release.assets) || [];
  return assets.find((a) => a.name === EXE_NAME)
    || assets.find((a) => VERSIONED_NAME.test(a.name))
    || assets.find((a) => /\.exe$/i.test(a.name))
    || null;
}

/** GitHub'daki en güncel sürüm. */
async function fetchLatest(fetchImpl, url = RELEASES_API) {
  const res = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Dolap-guncelleyici' } });
  if (!res.ok) throw new Error(`GitHub yanıt vermedi (${res.status}).`);
  const r = await res.json();
  const asset = pickAsset(r);
  return {
    version: String(r.tag_name || '').replace(/^v/i, ''),
    title: r.name || r.tag_name || '',
    notes: r.body || '',
    page: r.html_url || RELEASES_PAGE,
    asset: asset ? { name: asset.name, size: asset.size, url: asset.browser_download_url, digest: asset.digest || null } : null,
  };
}

/** Klasöre yazılabiliyor mu (indirilen dosya .exe'nin yanına konur). */
function canWrite(dir) {
  const probe = path.join(dir, `.dolap-yazma-${process.pid}`);
  try {
    fs.writeFileSync(probe, '');
    fs.rmSync(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Dosyayı .exe'nin klasörüne indirir ("Dolap.exe.yeni"), boyutunu ve varsa SHA-256 özetini doğrular.
 * onProgress(0..1) indirme ilerlemesini bildirir.
 */
async function downloadAsset(fetchImpl, asset, destDir, onProgress = () => {}) {
  const part = path.join(destDir, `${EXE_NAME}.indiriliyor`);
  const done = path.join(destDir, `${EXE_NAME}.yeni`);
  const res = await fetchImpl(asset.url, { headers: { 'User-Agent': 'Dolap-guncelleyici' } });
  if (!res.ok || !res.body) throw new Error(`Dosya indirilemedi (${res.status}).`);
  const total = Number(res.headers.get('content-length')) || asset.size || 0;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(part);
  let received = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done: end, value } = await reader.read();
      if (end) break;
      hash.update(value);
      received += value.length;
      if (!out.write(value)) await new Promise((r) => out.once('drain', r));
      if (total) onProgress(Math.min(1, received / total));
    }
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  } catch (err) {
    out.destroy();
    fs.rmSync(part, { force: true });
    throw err;
  }
  if (asset.size && received !== asset.size) {
    fs.rmSync(part, { force: true });
    throw new Error('İndirilen dosya eksik; tekrar deneyin.');
  }
  if (asset.digest && /^sha256:/i.test(asset.digest) && asset.digest.slice(7).toLowerCase() !== hash.digest('hex')) {
    fs.rmSync(part, { force: true });
    throw new Error('İndirilen dosya doğrulanamadı; tekrar deneyin.');
  }
  fs.rmSync(done, { force: true });
  fs.renameSync(part, done);
  onProgress(1);
  return done;
}

/**
 * İndirilen dosyayı çalışan .exe'nin yerine koyar. Başlatıcı programı açınca kapandığı için .exe kilitli değildir.
 * Eski sürümlerin "Dolap-Tasinabilir-x.y.z.exe" dosyası "Dolap.exe" olarak yenilenir. Yeni .exe'nin yolunu döndürür.
 */
function installUpdate(exePath, newFile) {
  const dir = path.dirname(exePath);
  const target = VERSIONED_NAME.test(path.basename(exePath)) ? path.join(dir, EXE_NAME) : exePath;
  const old = `${exePath}.eski`;
  fs.rmSync(old, { force: true });
  fs.renameSync(exePath, old);
  try {
    if (target !== exePath) fs.rmSync(target, { force: true });
    fs.renameSync(newFile, target);
  } catch (err) {
    // Değiştirilemezse eski dosya yerine konur
    try { fs.renameSync(old, exePath); } catch { /* yok */ }
    throw err;
  }
  try { fs.rmSync(old, { force: true }); } catch { /* bir sonraki açılışta temizlenir */ }
  return target;
}

/** Yarım kalmış indirme ve eski dosya artıklarını siler. */
function cleanupLeftovers(exePath) {
  const dir = path.dirname(exePath);
  for (const name of [`${path.basename(exePath)}.eski`, `${EXE_NAME}.indiriliyor`]) {
    try { fs.rmSync(path.join(dir, name), { force: true }); } catch { /* kullanımda olabilir */ }
  }
}

module.exports = {
  RELEASES_API, RELEASES_PAGE, EXE_NAME,
  parseVersion, isNewer, pickAsset, fetchLatest, canWrite, downloadAsset, installUpdate, cleanupLeftovers,
};
