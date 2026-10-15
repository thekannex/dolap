/** Bir dosyayı kullanıcıya kaydettirir (masaüstü uygulamada "Farklı kaydet" penceresi açılır). */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function saveText(text: string, fileName: string, mime = 'text/plain'): void {
  saveBlob(new Blob([text], { type: `${mime};charset=utf-8` }), fileName);
}

/** Dosya seçtirip metin içeriğini döndürür; kullanıcı vazgeçerse null. */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      file.text().then(resolve, reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
