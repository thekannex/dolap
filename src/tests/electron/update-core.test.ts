/// <reference types="node" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { isNewer, parseVersion, pickAsset, fetchLatest, downloadAsset, installUpdate, cleanupLeftovers, canWrite } from '../../../electron/update-core.cjs';

const payload = Buffer.from('yeni-dolap-'.repeat(50_000)); // ~550 KB
const sha = crypto.createHash('sha256').update(payload).digest('hex');
let server: http.Server;
let base = '';

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/latest') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        tag_name: 'v1.18.0', name: 'Dolap 1.18.0', body: 'Notlar', html_url: `${base}/page`,
        assets: [{ name: 'Dolap.exe', size: payload.length, browser_download_url: `${base}/redirect`, digest: `sha256:${sha}` }],
      }));
    } else if (req.url === '/redirect') {
      res.writeHead(302, { location: `${base}/file` }).end();
    } else if (req.url === '/file') {
      res.setHeader('content-length', payload.length);
      res.end(payload);
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.close(); });

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dolap-guncelleme-'));

describe('güncelleme: sürüm karşılaştırma', () => {
  it('x.y.z ve v öneki', () => {
    expect(parseVersion('v1.17.0')).toEqual([1, 17, 0]);
    expect(isNewer('1.18.0', '1.17.0')).toBe(true);
    expect(isNewer('v1.17.1', '1.17.0')).toBe(true);
    expect(isNewer('1.17.0', '1.17.0')).toBe(false);
    expect(isNewer('1.9.0', '1.17.0')).toBe(false);
    expect(isNewer('bozuk', '1.0.0')).toBe(false);
  });

  it('dosya seçimi: önce Dolap.exe, sonra eski adlı taşınabilir', () => {
    expect(pickAsset({ assets: [{ name: 'Dolap-Kurulum-1.16.0.exe' }, { name: 'Dolap-Tasinabilir-1.16.0.exe' }] })?.name).toBe('Dolap-Tasinabilir-1.16.0.exe');
    expect(pickAsset({ assets: [{ name: 'Dolap-Tasinabilir-1.16.0.exe' }, { name: 'Dolap.exe' }] })?.name).toBe('Dolap.exe');
    expect(pickAsset({ assets: [] })).toBeNull();
  });
});

describe('güncelleme: indir ve değiştir', () => {
  it('en güncel sürümü okur', async () => {
    const r = await fetchLatest(fetch, `${base}/latest`);
    expect(r).toMatchObject({ version: '1.18.0', title: 'Dolap 1.18.0', asset: { name: 'Dolap.exe', size: payload.length } });
  });

  it('yönlendirmeyi izleyerek indirir, boyut ve SHA-256 doğrular', async () => {
    const dir = tmp();
    const r = await fetchLatest(fetch, `${base}/latest`);
    const steps: number[] = [];
    const file = await downloadAsset(fetch, r.asset!, dir, (p) => steps.push(p));
    expect(path.basename(file)).toBe('Dolap.exe.yeni');
    expect(fs.readFileSync(file).equals(payload)).toBe(true);
    expect(steps[steps.length - 1]).toBe(1);
    expect(fs.existsSync(path.join(dir, 'Dolap.exe.indiriliyor'))).toBe(false);
  });

  it('özet tutmazsa dosyayı bırakmaz', async () => {
    const dir = tmp();
    const r = await fetchLatest(fetch, `${base}/latest`);
    await expect(downloadAsset(fetch, { ...r.asset!, digest: 'sha256:00' }, dir)).rejects.toThrow('doğrulanamadı');
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('eski adlı .exe, Dolap.exe olarak yenilenir', () => {
    const dir = tmp();
    const exe = path.join(dir, 'Dolap-Tasinabilir-1.17.0.exe');
    fs.writeFileSync(exe, 'eski');
    fs.writeFileSync(path.join(dir, 'Dolap.exe.yeni'), 'yeni');
    const target = installUpdate(exe, path.join(dir, 'Dolap.exe.yeni'));
    expect(path.basename(target)).toBe('Dolap.exe');
    expect(fs.readFileSync(target, 'utf8')).toBe('yeni');
    expect(fs.readdirSync(dir).sort()).toEqual(['Dolap.exe']);
  });

  it('Dolap.exe yerinde değiştirilir; artıklar temizlenir', () => {
    const dir = tmp();
    const exe = path.join(dir, 'Dolap.exe');
    fs.writeFileSync(exe, 'eski');
    fs.writeFileSync(path.join(dir, 'Dolap.exe.yeni'), 'yeni');
    expect(installUpdate(exe, path.join(dir, 'Dolap.exe.yeni'))).toBe(exe);
    expect(fs.readFileSync(exe, 'utf8')).toBe('yeni');
    fs.writeFileSync(path.join(dir, 'Dolap.exe.indiriliyor'), 'yarım');
    cleanupLeftovers(exe);
    expect(fs.readdirSync(dir)).toEqual(['Dolap.exe']);
    expect(canWrite(dir)).toBe(true);
  });
});
