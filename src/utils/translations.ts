export interface TranslationKeys {
  // Navigation & Headers
  appName: string;
  activePeriodLabel: string;
  selectPeriodChevron: string;
  navOverview: string;
  navExpenses: string;
  navIncome: string;

  // Alerts & Notifications
  limitExceededTitle: string;
  limitExceededDesc: (desc: string, amount: string, remaining: string, category: string) => string;
  confirmDeleteExpense: string;
  confirmDeleteIncome: string;
  toastCurrencyUpdated: (currency: string) => string;
  toastLanguageUpdated: (langName: string) => string;
  alertInputAmount: string;
  alertInputCategory: string;
  alertInputIncomeAmount: string;
  alertDistributionCategory: string;

  // Modals & General UI
  periodModalTitle: string;
  yearSuffix: string;
  settingsModalTitle: string;
  settingsModalDesc: string;
  currencySectionTitle: string;
  languageSectionTitle: string;

  // Core Finance Dashboard
  totalRemainingBalance: string;
  monthlyLimits: string;
  additionalIncome: string;
  monthlyExpenses: string;
  previousPeriodRoll: string;
  categorySummaryHeader: string;
  addCategoryButton: string;

  // Category view card details
  remainingTotal: string;
  expensesLabel: string;
  limitLabel: string;
  pastLabel: string;
  additionalLabel: string;
  freeLabel: string;

  // Category configuration / edit modals
  editCategoryTitle: string;
  editCategoryModalTitle: string;
  monthlyLimitLabel: string;
  monthlyLimitInputLabel: string;
  rolloverLabel: string;
  rolloverInputLabel: string;
  rolloverInputHelp: string;
  rolloverDesc: string;
  deleteBtn: string;
  saveBtn: string;

  // Add Category
  newCategoryModalTitle: string;
  categoryNameLabel: string;
  categoryNameInputLabel: string;
  categoryNameInputPlaceholder: string;
  limitInputLabel: string;
  pastRolloverInputLabel: string;
  chooseIconLabel: string;
  addCategorySubmitBtn: string;
  confirmDeleteCategory: string;
  rolloverNegativeWarning: string;

  // Fallbacks
  noDescription: string;
  noCategory: string;
  noCategoryAlternative: string;

  // Expenses Tab Detailed
  expensesListDesc: string;
  addExpenseBtn: string;
  searchPlaceholder: string;
  noExpensesFound: string;
  noExpensesFoundHelp: string;
  noSearchResults: string;
  noSearchResultsHelp: string;
  deleteExpenseBtnTitle: string;
  newExpenseModalTitle: string;
  expenseAmountInputLabel: string;
  categoryLabel: string;
  chooseCategoryPlaceholder: string;
  dateLabel: string;
  expenseDescInputLabel: string;
  expenseDescInputPlaceholder: string;
  addExpenseSubmitBtn: string;

  // Income Tab Detailed
  addIncomeHeaderTitle: string;
  addIncomeHeaderDesc: string;
  incomeAmountInputLabel: string;
  incomeAmountInputPlaceholder: string;
  dateOfDepositLabel: string;
  sourceInputLabel: string;
  sourceInputPlaceholder: string;
  whereToDistributeLabel: string;
  selectAllBtn: string;
  deselectAllBtn: string;
  previewDistributionTitle: string;
  previewDistributionDesc: (amountSum: string, count: number, share: string, period: string) => string;
  distributeIncomeSubmitBtn: string;
  incomeHistoryTitle: string;
  noIncomeHistory: string;
  noIncomeHistoryHelp: string;
  deleteIncomeBtnTitle: string;
  distributionSharesPrefix: (size: number) => string;

  // Theme & Sync Settings
  themeSectionTitle: string;
  themeModeDark: string;
  themeModeLight: string;
  themeModeSystem: string;
  firebaseSectionTitle: string;
  firebaseStatusLabel: string;
  firebaseLinked: string;
  firebaseLocalMode: string;
  firebaseLinkedDesc: string;
  firebaseLocalDesc: string;
  firebaseSignInBtn: string;
  firebaseSignOutBtn: string;
  toastThemeUpdated: (themename: string) => string;
  syncBannerPending: string;
  syncBannerSuccess: string;
}

export type LanguageCode = 'RU' | 'EN';

