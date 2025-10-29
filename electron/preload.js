const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    getItems: () => ipcRenderer.invoke('db-get-items'),
    addItem: (item) => ipcRenderer.invoke('db-add-item', item),
    updateItem: (item) => ipcRenderer.invoke('db-update-item', item),
    deleteItem: (id) => ipcRenderer.invoke('db-delete-item', id),
    getCartItems: () => ipcRenderer.invoke('db-get-cart-items'),
    addCartItem: (item) => ipcRenderer.invoke('db-add-cart-item', item),
    updateCartItemQuantity: (id, quantity) => ipcRenderer.invoke('db-update-cart-item-quantity', { id, quantity }),
    removeCartItem: (id) => ipcRenderer.invoke('db-remove-cart-item', id),
    resetDatabase: () => ipcRenderer.invoke('db-reset-database'), // Expose resetDatabase
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => {
      const validChannels = ['new-item', 'focus-search', 'import-csv', 'export-csv-request', 'export-csv-success', 'export-csv-error', 'reset-database-request']; // Add reset-database-request
      if (validChannels.includes(channel)) {
        const subscription = (event, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
      }
    },
  },
});
