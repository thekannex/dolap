; Dolap taşınabilir sürüm başlatıcısı.
; İlk açılışta programı .exe'nin yanındaki "Dolap-Dosyalari\program-<sürüm>" klasörüne bir kez açar,
; sonraki açılışlarda doğrudan çalıştırır. Projeler "Dolap-Dosyalari\veriler" klasöründe tutulur;
; .exe ile bu klasör birlikte taşınınca projeler de taşınır.
;
; Derleme: scripts/build-portable.cjs (VERSION, APP_DIR, OUT_FILE, ICON tanımlarıyla)

Unicode true
!include "LogicLib.nsh"
!include "FileFunc.nsh"

Name "Dolap"
Caption "Dolap hazırlanıyor"
OutFile "${OUT_FILE}"
Icon "${ICON}"
RequestExecutionLevel user
SetCompressor /SOLID zlib
ShowInstDetails nevershow
AutoCloseWindow true
BrandingText "Dolap ${VERSION}"
XPStyle on
LoadLanguageFile "${NSISDIR}\Contrib\Language files\Turkish.nlf"
SubCaption 3 " "
SubCaption 4 " "
CompletedText "Hazır"

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1055 "ProductName" "Dolap"
VIAddVersionKey /LANG=1055 "FileDescription" "Dolap (taşınabilir)"
VIAddVersionKey /LANG=1055 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1055 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=1055 "LegalCopyright" "Dolap"

Page instfiles

Var ROOT
Var APPDIR
Var DATADIR

Function Launch
  ; Uygulama verileri nereye yazacağını bu değişkenden öğrenir (boşsa varsayılan kullanıcı klasörü)
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("DOLAP_PORTABLE_DATA", "$DATADIR").r0'
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_DIR", "$EXEDIR").r0'
  ${GetParameters} $R0
  Exec '"$APPDIR\Dolap.exe" $R0'
FunctionEnd

Function .onInit
  StrCpy $ROOT "$EXEDIR\Dolap-Dosyalari"
  StrCpy $APPDIR "$ROOT\program-${VERSION}"
  StrCpy $DATADIR "$ROOT\veriler"

  ; Klasöre yazılabiliyor mu? (CD, salt okunur klasör...) Yazılamıyorsa program geçici klasöre,
  ; veriler kullanıcının kendi klasörüne gider.
  CreateDirectory "$ROOT"
  ClearErrors
  FileOpen $0 "$ROOT\.yazma-denemesi" w
  ${If} ${Errors}
    StrCpy $APPDIR "$TEMP\Dolap-${VERSION}"
    StrCpy $DATADIR ""
  ${Else}
    FileClose $0
    Delete "$ROOT\.yazma-denemesi"
  ${EndIf}

  ; Daha önce açılmışsa hazırlık yok: doğrudan çalıştır
  ${If} ${FileExists} "$APPDIR\Dolap.exe"
  ${AndIf} ${FileExists} "$APPDIR\.hazir"
    Call Launch
    Abort
  ${EndIf}
FunctionEnd

Section
  SetDetailsPrint textonly
  DetailPrint "Dolap bu bilgisayarda ilk kez hazırlanıyor. Bu yalnızca bir kez olur…"
  SetDetailsPrint none

  RMDir /r "$APPDIR"
  SetOutPath "$APPDIR"
  File /r "${APP_DIR}\*.*"

  ; Hazırlık tamamlandı işareti (yarıda kesilirse bir sonraki açılışta yeniden açılır)
  FileOpen $0 "$APPDIR\.hazir" w
  FileWrite $0 "${VERSION}"
  FileClose $0

  ${If} $DATADIR != ""
    CreateDirectory "$DATADIR"
    ; Eski sürümlerin program klasörleri silinir; veriler kalır
    FindFirst $1 $2 "$ROOT\program-*"
    ${DoWhile} $2 != ""
      ${If} $2 != "program-${VERSION}"
        RMDir /r "$ROOT\$2"
      ${EndIf}
      FindNext $1 $2
    ${Loop}
    FindClose $1

    FileOpen $0 "$ROOT\BENIOKU.txt" w
    FileWrite $0 "Bu klasör Dolap taşınabilir sürümünün dosyalarıdır.$\r$\n$\r$\n"
    FileWrite $0 "veriler      : projeleriniz ve ayarlarınız$\r$\n"
    FileWrite $0 "program-...  : programın kendisi (ilk açılışta oluşur, silinirse yeniden oluşur)$\r$\n$\r$\n"
    FileWrite $0 "Programı başka bir bilgisayara ya da USB belleğe taşırken .exe dosyasını ve bu klasörü birlikte taşıyın.$\r$\n"
    FileClose $0
  ${EndIf}

  Call Launch
SectionEnd
