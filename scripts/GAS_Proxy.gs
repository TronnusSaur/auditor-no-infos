/**
 * Google Apps Script Proxy for Dashboard Persistence
 * 
 * Deployment Instructions:
 * 1. Open your Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this code and save
 * 4. Deploy > New Deployment > Web App
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Copy the Web App URL for the dashboard config
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { id, updates } = data;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('2. REGISTRO 1RA ETAPA - (NO INFOS)');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    
    // Normalized headers (trimmed and uppercase)
    const normHeaders = headers.map(h => String(h || '').trim().toUpperCase());

    // Find column index for ID
    const idColIndex = normHeaders.indexOf('ID');
    if (idColIndex === -1) throw new Error('Column ID not found');
    
    // Find row by ID
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
        const rowId = String(rows[i][idColIndex]).trim();
        if (rowId === String(id).trim()) {
            rowIndex = i + 1; // 1-indexed for sheets
            break;
        }
    }
    
    if (rowIndex === -1) throw new Error('Record with ID ' + id + ' not found');
    
    // Process updates
    for (let colName in updates) {
        let targetCol = colName.trim().toUpperCase();
        
        // Handle the ROFUNDIDA typo or missing letters in headers
        let colIndex = normHeaders.indexOf(targetCol);
        
        // Final fallback: if target is PROFUNDIDAD, also try finding ROFUNDIDA
        if (colIndex === -1 && targetCol === 'PROFUNDIDAD') {
            colIndex = normHeaders.findIndex(h => h.includes('ROFUNDIDA'));
        }

        if (colIndex !== -1) {
            sheet.getRange(rowIndex, colIndex + 1).setValue(updates[colName]);
        }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
