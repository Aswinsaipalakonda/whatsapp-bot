const { google } = require('googleapis');
require('dotenv').config();

let auth;
try {
  auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json', // Path to your service account key file
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
} catch (e) {
  console.warn("⚠️ Warning: Could not initialize Google Sheets Auth. Please ensure service-account.json is present.");
}

const spreadsheetId = process.env.SPREADSHEET_ID;

// Log or update chat in Google Sheets
async function logToGoogleSheet(phone, name, service, status, isEligible) {
  if (!auth || !spreadsheetId) return;

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Append the row
    // Columns: Timestamp, Phone, Name, Service, Status
    const timestamp = new Date().toLocaleString();
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:E', // Assuming Sheet1
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[timestamp, phone, name || 'Unknown', service, status]],
      },
    });

    // If eligible or not, color code the row
    if (isEligible !== undefined) {
      const updatedRange = response.data.updates.updatedRange; // e.g., 'Sheet1!A5:E5'
      const match = updatedRange.match(/!([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (match) {
        const rowIdx = parseInt(match[2]) - 1; // 0-indexed row
        // Green if eligible, Red if not
        const color = isEligible
          ? { red: 0.8, green: 1.0, blue: 0.8 } // Light Green
          : { red: 1.0, green: 0.8, blue: 0.8 }; // Light Red

        // Fetch the sheet ID first to be safe, but usually Sheet1 is 0
        const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetId = sheetInfo.data.sheets.find(s => s.properties.title === 'Sheet1')?.properties.sheetId || 0;

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: rowIdx,
                    endRowIndex: rowIdx + 1,
                    startColumnIndex: 0,
                    endColumnIndex: 5
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: color,
                    }
                  },
                  fields: 'userEnteredFormat.backgroundColor'
                }
              }
            ]
          }
        });
      }
    }
  } catch (err) {
    console.error('❌ Google Sheets Error:', err.message);
  }
}

module.exports = { logToGoogleSheet };
