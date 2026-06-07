/**
 * Google Apps Script (Код.gs) для интеграции с Liquid Glass Finance
 * 
 * ИНСТРУКЦИЯ ПО УСТАНОВКЕ:
 * 1. Откройте пустую Google Таблицу.
 * 2. Перейдите в "Расширения" -> "Apps Script" (Extensions -> Apps Script).
 * 3. Удалите весь стандартный код и вставьте содержимое этого файла.
 * 4. Нажмите "Сохранить" (значок дискеты).
 * 5. Нажмите кнопку "Начало развертывания" -> "Новое развертывание" (Deploy -> New deployment).
 * 6. Выберите тип: "Веб-приложение" (Web app).
 * 7. Настройте параметры:
 *    - Описание: "Liquid Glass Finance Backend"
 *    - Запуск от имени: "Вы" (Me)
 *    - У кого есть доступ: "Все" (Anyone) - это важно для беспрепятственного POST/GET!
 * 8. Нажмите "Развернуть" (Deploy). Google попросит авторизовать доступ, разрешите его.
 * 9. Скопируйте полученный URL веб-приложения (это SCRIPT_URL) и вставьте его во фронтенд в `src/App.tsx`.
 */

// Авто-инициализация структуры таблиц
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Лист "Категории"
  var categoriesSheet = ss.getSheetByName("Категории");
  if (!categoriesSheet) {
    categoriesSheet = ss.insertSheet("Категории");
    categoriesSheet.appendRow(["ID", "Название", "Иконка", "Лимит в месяц", "Остаток с прошлого месяца", "Процент (в % или долях)"]);
    categoriesSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f4f6");
  }
  
  // 2. Лист "Расходы"
  var expensesSheet = ss.getSheetByName("Расходы");
  if (!expensesSheet) {
    expensesSheet = ss.insertSheet("Расходы");
    expensesSheet.appendRow(["ID", "Ссылка на категорию", "Сумма", "Дата", "Комментарий"]);
    expensesSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f4f6");
  }
  
  // 3. Лист "Доходы" (Основной)
  var incomesSheet = ss.getSheetByName("Доходы");
  if (!incomesSheet) {
    incomesSheet = ss.insertSheet("Доходы");
    incomesSheet.appendRow(["ID", "Дата", "Тип выплата", "Сумма", "Куда распределено"]);
    incomesSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f4f6");
  }

  // 4. Лист "ДопДоходы" (Дополнительный)
  var addIncomesSheet = ss.getSheetByName("ДопДоходы");
  if (!addIncomesSheet) {
    addIncomesSheet = ss.insertSheet("ДопДоходы");
    addIncomesSheet.appendRow(["ID", "Дата", "Источник", "Сумма", "Куда распределено"]);
    addIncomesSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f4f6");
  }

  // Удаляем стандартный "Лист1", если он пустой и есть другие листы
  var sheet1 = ss.getSheetByName("Лист1") || ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }
}

// Помощник получения заголовков и сопоставления с JSON
function readSheetData(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // Только заголовки или пусто
  
  var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  var values = range.getValues();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var data = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    data.push(item);
  }
  return data;
}

// Запись полных массивов данных (перезапись соответствующих листов с сохранением заголовков)
function writeSheetData(sheet, headers, items, headerMap) {
  if (!sheet) return;
  
  // Принудительно устанавливаем правильные заголовки
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Очищаем всё, кроме первой строки заголовков
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(headers.length, sheet.getLastColumn())).clearContent();
  }
  
  if (!items || items.length === 0) return;
  
  var rows = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var objectKey = headerMap[header] || header;
      var value = item[objectKey];
      
      // Обработка распределения категорий в доходах (массив -> строка через запятую)
      if (objectKey === 'distributedTo' && Array.isArray(value)) {
        value = value.join(',');
      }
      
      row.push(value !== undefined ? value : "");
    }
    rows.push(row);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// Форматирование дат для корректного JSON-парсинга на фронтенде
function formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    var year = dateVal.getFullYear();
    var month = String(dateVal.getMonth() + 1).padStart(2, '0');
    var day = String(dateVal.getDate()).padStart(2, '0');
    return year + "-" + month + "-" + day;
  }
  // Если это строка вида ISO
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  return String(dateVal);
}

