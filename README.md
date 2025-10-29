# Hardware Supplies Pricebook

Desktop pricebook application for hardware supplies built with Electron, React, and Vite. The app keeps a local catalogue of article pricing with quick summaries and is ready to package into a one-click installer for Windows or a signed app for macOS.

## Getting started

```bash
npm install
```

### Development

Run Vite, watch the Electron processes, and launch the desktop app:

```bash
npm run dev
```

### Type checking

```bash
npm run build:types
```

### Production build

Generate production assets for the renderer and the Electron processes:

```bash
npm run build
```

### Package installers

Create production builds and package installers using `electron-builder`.

```bash
npm run dist
```

Artifacts are generated for:

- **Windows (x64)** – NSIS one-click installer configured for a frictionless setup experience.
- **macOS** – `.dmg` disk image.

Generated files are located inside the `dist/` and `dist-electron/` directories, and installers are produced in the `dist/` folder.

> **Tip:** Provide custom installer icons by dropping `icon.ico` (Windows) or `icon.icns` (macOS) files into the `build/` directory before running `npm run dist`. If none are supplied, the default Electron icons will be used.

## Tech stack

- Electron 26
- React 18 + Vite 5
- TypeScript 5
- electron-builder for packaging installers

All data is stored in `localStorage`, so pricing stays on the device and no network connection is required.
