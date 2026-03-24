/**
 * Google Sheets Integration
 * Handles storing and retrieving user data
 */

const { google } = require('googleapis');

let sheetsClient = null;
let authClient = null;

/**
 * Initialize Google Sheets client
 */
async function initSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  authClient = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  await authClient.authorize();

  sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  return sheetsClient;
}

/**
 * Get spreadsheet ID
 */
function getSheetId() {
  return process.env.GOOGLE_SHEET_ID;
}

/**
 * Get or create user row
 */
async function getUser(phone) {
  const sheets = await initSheetsClient();
  const sheetId = getSheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:N'
    });

    const rows = response.data.values || [];

    // Find user by phone
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === phone) {
        return {
          rowIndex: i + 1,
          phone: rows[i][0] || '',
          name: rows[i][1] || '',
          dob: rows[i][2] || '',
          pan: rows[i][3] || '',
          stage: rows[i][4] || 'NEW',
          cibilScore: rows[i][5] || '',
          employment: rows[i][6] || '',
          income: rows[i][7] || '',
          loanAmount: rows[i][8] || '',
          existingEmi: rows[i][9] || '',
          eligibility: rows[i][10] || '',
          lastMessageTime: rows[i][11] || '',
          color: rows[i][12] || '',
          paymentId: rows[i][13] || ''
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Create or update user
 */
async function saveUser(phone, data) {
  const sheets = await initSheetsClient();
  const sheetId = getSheetId();

  try {
    // First, try to get existing user
    const existingUser = await getUser(phone);

    const rowData = [
      phone,
      data.name || existingUser?.name || '',
      data.dob || existingUser?.dob || '',
      data.pan || existingUser?.pan || '',
      data.stage || existingUser?.stage || 'NEW',
      data.cibilScore || existingUser?.cibilScore || '',
      data.employment || existingUser?.employment || '',
      data.income || existingUser?.income || '',
      data.loanAmount || existingUser?.loanAmount || '',
      data.existingEmi || existingUser?.existingEmi || '',
      data.eligibility || existingUser?.eligibility || '',
      data.lastMessageTime || new Date().toISOString(),
      data.color || existingUser?.color || '',
      data.paymentId || existingUser?.paymentId || ''
    ];

    if (existingUser) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Sheet1!A${existingUser.rowIndex}:N${existingUser.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Sheet1!A:N',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
    }

    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

/**
 * Get all users for follow-up
 */
async function getInactiveUsers() {
  const sheets = await initSheetsClient();
  const sheetId = getSheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:N'
    });

    const rows = response.data.values || [];
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const inactiveUsers = [];

    for (let i = 1; i < rows.length; i++) {
      const phone = rows[i][0];
      const stage = rows[i][4] || '';
      const lastMessageTime = rows[i][11] || '';

      // Skip if no phone or completed stages
      if (!phone) continue;
      if (stage === 'COMPLETED' || stage === 'CIBIL_DONE') continue;
      if (stage === 'NEW' || stage === '') continue;

      // Check if last message was more than 24 hours ago
      if (lastMessageTime) {
        const lastTimestamp = new Date(lastMessageTime).getTime();
        const elapsed = now - lastTimestamp;

        if (elapsed > twentyFourHours) {
          inactiveUsers.push({
            phone: rows[i][0],
            name: rows[i][1] || 'there',
            stage: rows[i][4] || '',
            lastMessageTime: rows[i][11]
          });
        }
      }
    }

    return inactiveUsers;
  } catch (error) {
    console.error('Error getting inactive users:', error);
    return [];
  }
}

/**
 * Log conversation message
 */
async function logMessage(phone, direction, message) {
  const sheets = await initSheetsClient();
  const sheetId = getSheetId();

  try {
    // Append to ChatLogs sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'ChatLogs!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          new Date().toISOString(),
          phone,
          direction, // 'IN' or 'OUT'
          message
        ]]
      }
    });
    return true;
  } catch (error) {
    // Sheet might not exist yet, that's okay
    console.log('Could not log message (ChatLogs sheet may not exist):', error.message);
    return false;
  }
}

/**
 * Initialize sheets with headers
 */
async function initializeSheets() {
  const sheets = await initSheetsClient();
  const sheetId = getSheetId();

  try {
    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:N1'
    });

    if (!response.data.values || response.data.values.length === 0) {
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Sheet1!A1:N1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[
            'Phone', 'Name', 'DOB', 'PAN', 'Stage', 'CIBIL Score',
            'Employment', 'Income', 'Loan Amount', 'Existing EMI',
            'Eligibility', 'Last Message Time', 'Color', 'Payment ID'
          ]]
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error initializing sheets:', error);
    return false;
  }
}

/**
 * Update eligibility color
 */
async function updateEligibilityColor(phone, isEligible) {
  const sheets = await initSheetsClient();
  const sheetId = getSheetId();

  const user = await getUser(phone);
  if (!user) return false;

  const color = isEligible ? 'GREEN' : 'RED';
  const eligibility = isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE';

  await saveUser(phone, {
    color,
    eligibility
  });

  return true;
}

module.exports = {
  initSheetsClient,
  getUser,
  saveUser,
  getInactiveUsers,
  logMessage,
  initializeSheets,
  updateEligibilityColor
};