// GET-запрос: загрузка данных и автоинициализация
function doGet(e) {
  try {
    initSheets();
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var categoriesSheet = ss.getSheetByName("Категории");
    var expensesSheet = ss.getSheetByName("Расходы");
    var incomesSheet = ss.getSheetByName("Доходы");
    var addIncomesSheet = ss.getSheetByName("ДопДоходы");
    
    var rawCategories = readSheetData(categoriesSheet);
    var rawExpenses = readSheetData(expensesSheet);
    var rawIncomes = readSheetData(incomesSheet);
    var rawAddIncomes = readSheetData(addIncomesSheet);
    
    function cleanStr(val, defaultVal) {
      if (val === undefined || val === null || String(val) === "undefined") return defaultVal;
      return String(val);
    }
    
    // Преобразование типов полей для фронтенда с маппингом русских названий
    var categories = rawCategories.map(function(c) {
      return {
        id: cleanStr(c["ID"], ""),
        name: cleanStr(c["Название"], ""),
        icon: cleanStr(c["Иконка"], "ShoppingCart"),
        monthlyLimit: Number(c["Лимит в месяц"]) || 0,
        rolloverPreviousMonth: Number(c["Остаток с прошлого месяца"]) || 0,
        percentage: Number(((Number(c["Процент (в % или долях)"]) || 0) * 100).toFixed(2))
      };
    });
    
    var expenses = rawExpenses.map(function(e) {
      return {
        id: cleanStr(e["ID"], ""),
        categoryId: cleanStr(e["Ссылка на категорию"], ""),
        amount: Number(e["Сумма"]) || 0,
        date: formatDate(e["Дата"]),
        description: cleanStr(e["Комментарий"], "")
      };
    });
    
    var incomes = [];
    
    // Обработка Основных доходов
    rawIncomes.forEach(function(i) {
      var dist = [];
      var rawDist = i["Куда распределено"];
      if (rawDist && typeof rawDist === 'string' && rawDist.trim() !== '' && rawDist !== 'undefined') {
        dist = rawDist.split(',').map(function(s) { return s.trim(); });
      } else if (rawDist && typeof rawDist === 'number') {
        dist = [String(rawDist)];
      }
      incomes.push({
        id: cleanStr(i["ID"], ""),
        amount: Number(i["Сумма"]) || 0,
        date: formatDate(i["Дата"]),
        description: cleanStr(i["Тип выплата"], ""),
        distributedTo: dist,
        type: 'primary'
      });
    });

    // Обработка ДопДоходов
    rawAddIncomes.forEach(function(i) {
      var dist = [];
      var rawDist = i["Куда распределено"];
      if (rawDist && typeof rawDist === 'string' && rawDist.trim() !== '' && rawDist !== 'undefined') {
        dist = rawDist.split(',').map(function(s) { return s.trim(); });
      } else if (rawDist && typeof rawDist === 'number') {
        dist = [String(rawDist)];
      }
      incomes.push({
        id: cleanStr(i["ID"], ""),
        amount: Number(i["Сумма"]) || 0,
        date: formatDate(i["Дата"]),
        description: cleanStr(i["Источник"], ""),
        distributedTo: dist,
        type: 'additional'
      });
    });
    
    var response = {
      status: "success",
      categories: categories,
      expenses: expenses,
      incomes: incomes
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// POST-запрос: синхронизация и сохранение данных
function doPost(e) {
  try {
    initSheets();
    
    var postData = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var categoriesSheet = ss.getSheetByName("Категории");
    var expensesSheet = ss.getSheetByName("Расходы");
    var incomesSheet = ss.getSheetByName("Доходы");
    var addIncomesSheet = ss.getSheetByName("ДопДоходы");
    
    if (postData.categories) {
      var categoriesToSave = postData.categories.map(function(c) {
        c.sheetPercentage = (Number(c.percentage) || 0) / 100;
        return c;
      });
      writeSheetData(
        categoriesSheet, 
        ["ID", "Название", "Иконка", "Лимит в месяц", "Остаток с прошлого месяца", "Процент (в % или долях)"], 
        categoriesToSave,
        {
          "ID": "id",
          "Название": "name",
          "Иконка": "icon",
          "Лимит в месяц": "monthlyLimit",
          "Остаток с прошлого месяца": "rolloverPreviousMonth",
          "Процент (в % или долях)": "sheetPercentage"
        }
      );
    }
    if (postData.expenses) {
      writeSheetData(
        expensesSheet, 
        ["ID", "Ссылка на категорию", "Сумма", "Дата", "Комментарий"], 
        postData.expenses,
        {
          "ID": "id",
          "Ссылка на категорию": "categoryId",
          "Сумма": "amount",
          "Дата": "date",
          "Комментарий": "description"
        }
      );
    }
    if (postData.incomes) {
      var primaryIncomes = [];
      var addIncomes = [];
      
      postData.incomes.forEach(function(inc) {
        if (inc.type === 'primary') {
          primaryIncomes.push(inc);
        } else {
          addIncomes.push(inc);
        }
      });

      writeSheetData(
        incomesSheet, 
        ["ID", "Дата", "Тип выплата", "Сумма", "Куда распределено"], 
        primaryIncomes,
        {
          "ID": "id",
          "Дата": "date",
          "Тип выплата": "description",
          "Сумма": "amount",
          "Куда распределено": "distributedTo"
        }
      );

      writeSheetData(
        addIncomesSheet, 
        ["ID", "Дата", "Источник", "Сумма", "Куда распределено"], 
        addIncomes,
        {
          "ID": "id",
          "Дата": "date",
          "Источник": "description",
          "Сумма": "amount",
          "Куда распределено": "distributedTo"
        }
      );
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Данные успешно синхронизированы"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

