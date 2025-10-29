# Hardware Supplies Pricebook

A desktop application for managing hardware supplies pricebook items, built with Electron, React, and Vite.

## Features

*   **CRUD Table:** Add, edit, and delete pricebook items.
*   **Search and Sort:** Easily find and organize items.
*   **Shopping Cart:** Add items from the pricebook to a temporary cart to calculate a total sale price.
*   **CSV Import/Export:** Import and export pricebook data using CSV files.
*   **Persistence:** Data is persisted using `localStorage` (default) or an optional JSON file adapter for Electron.
*   **Keyboard Shortcuts:**
    *   `Ctrl/Cmd+N`: New Item
    *   `Ctrl/Cmd+F`: Focus Search
    *   `Ctrl/Cmd+I`: Import CSV
    *   `Ctrl/Cmd+E`: Export CSV
*   **Desktop Polish:** Persists window size and position, includes an app menu, and an About dialog.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone [repository-url]
    cd hardware-supplies-pricebook
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application

### Development Mode

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

This will start the Vite development server and then launch the Electron app.

### Production Build

To create a production build for your operating system:

```bash
npm run build
```

This will first build the React frontend with Vite, then package the Electron application using `electron-builder`. The output will be in the `dist_electron` directory.

### Starting the Built Application

After building, you can start the Electron application directly:

```bash
npm start
```

## Project Structure

*   `electron/`: Contains the main and preload scripts for Electron.
*   `src/`: React source code for the user interface.
    *   `App.jsx`: Main React component with all UI and logic.
    *   `main.jsx`: React entry point.
    *   `styles.css`: Application styling.
*   `public/`: Static assets.
*   `build/`: Build resources (e.g., icons).
*   `dist/`: Output of the Vite build (frontend).
*   `dist_electron/`: Output of the Electron-builder build (desktop app).

## CSV Format

When importing or exporting CSV files, please use the following exact header format:

`"Article Name,Unit,Unit Price,Sale Price"`

Example:

```csv
Article Name,Unit,Unit Price,Sale Price
Hammer,pcs,150.00,200.00
Nails,box,50.00,75.00
```

## License

[MIT License or other appropriate license]
