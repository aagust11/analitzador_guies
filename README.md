# Analitzador de guies

Aplicació SPA en React + TypeScript que permet gestionar guies institucionals, prendre notes per dimensions d'anàlisi i comparar-les en una graella transversal. La persistència és 100% local i prioritza la File System Access API amb un mode de reserva basat en localStorage/IndexedDB.

## Requisits

- Node.js 18 o superior
- npm 9+

## Desenvolupament local

1. Instal·la les dependències: `npm install`.
2. Inicia el servidor de desenvolupament: `npm run dev`.
3. Obre `http://localhost:5173` i treballa en calent.

### Altres scripts disponibles

- `npm run build`: compila TypeScript i genera `dist/` amb els assets optimitzats.
- `npm run preview`: serveix la build generada per validar-la localment.
- `npm run deploy`: executa `npm run build` i fa `git subtree push --prefix dist origin gh-pages` per publicar-ho a GitHub Pages.

## Desplegament a GitHub Pages

1. Crea el repositori `USERNAME/ai-doc-analysis` (o un altre nom).
2. Si uses un altre repositori, defineix `VITE_GITHUB_PAGES_BASE="/nom-del-repo/"` abans de compilar perquè `vite.config.ts` fixi el `base` correcte.
3. Executa `npm run deploy`. El comandament crea/actualitza la branca `gh-pages` mitjançant `git subtree push`.
4. A GitHub, ves a **Settings → Pages** i tria la branca `gh-pages` com a origen.
5. Cada cop que vulguis actualitzar la pàgina repeteix `npm run deploy` (cal tenir la branca `gh-pages` creada al remot `origin`).

> Alternativa: crea un flux de GitHub Actions que executi `npm ci`, `npm run build` i faci deploy del contingut de `dist/` a `gh-pages`.

## Notes sobre emmagatzematge i suport del navegador

- Quan el navegador suporta la File System Access API (Chromium actual), es pot triar una carpeta local. Tots els fitxers (`project-state.json` i guies) s'hi guarden i la sincronització és automàtica i debounced.
- Si l'API no està disponible (Firefox/Safari), el projecte s'emmagatzema en localStorage/IndexedDB. En aquest mode cal exportar/importar manualment el projecte en JSON per moure dades entre màquines.
- Les dades només viuen en el teu dispositiu; l'aplicació no envia res a servidors externs. Fes servir els botons d'exportació/importació de la pàgina de Configuració per crear còpies de seguretat.
- L'indicador de la barra superior mostra si hi ha un desament pendent o en curs.

## Funcionalitats destacades

- **Espai d'anàlisi per guia** amb notes per dimensió, highlights del PDF i etiquetes/memos.
- **Graella comparativa**: vista matricial amb filtres (institució, estat i rang d'anys), resum de notes per cel·la, recompte de highlights/etiquetes i enllaç directe al panel corresponent. Inclou exportació del grid en JSON o CSV.
- **Configuració avançada**: informació del mode de persistència, selecció de carpeta local, exportació/importació del projecte i indicador clar per a navegadors sense File System Access.
- **Auto-save debounced**: qualsevol canvi a notes, highlights o etiquetes es desa automàticament després d'uns segons.
