import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('appBridge', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

export type AppBridge = typeof window.appBridge;

declare global {
  interface Window {
    appBridge: AppBridge;
  }
}
