/**
 * Service to fetch data from Google Sheets
 * ID: 1XsAB-ADnF8xqFOvsW9w9PGDCDI51OJbvYPVyFXTZ9j8
 * Sheet: 2. REGISTRO 1RA ETAPA - (NO INFOS)
 */

const SHEET_ID = '1XsAB-ADnF8xqFOvsW9w9PGDCDI51OJbvYPVyFXTZ9j8';
const SHEET_NAME = '2. REGISTRO 1RA ETAPA - (NO INFOS)';

export const fetchSheetData = async () => {
    try {
        // Using the public CSV export for simplicity if the sheet is public
        // Otherwise, a proper API key would be needed for the Google Sheets API
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

        const response = await fetch(url);
        const text = await response.text();

        // The gviz API returns a JSON-like string wrapped in a function call
        const jsonData = JSON.parse(text.substring(47).slice(0, -2));

        const cols = jsonData.table.cols.map(c => c.label || c.id);
        const rows = jsonData.table.rows.map(row => {
            const item = {};
            row.c.forEach((cell, i) => {
                const colName = cols[i];
                if (colName) {
                    item[colName] = cell ? cell.v : null;
                    // Check for row formatting (red background) if available in metadata
                    // Note: gviz doesn't always provide full CSS, but we can check for specific values 
                    // or flags if the user provides a "status" column.
                    // For now, we'll look for a common pattern or await user clarification on "red rows".
                    if (cell && cell.p && cell.p.style &&
                        (cell.p.style.includes('background-color:#f4cccc') || cell.p.style.includes('background-color:#ff0000'))) {
                        item._isRed = true;
                    }
                }
            });
            return item;
        });

        return rows;
    } catch (error) {
        console.error("Error fetching Google Sheet data:", error);
        throw error;
    }
};
