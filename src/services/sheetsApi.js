/**
 * Service to fetch data from Google Sheets
 * ID: 1XsAB-ADnF8xqFOvsW9w9PGDCDI51OJbvYPVyFXTZ9j8
 * Sheet: 2. REGISTRO 1RA ETAPA - (NO INFOS)
 */

const SHEET_ID = '1XsAB-ADnF8xqFOvsW9w9PGDCDI51OJbvYPVyFXTZ9j8';
const SHEET_NAME = '2. REGISTRO 1RA ETAPA - (NO INFOS)';

// Replace this with your deployed Apps Script URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGuwS1D2IjGkXZdXZnfj9Mc75xNtKcPpMDDYHMT55VYPl5uu4G1IM5Di6Grkcy16Rerg/exec';

export const fetchSheetData = async () => {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
        const response = await fetch(url);
        const text = await response.text();
        const jsonData = JSON.parse(text.substring(47).slice(0, -2));

        const cols = jsonData.table.cols.map(c => (c.label || c.id || '').trim());
        const rows = jsonData.table.rows.map(row => {
            const item = {};
            row.c.forEach((cell, i) => {
                const colName = cols[i];
                if (colName) {
                    item[colName] = cell ? cell.v : null;
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

export const updateSheetRow = async (id, updates) => {
    if (!APPS_SCRIPT_URL) {
        console.warn("Sheets API: APPS_SCRIPT_URL not configured. Changes saved locally only.");
        return;
    }

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updates })
        });
        return { status: 'success' };
    } catch (error) {
        console.error("Error updating Google Sheet row:", error);
        throw error;
    }
};