export const TRANSLATIONS: Record<LanguageCode, TranslationKeys> = {
  RU: {
    appName: 'Glass Finance',
    activePeriodLabel: 'активный период расчетов',
    selectPeriodChevron: 'выбрать период ▾',
    navOverview: 'Обзор',
    navExpenses: 'Расходы',
    navIncome: 'Доходы',
    limitExceededTitle: 'Лимит превышен!',
    limitExceededDesc: (desc, amount, remaining, category) =>
      `Расход "${desc}" на сумму ${amount} превышает доступный «Остаток_Всего» (${remaining}) по категории "${category}".`,
    confirmDeleteExpense: 'Вы уверены, что хотите удалить этот расход?',
    confirmDeleteIncome:
      'Вы уверены, что хотите удалить этот доход? Связанные вливания в категории автоматически пересчитаются.',
    toastCurrencyUpdated: (currency) => `Валюта успешно изменена на ${currency}`,
    toastLanguageUpdated: (langName) => `Язык интерфейса изменен на ${langName}`,
    alertInputAmount: 'Пожалуйста, введите корректную сумму больше нуля.',
    alertInputCategory: 'Пожалуйста, выберите категорию из списка.',
    alertInputIncomeAmount: 'Пожалуйста, введите корректную сумму дохода больше нуля.',
    alertDistributionCategory: 'Пожалуйста, выберите хотя бы одну категорию для распределения.',
    periodModalTitle: 'Выбор периода',
    yearSuffix: ' год',
    settingsModalTitle: 'Настройки приложения',
    settingsModalDesc:
      'Настройте язык интерфейса и основную валюту для ведения финансового учета. Все расчеты, лимиты и остатки переформатируются автоматически.',
    currencySectionTitle: 'Валюта учета',
    languageSectionTitle: 'Язык интерфейса',
    totalRemainingBalance: 'Общий остаток',
    monthlyLimits: 'Лимиты месяца',
    additionalIncome: 'Доп. доходы',
    monthlyExpenses: 'Траты месяца',
    previousPeriodRoll: 'Прошлый период',
    categorySummaryHeader: 'Сводка по категориям',
    addCategoryButton: 'Категория',
    remainingTotal: 'Остаток всего',
    expensesLabel: 'Траты',
    limitLabel: 'Лимит',
    pastLabel: 'Прошлое',
    additionalLabel: 'Доп.доход',
    freeLabel: 'Свободно',
    editCategoryTitle: 'Настройка категории',
    editCategoryModalTitle: 'Редактировать бюджет',
    monthlyLimitLabel: 'Месячный лимит',
    monthlyLimitInputLabel: 'Доля (%)',
    rolloverLabel: 'Ролловер с прошлого месяца',
    rolloverInputLabel: 'Ролловер с прошлого месяца',
    rolloverInputHelp: 'Сумма остатка с прошлого месяца. Может быть положительной (профицит) или отрицательной (перерасход).',
    rolloverDesc:
      'Сумма остатка, неиспользованная ранее. Может быть положительной (профицит) или отрицательной (долг/перерасход).',
    deleteBtn: 'Удалить',
    saveBtn: 'Сохранить',
    newCategoryModalTitle: 'Новая категория',
    categoryNameLabel: 'Название категории',
    categoryNameInputLabel: 'Название категории',
    categoryNameInputPlaceholder: 'Например, Продукты, Такси...',
    limitInputLabel: 'Доля (%)',
    pastRolloverInputLabel: 'Ролловер прошлой даты',
    chooseIconLabel: 'Выберите иконку категории',
    addCategorySubmitBtn: 'ДОБАВИТЬ',
    confirmDeleteCategory:
      'Вы уверены, что хотите удалить эту категорию? Связанные расходы все еще будут отображаться в списке расходов, но пропадут из расчетов по категориям.',
    rolloverNegativeWarning: 'Внимание: отрицательный ролловер уменьшает общий бюджет категории!',
    noDescription: 'Без описания',
    noCategory: 'Без категории',
    noCategoryAlternative: 'Удаленная категория',
    expensesListDesc: 'История трат со сворачиванием по месяцам',
    addExpenseBtn: '+ Трата',
    searchPlaceholder: 'Поиск по описанию или категории...',
    noExpensesFound: 'Нет зафиксированных расходов',
    noExpensesFoundHelp: 'Нажмите «+ Трата», чтобы внести первый расход.',
    noSearchResults: 'Ничего не найдено',
    noSearchResultsHelp: 'Попробуйте изменить запрос поисковой фразы.',
    deleteExpenseBtnTitle: 'Удалить расход',
    newExpenseModalTitle: 'Новый расход',
    expenseAmountInputLabel: 'Сумма расхода',
    categoryLabel: 'Категория',
    chooseCategoryPlaceholder: 'Выберите категорию из списка',
    dateLabel: 'Дата',
    expenseDescInputLabel: 'Описание расхода',
    expenseDescInputPlaceholder: 'Например, Обед в ресторане, Покупки...',
    addExpenseSubmitBtn: '+ ДОБАВИТЬ',
    addIncomeHeaderTitle: 'Зачислить доп. доход',
    addIncomeHeaderDesc: 'Введенный доход будет автоматически и поровну распределен на все выбранные категории бюджетов.',
    incomeAmountInputLabel: 'Сумма дохода',
    incomeAmountInputPlaceholder: 'Пример: 15000.00',
    dateOfDepositLabel: 'Дата зачисления',
    sourceInputLabel: 'Источник / Описание',
    sourceInputPlaceholder: 'Например, Подработка, Премия, Фриланс...',
    whereToDistributeLabel: 'Куда распределить',
    selectAllBtn: 'Выбрать все',
    deselectAllBtn: 'Снять всё',
    previewDistributionTitle: 'Предпросмотр распределения:',
    previewDistributionDesc: (amountSum, count, share, period) => {
      const getPluralFormLocal = (c: number) => {
        if (c % 10 === 1 && c % 100 !== 11) {
          return 'выбранную категорию';
        }
        if ([2, 3, 4].includes(c % 10) && ![12, 13, 14].includes(c % 100)) {
          return 'выбранные категории';
        }
        return 'выбранных категорий';
      };
      return `Сумма ${amountSum} делится поровну на ${count} ${getPluralFormLocal(count)}. Каждой категории достанется по ${share} к бюджету на ${period}.`;
    },
    distributeIncomeSubmitBtn: 'Распределить доход',
    incomeHistoryTitle: 'История зачислений',
    noIncomeHistory: 'История зачислений пуста',
    noIncomeHistoryHelp: 'Внесите данные выше, чтобы настроить доп. средства.',
    deleteIncomeBtnTitle: 'Удалить начисление',
    distributionSharesPrefix: (size) => {
      const getPluralFormShares = (s: number) => {
        return s === 1 ? 'направление' : [2, 3, 4].includes(s % 10) && ![12, 13, 14].includes(s % 100) ? 'направления' : 'направлений';
      };
      return `Доли распределения (${size} ${getPluralFormShares(size)}):`;
    },
    themeSectionTitle: 'Тема оформления',
    themeModeDark: 'Абсолютно темная (OLED)',
    themeModeLight: 'Светлая',
    themeModeSystem: 'Автоматически',
    firebaseSectionTitle: 'Синхронизация Google Таблиц',
    firebaseStatusLabel: 'Состояние:',
    firebaseLinked: 'Таблица подключена',
    firebaseLocalMode: 'Локальный режим (на устройстве)',
    firebaseLinkedDesc: 'Все ваши лимиты, доходы и расходы автоматически выгружаются и транслируются в вашу личную Google Таблицу.',
    firebaseLocalDesc: 'Вся финансовая информация хранится только в браузере. Задайте SCRIPT_URL в коде, чтобы включить облачную синхронизацию.',
    firebaseSignInBtn: 'Синхронизировать сейчас',
    firebaseSignOutBtn: 'Локальный режим',
    toastThemeUpdated: (theme) => `Тема оформления изменена на ${theme}`,
    syncBannerPending: 'Изменения сохранены на устройстве. Идет синхронизация с таблицей...',
    syncBannerSuccess: 'Данные в Google Таблице успешно обновлены!'
  },
  EN: {
    appName: 'Glass Finance',
    activePeriodLabel: 'active billing period',
    selectPeriodChevron: 'select period ▾',
    navOverview: 'Overview',
    navExpenses: 'Expenses',
    navIncome: 'Incomes',
    limitExceededTitle: 'Limit Exceeded!',
    limitExceededDesc: (desc, amount, remaining, category) =>
      `Expense "${desc}" of ${amount} exceeds the available "Total Remaining" (${remaining}) for category "${category}".`,
    confirmDeleteExpense: 'Are you sure you want to delete this expense?',
    confirmDeleteIncome:
      'Are you sure you want to delete this income? Associated category allocations will be recalculated automatically.',
    toastCurrencyUpdated: (currency) => `Currency successfully changed to ${currency}`,
    toastLanguageUpdated: (langName) => `Interface language changed to ${langName}`,
    alertInputAmount: 'Please enter a valid amount greater than zero.',
    alertInputCategory: 'Please select a category from the selection picker.',
    alertInputIncomeAmount: 'Please enter a valid income amount greater than zero.',
    alertDistributionCategory: 'Please select at least one category to distribute the funds.',
    periodModalTitle: 'Select Period',
    yearSuffix: '',
    settingsModalTitle: 'App Settings',
    settingsModalDesc:
      'Configure the interface language and the primary currency for financial tracking. All calculations, limits, and remnants will be automatically updated.',
    currencySectionTitle: 'Default Currency',
    languageSectionTitle: 'Interface Language',
    totalRemainingBalance: 'Total Balance',
    monthlyLimits: 'Monthly Limits',
    additionalIncome: 'Add. Incomes',
    monthlyExpenses: 'Monthly Expenses',
    previousPeriodRoll: 'Prev. Period',
    categorySummaryHeader: 'Category Summaries',
    addCategoryButton: 'Category',
    remainingTotal: 'Total Remaining',
    expensesLabel: 'Spent',
    limitLabel: 'Limit',
    pastLabel: 'Past',
    additionalLabel: 'Add.Income',
    freeLabel: 'Free',
    editCategoryTitle: 'Configure Category',
    editCategoryModalTitle: 'Edit Budget',
    monthlyLimitLabel: 'Monthly Limit',
    monthlyLimitInputLabel: 'Allocation (%)',
    rolloverLabel: 'Previous Month Rollover',
    rolloverInputLabel: 'Previous Month Rollover',
    rolloverInputHelp: 'The remaining balance from the previous month. Can be positive (surplus) or negative (deficit).',
    rolloverDesc:
      'Unused balance carried over. Can be positive (savings surplus) or negative (deficit/overrun from last month).',
    deleteBtn: 'Delete',
    saveBtn: 'Save Changes',
    newCategoryModalTitle: 'New Category',
    categoryNameLabel: 'Category Name',
    categoryNameInputLabel: 'Category Name',
    categoryNameInputPlaceholder: 'e.g. Groceries, Restaurants...',
    limitInputLabel: 'Allocation (%)',
    pastRolloverInputLabel: 'Past Rollover',
    chooseIconLabel: 'Select Category Icon',
    addCategorySubmitBtn: 'ADD',
    confirmDeleteCategory:
      'Are you sure you want to delete this category? Associated expenses remain in the list but will be omitted from sums.',
    rolloverNegativeWarning: 'Warning: negative rollover reduces the total budget of this category!',
    noDescription: 'No description',
    noCategory: 'No category',
    noCategoryAlternative: 'Deleted Category',
    expensesListDesc: 'Expenses history with collapsible months',
    addExpenseBtn: '+ Expense',
    searchPlaceholder: 'Search descriptions or categories...',
    noExpensesFound: 'No expenses recorded yet',
    noExpensesFoundHelp: 'Click "+ Expense" to record your first transaction.',
    noSearchResults: 'No matching records',
    noSearchResultsHelp: 'Try refining or changing your search term.',
    deleteExpenseBtnTitle: 'Delete expense',
    newExpenseModalTitle: 'New Expense',
    expenseAmountInputLabel: 'Expense Amount',
    categoryLabel: 'Category',
    chooseCategoryPlaceholder: 'Select a category from the list',
    dateLabel: 'Date',
    expenseDescInputLabel: 'Expense Description',
    expenseDescInputPlaceholder: 'e.g. Lunch, Groceries, Clothes...',
    addExpenseSubmitBtn: '+ ADD',
    addIncomeHeaderTitle: 'Record Add. Income',
    addIncomeHeaderDesc: 'Vetted income will be shared automatically & equally to budgeted sums of selected categories.',
    incomeAmountInputLabel: 'Income Amount',
    incomeAmountInputPlaceholder: 'e.g. 15000.00',
    dateOfDepositLabel: 'Date of Deposit',
    sourceInputLabel: 'Source / Description',
    sourceInputPlaceholder: 'e.g. Freelance, Bonus, Salary...',
    whereToDistributeLabel: 'Where to distribute',
    selectAllBtn: 'Select All',
    deselectAllBtn: 'Deselect All',
    previewDistributionTitle: 'Distribution preview:',
    previewDistributionDesc: (amountSum, count, share, period) => {
      const categoryWord = count === 1 ? 'selected category' : 'selected categories';
      return `The sum of ${amountSum} splits equally among ${count} ${categoryWord}. Each category receives ${share} for ${period}.`;
    },
    distributeIncomeSubmitBtn: 'Distribute Income',
    incomeHistoryTitle: 'Income History Ledger',
    noIncomeHistory: 'No additional income recorded',
    noIncomeHistoryHelp: 'Record entries above to feed categories with extra budget funds.',
    deleteIncomeBtnTitle: 'Delete income allotment',
    distributionSharesPrefix: (size) => {
      const shareWord = size === 1 ? 'share' : 'shares';
      return `Distribution shares (${size} ${shareWord}):`;
    },
    themeSectionTitle: 'Visual Theme',
    themeModeDark: 'Pure Pitch Black (OLED)',
    themeModeLight: 'Light Slate',
    themeModeSystem: 'System Preferable',
    firebaseSectionTitle: 'Google Sheets Sync',
    firebaseStatusLabel: 'Sync status:',
    firebaseLinked: 'Spreadsheet Linked',
    firebaseLocalMode: 'Local mode (on device)',
    firebaseLinkedDesc: 'All limits, incomes, and expenses are auto-backed up and synchronized with your Google Spreadsheet.',
    firebaseLocalDesc: 'All financial data resides locally on this browser. Specify SCRIPT_URL in the code to enable automatic cloud backup.',
    firebaseSignInBtn: 'Sync Now',
    firebaseSignOutBtn: 'Local Mode',
    toastThemeUpdated: (theme) => `Visual theme successfully updated to ${theme}`,
    syncBannerPending: 'Changes saved locally. Syncing with spreadsheet...',
    syncBannerSuccess: 'Google Sheets data successfully synchronized!'
  }
};

