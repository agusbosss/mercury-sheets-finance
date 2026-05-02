// =====================================================================
// MERCURY SYNC - Polling automático + sync inicial
// =====================================================================
// Setup:
// 1. Script Properties > MERCURY_API_KEY (con prefijo "secret-token:")
// 2. Corré syncAllTransactions() una vez para importar el historial completo
// 3. Corré setupPollingTrigger() una vez para activar el polling automático

var CHECKING_ACCOUNT_ID = PropertiesService.getScriptProperties().getProperty("MERCURY_ACCOUNT_ID");
var ACCOUNT_START_DATE = PropertiesService.getScriptProperties().getProperty("ACCOUNT_START_DATE") || "2025-01-01";

// =====================================================================
// POLLING — se ejecuta automáticamente cada 10 minutos
// =====================================================================

function pollNewTransactions() {
  var apiKey = PropertiesService.getScriptProperties().getProperty("MERCURY_API_KEY");
  if (!apiKey) { Logger.log("Falta MERCURY_API_KEY."); return; }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) { Logger.log("Hoja Transactions no encontrada."); return; }

  // Buscar transacciones desde hace 2 días (margen para transacciones que tardan en postearse)
  var desde = new Date();
  desde.setDate(desde.getDate() - 2);
  var desdeStr = Utilities.formatDate(desde, "UTC", "yyyy-MM-dd");

  var url = "https://api.mercury.com/api/v1/account/" + CHECKING_ACCOUNT_ID +
            "/transactions?limit=500&order=asc&start=" + desdeStr;

  var response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + apiKey },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    Logger.log("Error API Mercury: " + response.getContentText());
    return;
  }

  var transactions = JSON.parse(response.getContentText()).transactions;
  if (!transactions || transactions.length === 0) return;

  // IDs ya existentes en el sheet
  var existingIds = getExistingIds(sheet);

  var nuevas = 0;
  transactions.forEach(function(t) {
    if (t.status !== "sent") return;
    if (existingIds.indexOf(t.id) === -1) {
      appendRow(sheet, t);
      nuevas++;
    }
  });

  if (nuevas > 0) Logger.log("Polling: " + nuevas + " transacciones nuevas agregadas.");
  else Logger.log("Polling: sin transacciones nuevas.");
}

// =====================================================================
// SYNC COMPLETO — correr manualmente una sola vez para importar historial
// =====================================================================

function syncAllTransactions() {
  var apiKey = PropertiesService.getScriptProperties().getProperty("MERCURY_API_KEY");
  if (!apiKey) { Logger.log("Falta MERCURY_API_KEY."); return; }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) { Logger.log("Hoja Transactions no encontrada."); return; }

  var url = "https://api.mercury.com/api/v1/account/" + CHECKING_ACCOUNT_ID +
            "/transactions?limit=500&order=asc&start=" + ACCOUNT_START_DATE;

  var response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + apiKey },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    Logger.log("Error API Mercury: " + response.getContentText());
    return;
  }

  var transactions = JSON.parse(response.getContentText()).transactions;
  if (!transactions || transactions.length === 0) { Logger.log("Sin transacciones."); return; }

  var existingIds = getExistingIds(sheet);
  var nuevas = 0;

  transactions.forEach(function(t) {
    if (t.status !== "sent") return;
    if (existingIds.indexOf(t.id) === -1) {
      appendRow(sheet, t);
      nuevas++;
    }
  });

  Logger.log("Sync completo: " + nuevas + " transacciones nuevas de " + transactions.length + " totales.");
}

// =====================================================================
// TRIGGER — instalar/desinstalar polling automático
// =====================================================================

function setupPollingTrigger() {
  // Eliminar triggers previos de pollNewTransactions para no duplicar
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "pollNewTransactions") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("pollNewTransactions")
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log("Trigger de polling instalado: cada 10 minutos.");
}

function removePollingTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "pollNewTransactions") {
      ScriptApp.deleteTrigger(trigger);
      Logger.log("Trigger eliminado.");
    }
  });
}

// =====================================================================
// HELPERS
// =====================================================================

function getExistingIds(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, COL.ID, lastRow - 1, 1).getValues().flat();
}
