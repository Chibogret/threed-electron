import React, { useState, useEffect, useRef } from 'react';
import { processCsv } from './csvProcessor';

// --- Constants ---
const UNIT_OPTIONS = ['pcs', 'box', 'bag', 'kg', 'm', 'length', 'roll', 'set', 'pair', 'tin', 'gal', 'lot'];
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

// --- Utility Functions ---
const parseNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

// --- Main App Component ---
function App() {
  // --- State Management ---
  const [items, setItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('articleName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingItem, setEditingItem] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState(null);
  const [showResetDbModal, setShowResetDbModal] = useState(false); // New state for reset database modal
  const searchInputRef = useRef(null);

  // --- Persistence Adapter ---
  const persistenceAdapter = useRef({
    loadItems: async () => window.electron ? window.electron.ipcRenderer.getItems() : [],
    saveItem: async (item) => window.electron ? window.electron.ipcRenderer.addItem(item) : item,
    updateItem: async (item) => window.electron ? window.electron.ipcRenderer.updateItem(item) : item,
    deleteItem: async (id) => window.electron ? window.electron.ipcRenderer.deleteItem(id) : id,
    loadCartItems: async () => window.electron ? window.electron.ipcRenderer.getCartItems() : [],
    saveCartItem: async (item) => window.electron ? window.electron.ipcRenderer.addCartItem(item) : item,
    updateCartItemQuantity: async (id, quantity) => window.electron ? window.electron.ipcRenderer.updateCartItemQuantity(id, quantity) : { id, quantity },
    removeCartItem: async (id) => window.electron ? window.electron.ipcRenderer.removeCartItem(id) : id,
  });

  // --- Effects ---
  useEffect(() => {
    const loadData = async () => {
      setItems(await persistenceAdapter.current.loadItems());
      setCartItems(await persistenceAdapter.current.loadCartItems());
    };
    loadData();
  }, []);

  useEffect(() => {
    if (window.electron) {
      const unsubs = [
        window.electron.ipcRenderer.on('new-item', () => setEditingItem({})),
        window.electron.ipcRenderer.on('focus-search', () => searchInputRef.current?.focus()),
        window.electron.ipcRenderer.on('import-csv', handleImportCsv),
        window.electron.ipcRenderer.on('export-csv-request', handleExportCsv),
        window.electron.ipcRenderer.on('export-csv-success', () => showMessage('success', 'CSV exported successfully!')),
        window.electron.ipcRenderer.on('export-csv-error', (error) => showMessage('error', `CSV export failed: ${error}`)),
        window.electron.ipcRenderer.on('reset-database-request', handleResetDatabaseRequest), // Handle reset database request from menu
      ];
      return () => unsubs.forEach(unsub => unsub());
    }
  }, []);

  // --- Handlers ---
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleAddItem = async (newItem) => {
    const addedItem = await persistenceAdapter.current.saveItem({ id: Date.now(), ...newItem });
    setItems(prev => [...prev, addedItem]);
    setEditingItem(null);
    showMessage('success', 'Item added successfully!');
  };

  const handleUpdateItem = async (updatedItem) => {
    const item = await persistenceAdapter.current.updateItem(updatedItem);
    setItems(prev => prev.map(i => (i.id === item.id ? item : i)));
    setEditingItem(null);
    showMessage('success', 'Item updated successfully!');
  };

  const handleDeleteRequest = (id) => {
    setItemToDeleteId(id);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (password) => {
    setShowPasswordModal(false);
    if (password === 'deinyel04' && itemToDeleteId) {
      await persistenceAdapter.current.deleteItem(itemToDeleteId);
      setItems(prev => prev.filter(item => item.id !== itemToDeleteId));
      showMessage('success', 'Item deleted successfully!');
    } else {
    showMessage('error', 'Incorrect password or no item selected.');
    }
    setItemToDeleteId(null);
  };

  const handleResetDatabaseRequest = () => {
    setShowResetDbModal(true);
  };

  const handleResetDatabase = async (password) => {
    setShowResetDbModal(false);
    if (password === 'deinyel04') { // Admin password for reset
      if (window.electron) {
        await window.electron.ipcRenderer.resetDatabase();
        setItems([]); // Clear items in UI
        setCartItems([]); // Clear cart items in UI
        showMessage('success', 'Database reset successfully!');
      } else {
        showMessage('error', 'Database reset not available in browser mode.');
      }
    } else {
      showMessage('error', 'Incorrect password for database reset.');
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleAddToCart = async (item) => {
    const existingItem = cartItems.find(cartItem => cartItem.itemId === item.id);
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      await persistenceAdapter.current.updateCartItemQuantity(existingItem.id, newQuantity);
      setCartItems(prev => prev.map(cartItem =>
        cartItem.id === existingItem.id ? { ...cartItem, quantity: newQuantity } : cartItem
      ));
    } else {
      const newCartItem = { id: Date.now(), itemId: item.id, ...item, quantity: 1 };
      await persistenceAdapter.current.saveCartItem(newCartItem);
      setCartItems(prev => [...prev, newCartItem]);
    }
    showMessage('success', `${item.articleName} added to cart.`);
  };

  const handleUpdateCartQuantity = async (id, quantity) => {
    const updated = await persistenceAdapter.current.updateCartItemQuantity(id, Math.max(1, quantity));
    setCartItems(prev => prev.map(item => (item.id === updated.id ? { ...item, quantity: updated.quantity } : item)));
  };

  const handleRemoveFromCart = async (id) => {
    await persistenceAdapter.current.removeCartItem(id);
    setCartItems(prev => prev.filter(item => item.id !== id));
    showMessage('success', 'Item removed from cart.');
  };

  const handleImportCsv = async (csvContent) => {
    const processedCsvContent = processCsv(csvContent);
    const lines = processedCsvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      showMessage('error', 'CSV file is empty or has no data rows.');
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ["QUANTITY", "ARTICLES", "UNIT PRICE", "SALE PRICE"];
    if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
      showMessage('error', 'CSV headers do not match expected format after processing.');
      return;
    }
    const newItems = lines.slice(1).map((line, i) => {
      const row = line.split(',');
      return {
        id: Date.now() + i,
        unit: row[0]?.trim(), // Changed from quantity to unit
        articleName: row[1]?.trim(),
        unitPrice: parseNumber(row[2]),
        salePrice: parseNumber(row[3]),
      };
    });
    // Save each new item to the database
    for (const newItem of newItems) {
      await persistenceAdapter.current.saveItem(newItem);
    }
    // Reload all items from the database to ensure state is consistent
    setItems(await persistenceAdapter.current.loadItems());
    showMessage('success', `Successfully imported ${newItems.length} items.`);
  };

  const handleExportCsv = (filePath) => {
    const headers = ["QUANTITY", "ARTICLES", "UNIT PRICE", "SALE PRICE"];
    const csvRows = [
      headers.join(','),
      ...items.map(item =>
        [item.quantity, item.articleName, item.unitPrice, item.salePrice].join(',')
      )
    ];
    const csvData = csvRows.join('\n');
    const date = new Date();
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const fileName = `data_${dateString}.csv`;

    if (window.electron) {
      window.electron.ipcRenderer.send('export-csv-data', { filePath, csvData, fileName });
    }
  };

  // --- Derived State ---
  const sortedItems = [...items].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    if (typeof aValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const filteredItems = sortedItems.filter(item => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) return true; // Show all items if search term is empty

    const keywords = lowerCaseSearchTerm.split(/\s+/).filter(Boolean); // Split by spaces and remove empty strings

    return keywords.every(keyword =>
      item.articleName.toLowerCase().includes(keyword)
    );
  });

  // --- Render ---
  return (
    <div className="app-container">
      <Header />
      <Message message={message} />
      <main className="main-content">
        <div className="inventory-section">
          <Controls
            searchTerm={searchTerm}
            onSearchChange={e => setSearchTerm(e.target.value)}
            onAddItemClick={() => setEditingItem({})}
            searchInputRef={searchInputRef}
          />
          <ItemList
            items={filteredItems}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onEdit={setEditingItem}
            onDelete={handleDeleteRequest}
            onAddToCart={handleAddToCart}
          />
        </div>
        <Cart
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
        />
      </main>
      {editingItem && (
        <ItemForm
          item={editingItem}
          onSave={editingItem.id ? handleUpdateItem : handleAddItem}
          onCancel={() => setEditingItem(null)}
        />
      )}
      {showPasswordModal && (
        <PasswordPrompt
          onPasswordSubmit={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
      {showResetDbModal && (
        <PasswordPrompt
          onPasswordSubmit={handleResetDatabase}
          onCancel={() => setShowResetDbModal(false)}
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

const Header = () => (
  <header>
    <h1>ThreeD Pricebook</h1>
  </header>
);

const Message = ({ message }) => (
  <div className={`message ${message.type} ${message.text ? 'visible' : ''}`}>
    {message.text}
  </div>
);

const Controls = ({ searchTerm, onSearchChange, onAddItemClick, searchInputRef }) => (
  <div className="controls">
    <input
      type="text"
      placeholder="Search by Article..."
      value={searchTerm}
      onChange={onSearchChange}
      ref={searchInputRef}
      className="search-input"
    />
    <button onClick={onAddItemClick} className="btn-primary">Add New Item</button>
  </div>
);

const ItemList = ({ items, sortBy, sortOrder, onSort, onEdit, onDelete, onAddToCart }) => {
  const SortIndicator = ({ column }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {['unit', 'articleName', 'unitPrice', 'salePrice'].map(col => (
              <th key={col} onClick={() => onSort(col)}>
                {col === 'unit' ? 'Unit Type' : col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                <SortIndicator column={col} />
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center">No items found.</td>
            </tr>
          ) : (
            items.map(item => (
              <tr key={item.id}>
                <td>{item.unit}</td> {/* Changed from item.quantity to item.unit */}
                <td>{item.articleName}</td>
                <td>{CURRENCY_FORMATTER.format(item.unitPrice)}</td>
                <td>{CURRENCY_FORMATTER.format(item.salePrice)}</td>
                <td className="actions-cell">
                  <button onClick={() => onAddToCart(item)} className="btn-icon" title="Add to Cart">🛒</button>
                  <button onClick={() => onEdit(item)} className="btn-icon" title="Edit Item">✏️</button>
                  <button onClick={() => onDelete(item.id)} className="btn-icon" title="Delete Item">🗑️</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const Cart = ({ cartItems, onUpdateQuantity, onRemoveItem }) => {
  const total = cartItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

  return (
    <aside className="cart-container">
      <h2>Shopping Cart</h2>
      {cartItems.length === 0 ? (
        <p className="text-center">Your cart is empty.</p>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.articleName}</td>
                    <td>{CURRENCY_FORMATTER.format(item.salePrice)}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => onUpdateQuantity(item.id, parseNumber(e.target.value))}
                        className="quantity-input"
                      />
                    </td>
                    <td>{CURRENCY_FORMATTER.format(item.salePrice * item.quantity)}</td>
                    <td>
                      <button onClick={() => onRemoveItem(item.id)} className="btn-icon" title="Remove from Cart">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cart-total">
            <h3>Total: {CURRENCY_FORMATTER.format(total)}</h3>
          </div>
        </>
      )}
    </aside>
  );
};

const ItemForm = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    unit: item.unit || '', // Changed from quantity to unit
    articleName: item.articleName || '',
    unitPrice: item.unitPrice || '',
    salePrice: item.salePrice || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.articleName) {
      alert('Article Name is required.');
      return;
    }
    onSave({
      ...item,
      ...formData,
      // unit is now a string, no parsing needed here for the form's unit field
      unitPrice: parseNumber(formData.unitPrice),
      salePrice: parseNumber(formData.salePrice),
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{item.id ? 'Edit Item' : 'Add New Item'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Unit Type {/* Changed label from Quantity (Unit Type) to Unit Type */}
            <input type="text" name="unit" value={formData.unit} onChange={handleChange} /> {/* Changed name and value to unit */}
          </label>
          <label>
            Article Name
            <input type="text" name="articleName" value={formData.articleName} onChange={handleChange} required autoFocus />
          </label>
          <label>
            Unit Cost (PHP)
            <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} min="0" step="0.01" />
          </label>
          <label>
            Sale Price (PHP)
            <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} min="0" step="0.01" />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PasswordPrompt = ({ onPasswordSubmit, onCancel }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onPasswordSubmit(password);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Enter Admin Password</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
