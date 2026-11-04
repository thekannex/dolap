# Dolap tarayıcı sürümünü (dist-web) FTP ile sunucuya yükler.
# Kullanım: önce "npm run build:web", sonra "npm run upload:web".
# Parola her çalıştırmada sorulur; hiçbir yere kaydedilmez.
# Önce şifreli bağlantı (FTPS) denenir; sunucu desteklemezse düz FTP'ye geçmeden önce sorar.
param(
  [string]$Server = 'ftp.kannex.pro',
  [string]$User = 'u405717589.dolap',
  # FTP hesabının kök klasörüne göre hedef (hesap doğrudan public_html/dolap klasörüne açılıyorsa "/")
  [string]$RemoteDir = '/',
  [string]$SiteUrl = 'https://kannex.pro/dolap/'
)
$ErrorActionPreference = 'Stop'

$root = Join-Path $PSScriptRoot '..\dist-web'
if (-not (Test-Path (Join-Path $root 'index.html'))) {
  Write-Host 'dist-web bulunamadı. Önce "npm run build:web" çalıştırın.' -ForegroundColor Red
  exit 1
}
$root = (Resolve-Path $root).Path
if (-not $RemoteDir.EndsWith('/')) { $RemoteDir += '/' }
if (-not $RemoteDir.StartsWith('/')) { $RemoteDir = '/' + $RemoteDir }

# Önce derlenen dosyalar, en son giriş sayfası: yükleme sürerken açan biri eksik dosyaya yönlenmez
$last = @('sw.js', 'manifest.webmanifest', 'index.html')
$files = Get-ChildItem $root -Recurse -File -Force |
  Sort-Object @{ Expression = { [array]::IndexOf($last, $_.Name) } }, FullName

Write-Host "Sunucu: $Server   Kullanıcı: $User   Hedef: $RemoteDir"
Write-Host "$($files.Count) dosya yüklenecek."
$secure = Read-Host 'FTP parolası' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$pass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
# Parola komut satırında görünmesin diye curl'e ayar olarak girişten verilir
$esc = ("$User`:$pass").Replace('\', '\\').Replace('"', '\"')
$config = "user = `"$esc`""

$curl = Join-Path $env:SystemRoot 'System32\curl.exe'
$tls = @('--ssl-reqd')
$i = 0
foreach ($f in $files) {
  $i++
  $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
  $url = "ftp://$Server$RemoteDir$rel"
  Write-Host ("[{0}/{1}] {2}" -f $i, $files.Count, $rel)
  $config | & $curl -s -S --ftp-create-dirs --connect-timeout 20 @tls -K - -T $f.FullName $url
  # 35: TLS bağlantı hatası, 60: sertifika doğrulanamadı, 64: sunucu FTPS desteklemiyor
  if ($i -eq 1 -and $tls.Count -gt 0 -and @(35, 60, 64) -contains $LASTEXITCODE) {
    $ans = Read-Host 'Şifreli bağlantı (FTPS) kurulamadı. Düz FTP ile devam edilsin mi? Parola şifrelenmeden gider. (e/h)'
    if ($ans -ne 'e') { exit 1 }
    $tls = @()
    $config | & $curl -s -S --ftp-create-dirs --connect-timeout 20 -K - -T $f.FullName $url
  }
  if ($LASTEXITCODE -eq 67) { Write-Host 'Kullanıcı adı ya da parola yanlış.' -ForegroundColor Red; exit 1 }
  if ($LASTEXITCODE -ne 0) { Write-Host "Yüklenemedi: $rel (curl çıkış kodu $LASTEXITCODE)" -ForegroundColor Red; exit 1 }
}
$pass = $null
Write-Host ''
Write-Host "Yükleme tamam. Adres: $SiteUrl" -ForegroundColor Green
