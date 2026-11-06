; Semeko Pro - NSIS customisation, included by electron-builder (package.json > build.nsis.include).
; The wizard keeps its steps (Welcome, choose the folder, install, Finish); this file gives it the
; Kawaii Dark colours of scripts/build/build-installer-art.js and Sameko's own wording.
;
; The colours are set in customWelcomePage, not customHeader: electron-builder inserts
; customHeader after the pages are built, too late for them. Modern UI reads MUI_BGCOLOR and
; MUI_TEXTCOLOR when each page is inserted, so the Welcome page, the header strip and the Finish
; page that follow all take them.

!macro samekoColours
  !ifdef MUI_BGCOLOR
    !undef MUI_BGCOLOR
  !endif
  !define MUI_BGCOLOR "152535"
  !ifdef MUI_TEXTCOLOR
    !undef MUI_TEXTCOLOR
  !endif
  !define MUI_TEXTCOLOR "E0F0FF"
!macroend

!macro customHeader
  !ifndef MUI_HEADERIMAGE_RIGHT
    !define MUI_HEADERIMAGE_RIGHT
  !endif
!macroend

!macro customWelcomePage
  !insertmacro samekoColours
  !define MUI_WELCOMEPAGE_TITLE "Welcome to Semeko Pro"
  !define MUI_WELCOMEPAGE_TEXT "Semeko Pro is the upgraded Semeko C++ IDE, with C/C++, Python, Java and C# support. GCC, GDB and clangd are bundled for C/C++; other languages use their installed runtimes.$\r$\n$\r$\nOn the next page, choose where to install it.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
  !define MUI_FINISHPAGE_TITLE "Semeko Pro is ready"
  !define MUI_FINISHPAGE_TEXT "Everything it needs, the GCC compiler included, is in the folder you chose.$\r$\n$\r$\nHappy coding!"
!macroend
