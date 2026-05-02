// =====================================================================
// TRIGGERS.gs
// onEdit: actualiza proporciones cuando cambia el dropdown Distribución
// appendRow: usado por MercurySync.gs para escribir transacciones nuevas
// =====================================================================

var TRANSACTIONS_SHEET = "Transactions";
var DISTRIBUCIONES_SHEET = "Distribuciones";

// Columns: A=ID B=Fecha C=Comercio D=Desc banco E=Monto F=Categoría G=Estado H=Distribución I=Fran J=Facu K=Agus L=Tipo
var COL = { ID:1, FECHA:2, COMERCIO:3, DESC:4, MONTO:5, CATEGORIA:6, ESTADO:7, DIST:8, FRAN:9, FACU:10, AGUS:11, TIPO:12 };

// =====================================================================
// ON EDIT — simple trigger, se activa automáticamente sin instalación
// =====================================================================

function onEdit(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== TRANSACTIONS_SHEET) return;

  var startCol = e.range.getColumn();
  var endCol = startCol + e.range.getNumColumns() - 1;
  if (startCol > COL.DIST || endCol < COL.DIST) return;

  var startRow = e.range.getRow();
  var numRows = e.range.getNumRows();
  if (startRow <= 1) return;

  var dataStartRow = Math.max(startRow, 2);
  var dataNumRows = numRows - (dataStartRow - startRow);
  if (dataNumRows <= 0) return;

  var distMap = getDistribuciones();
  var distValues = sheet.getRange(dataStartRow, COL.DIST, dataNumRows, 1).getValues();

  for (var i = 0; i < dataNumRows; i++) {
    var row = dataStartRow + i;
    var distName = distValues[i][0];
    if (!distName) continue;

    var props = distMap[distName];
    if (!props) continue; // nombre no encontrado → no tocar (permite entrada manual)

    sheet.getRange(row, COL.FRAN, 1, 3).setValues([[props.fran, props.facu, props.agus]]);
  }
}

// =====================================================================
// APPEND ROW — usado por MercurySync.gs al escribir transacciones nuevas
// =====================================================================

function appendRow(sheet, t) {
  var fecha = t.postedAt ? t.postedAt.substring(0, 10) : t.createdAt.substring(0, 10);
  var categoria = t.categoryData ? t.categoryData.name : (t.mercuryCategory || "");

  var distMap = getDistribuciones();
  var defaultDist = distMap["Equitativa"] || { fran: 1/3, facu: 1/3, agus: 1/3 };

  sheet.appendRow([
    t.id,
    fecha,
    t.counterpartyName || "",
    t.bankDescription || "",
    t.amount,
    categoria,
    t.status,
    "Equitativa",
    defaultDist.fran,
    defaultDist.facu,
    defaultDist.agus,
    t.kind || ""
  ]);

  sheet.getRange(sheet.getLastRow(), COL.MONTO).setNumberFormat("$#,##0.00");
}

// =====================================================================
// GET DISTRIBUCIONES — lee la hoja y devuelve { nombre: {fran, facu, agus} }
// =====================================================================

function getDistribuciones() {
  var distSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DISTRIBUCIONES_SHEET);
  if (!distSheet) return {};

  var lastRow = distSheet.getLastRow();
  if (lastRow < 2) return {};

  var map = {};
  distSheet.getRange(2, 1, lastRow - 1, 4).getValues().forEach(function(row) {
    if (row[0]) map[row[0]] = { fran: row[1], facu: row[2], agus: row[3] };
  });

  return map;
}
