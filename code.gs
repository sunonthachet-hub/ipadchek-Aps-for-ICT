/**
 * Google Apps Script for ICT Inventory System
 * Version 2.0 - Normalized Database
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  try {
    switch (action) {
      case 'getProducts':
        return jsonResponse(getProductsData(ss));
      case 'getCategories':
        return jsonResponse(getSheetData(ss, 'Categories'));
      case 'getStats':
        return jsonResponse(getDashboardStats(ss));
      case 'getMembers':
        return jsonResponse({
          students: getSheetData(ss, 'Students'),
          teachers: getSheetData(ss, 'Teachers')
        });
      default:
        return jsonResponse({ error: 'Invalid action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  try {
    switch (data.action) {
      case 'borrow':
        return jsonResponse(handleBorrow(ss, data));
      case 'return':
        return jsonResponse(handleReturn(ss, data));
      case 'reportIssue':
        return jsonResponse(handleReportIssue(ss, data));
      default:
        return jsonResponse({ error: 'Invalid action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// --- Helper Functions ---

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
}

function getProductsData(ss) {
  const products = getSheetData(ss, 'Products');
  const categories = getSheetData(ss, 'Categories');
  
  // Join Products with Categories
  return products.map(p => {
    const cat = categories.find(c => c.categoryId === p.categoryId) || {};
    return { ...p, categoryDetails: cat };
  });
}

function getDashboardStats(ss) {
  const products = getSheetData(ss, 'Products');
  const transactions = getSheetData(ss, 'Transactions');
  
  return {
    total: products.length,
    available: products.filter(p => p.status === 'Available').length,
    borrowed: products.filter(p => p.status === 'Borrowed').length,
    maintenance: products.filter(p => p.status === 'Maintenance').length,
    overdue: transactions.filter(t => t.status === 'Overdue').length
  };
}

function handleBorrow(ss, data) {
  const transSheet = ss.getSheetByName('Transactions');
  const prodSheet = ss.getSheetByName('Products');
  
  // 1. Add Transaction
  // data should contain: fid, fname, snDevice, borrowDate, borrowTime, dueDate, recorder
  const borrowerId = 'TX-' + new Date().getTime();
  transSheet.appendRow([
    borrowerId, 
    data.fid, 
    data.fname, 
    data.snDevice, 
    data.borrowDate, 
    data.borrowTime, 
    data.dueDate, 
    '', // returnDate
    data.recorder, 
    'Active'
  ]);
  
  // 2. Update Product Status
  updateStatus(prodSheet, 'productId', data.snDevice, 'Borrowed');
  
  return { success: true, borrowerId: borrowerId };
}

function handleReturn(ss, data) {
  const transSheet = ss.getSheetByName('Transactions');
  const prodSheet = ss.getSheetByName('Products');
  
  // 1. Update Transaction
  const transData = transSheet.getDataRange().getValues();
  const headers = transData[0];
  const snCol = headers.indexOf('snDevice');
  const statusCol = headers.indexOf('status');
  const returnDateCol = headers.indexOf('returnDate');
  
  for (let i = 1; i < transData.length; i++) {
    if (transData[i][snCol] === data.snDevice && transData[i][statusCol] === 'Active') {
      transSheet.getRange(i + 1, returnDateCol + 1).setValue(new Date().toLocaleDateString('th-TH'));
      transSheet.getRange(i + 1, statusCol + 1).setValue('Returned');
      break;
    }
  }
  
  // 2. Update Product Status
  updateStatus(prodSheet, 'productId', data.snDevice, 'Available');
  
  return { success: true };
}

function updateStatus(sheet, idColName, idValue, newStatus) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf(idColName);
  const statusCol = headers.indexOf('status');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === idValue) {
      sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
      return true;
    }
  }
  return false;
}