// Translates core predefined standard categories if language is English
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Продукты и супермаркеты': 'Groceries & Supermarkets',
  'Кафе и рестораны': 'Cafes & Restaurants',
  'Транспорт и такси': 'Transport & Taxi',
  'Коммунальные услуги и связь': 'Utilities & Communication',
  'Развлечения и досуг': 'Entertainment & Leisure',
  'Здоровье и спорт': 'Health & Sports',
};

export function getLocalizedCategoryName(name: string, lang: LanguageCode): string {
  if (lang === 'EN') {
    return CATEGORY_TRANSLATIONS[name] || name;
  }
  return name;
}

export function getMonthPluralForm(count: number, lang: LanguageCode): string {
  if (lang === 'EN') {
    return count === 1 ? 'selected category' : 'selected categories';
  }
  if (count % 10 === 1 && count % 100 !== 11) {
    return 'выбранную категорию';
  }
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    return 'выбранные категории';
  }
  return 'выбранных категорий';
}

export function getMonthLocalizedName(key: string, lang: LanguageCode): string {
  const month = key.substring(5, 7);
  const year = key.substring(0, 4);

  const monthsRu: Record<string, string> = {
    '01': 'Январь',
    '02': 'Февраль',
    '03': 'Март',
    '04': 'Апрель',
    '05': 'Май',
    '06': 'Июнь',
    '07': 'Июль',
    '08': 'Август',
    '09': 'Сентябрь',
    '10': 'Октябрь',
    '11': 'Ноябрь',
    '12': 'Декабрь',
  };

  const monthsEn: Record<string, string> = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December',
  };

  const monthName = lang === 'RU' ? monthsRu[month] : monthsEn[month];
  return `${monthName || month} ${year}`;
}

export function getReadableMonthLabelLocalized(monthKey: string, lang: LanguageCode): string {
  const [year, month] = monthKey.split('-');
  
  const monthsRu: Record<string, string> = {
    '01': 'январь',
    '02': 'февраль',
    '03': 'март',
    '04': 'апрель',
    '05': 'май',
    '06': 'июнь',
    '07': 'июль',
    '08': 'август',
    '09': 'сентябрь',
    '10': 'октябрь',
    '11': 'ноябрь',
    '12': 'декабрь'
  };

  const monthsEn: Record<string, string> = {
    '01': 'january',
    '02': 'february',
    '03': 'march',
    '04': 'april',
    '05': 'may',
    '06': 'june',
    '07': 'july',
    '08': 'august',
    '09': 'september',
    '10': 'october',
    '11': 'november',
    '12': 'december'
  };

  const monthName = lang === 'RU' ? monthsRu[month] : monthsEn[month];
  return `${year} - ${month} (${monthName || month})`;
}
