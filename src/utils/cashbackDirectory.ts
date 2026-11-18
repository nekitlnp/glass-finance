/**
 * Справочник банков и категорий кэшбэка для вкладки «Кэшбэк».
 *
 * Банки — те, что выпускают карты с кэшбэком для частных клиентов (состояние на ноябрь 2026).
 * Не включены банки, которые перестали существовать как отдельные: «Открытие» (присоединён к ВТБ),
 * Хоум Банк (присоединён к Совкомбанку). Росбанк с 2025 года — филиал Т-Банка, но работает под своим брендом.
 *
 * Категории — сведены из названий, которые банки дают в своих программах лояльности
 * (Т-Банк, Сбер, Альфа-Банк, ВТБ, Газпромбанк, Совкомбанк, Ozon Банк, Яндекс Банк, WB Банк и др.).
 * У разных банков одна и та же категория называется по-разному («Кафе и рестораны» / «Рестораны»),
 * поэтому у категорий есть синонимы: по ним сопоставляются строки, введённые вручную или в таблице.
 *
 * Если банка или категории нет в списке, их можно вписать в форме вручную.
 */

export interface CashbackBank {
  id: string;
  name: string;
  /** 1–3 буквы для значка */
  short: string;
  /** Цвет значка */
  color: string;
  /** Цвет букв на значке */
  textColor: string;
  popular?: boolean;
  aliases?: string[];
}

export interface CashbackCategory {
  id: string;
  name: string;
  group: CashbackCategoryGroup;
  /** Имя иконки из lucide-react (см. CashbackIcon) */
  icon: string;
  aliases?: string[];
}

export type CashbackCategoryGroup =
  | 'base'
  | 'food'
  | 'transport'
  | 'travel'
  | 'shopping'
  | 'health'
  | 'leisure'
  | 'services';

export const CASHBACK_CATEGORY_GROUPS: { id: CashbackCategoryGroup; name: string }[] = [
  { id: 'base', name: 'Базовый кэшбэк' },
  { id: 'food', name: 'Еда' },
  { id: 'transport', name: 'Транспорт и авто' },
  { id: 'travel', name: 'Путешествия' },
  { id: 'shopping', name: 'Покупки' },
  { id: 'health', name: 'Здоровье и красота' },
  { id: 'leisure', name: 'Досуг' },
  { id: 'services', name: 'Услуги' }
];

const WHITE = '#ffffff';
const DARK = '#111827';

export const CASHBACK_BANKS: CashbackBank[] = [
  // Самые распространённые карты с выбором категорий
  { id: 'sber', name: 'Сбер', short: 'С', color: '#21A038', textColor: WHITE, popular: true, aliases: ['Сбербанк', 'СберСпасибо', 'Спасибо'] },
  { id: 'tbank', name: 'Т-Банк', short: 'Т', color: '#FFDD2D', textColor: DARK, popular: true, aliases: ['Тинькофф', 'Tinkoff', 'Т Банк', 'Тбанк', 'T-Bank'] },
  { id: 'alfa', name: 'Альфа-Банк', short: 'А', color: '#EF3124', textColor: WHITE, popular: true, aliases: ['Альфа', 'Alfa', 'Альфабанк'] },
  { id: 'vtb', name: 'ВТБ', short: 'ВТБ', color: '#0A2896', textColor: WHITE, popular: true, aliases: ['VTB', 'Открытие'] },
  { id: 'gpb', name: 'Газпромбанк', short: 'ГПБ', color: '#1B3C8C', textColor: WHITE, popular: true, aliases: ['ГПБ', 'Газпром'] },
  { id: 'ozon', name: 'Ozon Банк', short: 'O', color: '#005BFF', textColor: WHITE, popular: true, aliases: ['Озон', 'Озон Банк', 'Ozon', 'Ozon Карта'] },
  { id: 'yandex', name: 'Яндекс Банк', short: 'Я', color: '#FC3F1D', textColor: WHITE, popular: true, aliases: ['Яндекс', 'Яндекс Пэй', 'Yandex Pay', 'Пэй'] },
  { id: 'sovcom', name: 'Совкомбанк', short: 'СК', color: '#E31E24', textColor: WHITE, popular: true, aliases: ['Халва', 'Совком', 'Хоум Банк', 'Хоум Кредит'] },
  { id: 'wb', name: 'WB Банк', short: 'WB', color: '#A73AFD', textColor: WHITE, popular: true, aliases: ['Вайлдберриз Банк', 'Wildberries', 'ВБ', 'Вайлдберриз'] },

  // Остальные — по алфавиту
  { id: 'akbars', name: 'Ак Барс Банк', short: 'АБ', color: '#00843D', textColor: WHITE, aliases: ['Ак Барс'] },
  { id: 'bspb', name: 'Банк Санкт-Петербург', short: 'БСП', color: '#D9001D', textColor: WHITE, aliases: ['БСПБ', 'Бспб'] },
  { id: 'bks', name: 'БКС Банк', short: 'БКС', color: '#2B4FA3', textColor: WHITE, aliases: ['БКС'] },
  { id: 'domrf', name: 'Банк ДОМ.РФ', short: 'Д', color: '#2C5BE5', textColor: WHITE, aliases: ['ДОМ.РФ', 'Дом РФ'] },
  { id: 'creditEurope', name: 'Кредит Европа Банк', short: 'КЕ', color: '#00557F', textColor: WHITE, aliases: ['Кредит Европа'] },
  { id: 'loco', name: 'Локо-Банк', short: 'Л', color: '#5C2D91', textColor: WHITE, aliases: ['Локо'] },
  { id: 'mkb', name: 'МКБ', short: 'МКБ', color: '#B5121B', textColor: WHITE, aliases: ['Московский кредитный банк'] },
  { id: 'mts', name: 'МТС Банк', short: 'МТС', color: '#E30611', textColor: WHITE, aliases: ['МТС', 'МТС Деньги'] },
  { id: 'novikom', name: 'Новикомбанк', short: 'Н', color: '#003B71', textColor: WHITE, aliases: ['Новиком'] },
  { id: 'otp', name: 'ОТП Банк', short: 'ОТП', color: '#52AE30', textColor: WHITE, aliases: ['ОТП', 'OTP'] },
  { id: 'pochta', name: 'Почта Банк', short: 'П', color: '#0F2D69', textColor: WHITE, aliases: ['Почта'] },
  { id: 'primsoc', name: 'Примсоцбанк', short: 'ПСК', color: '#00A651', textColor: WHITE, aliases: ['Примсоц'] },
  { id: 'psb', name: 'ПСБ', short: 'ПСБ', color: '#F26722', textColor: WHITE, aliases: ['Промсвязьбанк'] },
  { id: 'raif', name: 'Райффайзенбанк', short: 'Р', color: '#FFF200', textColor: DARK, aliases: ['Райффайзен', 'Райф', 'Raiffeisen'] },
  { id: 'renessans', name: 'Ренессанс Банк', short: 'РНС', color: '#6F2C91', textColor: WHITE, aliases: ['Ренессанс', 'Ренессанс Кредит'] },
  { id: 'rosbank', name: 'Росбанк', short: 'РОС', color: '#E4002B', textColor: WHITE },
  { id: 'rshb', name: 'Россельхозбанк', short: 'РСХ', color: '#007A3D', textColor: WHITE, aliases: ['РСХБ'] },
  { id: 'rs', name: 'Русский Стандарт', short: 'РС', color: '#1A1A1A', textColor: WHITE, aliases: ['Банк Русский Стандарт'] },
  { id: 'ubrir', name: 'УБРиР', short: 'УБР', color: '#C8102E', textColor: WHITE },
  { id: 'uralsib', name: 'Уралсиб', short: 'УС', color: '#2A3F94', textColor: WHITE, aliases: ['Банк Уралсиб'] },
  { id: 'fora', name: 'Фора-Банк', short: 'Ф', color: '#E8501F', textColor: WHITE, aliases: ['Фора'] },
  { id: 'finam', name: 'Финам', short: 'ФИН', color: '#FFD500', textColor: DARK, aliases: ['Банк Финам'] },
  { id: 'expo', name: 'Экспобанк', short: 'ЭКС', color: '#0055A5', textColor: WHITE, aliases: ['Экспо', 'Экси'] }
];

export const CASHBACK_CATEGORIES: CashbackCategory[] = [
  // Базовый кэшбэк
  { id: 'all', name: 'Все покупки', group: 'base', icon: 'Percent', aliases: ['На всё', 'На все покупки', 'Любые покупки', 'Остальные покупки'] },

  // Еда
  { id: 'supermarkets', name: 'Супермаркеты', group: 'food', icon: 'ShoppingCart', aliases: ['Продукты', 'Продуктовые магазины'] },
  { id: 'restaurants', name: 'Кафе и рестораны', group: 'food', icon: 'UtensilsCrossed', aliases: ['Рестораны', 'Рестораны и кафе', 'Кафе', 'Кафе, бары и рестораны', 'Общепит'] },
  { id: 'fastfood', name: 'Фастфуд', group: 'food', icon: 'Pizza', aliases: ['Фаст-фуд', 'Фаст фуд'] },
  { id: 'foodDelivery', name: 'Доставка еды', group: 'food', icon: 'Truck', aliases: ['Доставка'] },

  // Транспорт и авто
  { id: 'taxi', name: 'Такси', group: 'transport', icon: 'CarTaxiFront' },
  { id: 'transport', name: 'Транспорт', group: 'transport', icon: 'Bus', aliases: ['Местный транспорт', 'Городской транспорт', 'Общественный транспорт', 'Транспорт и такси'] },
  { id: 'fuel', name: 'АЗС', group: 'transport', icon: 'Fuel', aliases: ['Топливо', 'Заправки', 'АЗС и топливо', 'Бензин'] },
  { id: 'carService', name: 'Автоуслуги', group: 'transport', icon: 'Wrench', aliases: ['Автоуслуги и автозапчасти', 'Автозапчасти', 'Сервисы ТО', 'Автомагазины'] },
  { id: 'carsharing', name: 'Каршеринг и аренда авто', group: 'transport', icon: 'KeyRound', aliases: ['Каршеринг', 'Аренда авто', 'Аренда автомобилей'] },

  // Путешествия
  { id: 'trains', name: 'Ж/д билеты', group: 'travel', icon: 'TrainFront', aliases: ['ЖД билеты', 'Поезда', 'Ж/Д', 'Авиа и Ж/Д билеты'] },
  { id: 'flights', name: 'Авиабилеты', group: 'travel', icon: 'Plane', aliases: ['Авиакомпании', 'Авиа'] },
  { id: 'hotels', name: 'Отели', group: 'travel', icon: 'BedDouble', aliases: ['Гостиницы', 'Отели и гостиницы'] },
  { id: 'travel', name: 'Путешествия', group: 'travel', icon: 'Luggage', aliases: ['Турагентства', 'Туризм'] },

  // Покупки
  { id: 'marketplaces', name: 'Маркетплейсы', group: 'shopping', icon: 'Package', aliases: ['Онлайн-покупки'] },
  { id: 'clothes', name: 'Одежда и обувь', group: 'shopping', icon: 'Shirt', aliases: ['Одежда', 'Обувь'] },
  { id: 'electronics', name: 'Электроника', group: 'shopping', icon: 'Smartphone', aliases: ['Электроника и техника', 'Бытовая техника', 'Техника'] },
  { id: 'home', name: 'Дом и ремонт', group: 'shopping', icon: 'Hammer', aliases: ['Дом, ремонт', 'Ремонт', 'Товары для дома'] },
  { id: 'kids', name: 'Детские товары', group: 'shopping', icon: 'Baby', aliases: ['Детям', 'Товары для детей'] },
  { id: 'pets', name: 'Животные', group: 'shopping', icon: 'PawPrint', aliases: ['Питомцы', 'Зоотовары', 'Товары для животных'] },
  { id: 'flowers', name: 'Цветы', group: 'shopping', icon: 'Flower2' },
  { id: 'books', name: 'Книги', group: 'shopping', icon: 'BookOpen', aliases: ['Книги и канцтовары'] },
  { id: 'sport', name: 'Спорттовары', group: 'shopping', icon: 'Dumbbell', aliases: ['Спортивные товары', 'Спорт'] },
  { id: 'jewelry', name: 'Ювелирные изделия', group: 'shopping', icon: 'Gem', aliases: ['Ювелирка', 'Украшения'] },
  { id: 'hobby', name: 'Хобби и творчество', group: 'shopping', icon: 'Palette', aliases: ['Хобби', 'Искусство'] },

  // Здоровье и красота
  { id: 'pharmacy', name: 'Аптеки', group: 'health', icon: 'Pill', aliases: ['Аптека', 'Лекарства'] },
  { id: 'medicine', name: 'Медицина', group: 'health', icon: 'Stethoscope', aliases: ['Медицинские услуги', 'Здоровье', 'Клиники'] },
  { id: 'beauty', name: 'Красота', group: 'health', icon: 'Sparkles', aliases: ['Салоны красоты', 'Косметика', 'Косметика и парфюмерия'] },
  { id: 'fitness', name: 'Фитнес', group: 'health', icon: 'Activity', aliases: ['Спортзалы', 'Фитнес-клубы'] },

  // Досуг
  { id: 'entertainment', name: 'Развлечения', group: 'leisure', icon: 'Ticket', aliases: ['Досуг', 'Досуг и развлечения'] },
  { id: 'cinema', name: 'Кино и театры', group: 'leisure', icon: 'Clapperboard', aliases: ['Кино', 'Театры и кино', 'Кинотеатры', 'Театры', 'Кинотеатры и музеи'] },
  { id: 'music', name: 'Музыка', group: 'leisure', icon: 'Music' },
  { id: 'digital', name: 'Цифровые товары', group: 'leisure', icon: 'Tv', aliases: ['Подписки', 'Онлайн-кинотеатры', 'Игры', 'Цифровые товары и подписки'] },
  { id: 'photo', name: 'Фото и видео', group: 'leisure', icon: 'Camera', aliases: ['Фото, Видео', 'Фото'] },

  // Услуги
  { id: 'utilities', name: 'ЖКХ', group: 'services', icon: 'House', aliases: ['Коммунальные услуги', 'Коммуналка', 'Квартплата'] },
  { id: 'telecom', name: 'Связь и интернет', group: 'services', icon: 'Wifi', aliases: ['Связь', 'Мобильная связь', 'Интернет'] },
  { id: 'education', name: 'Образование', group: 'services', icon: 'GraduationCap', aliases: ['Обучение', 'Курсы'] },
  { id: 'drycleaning', name: 'Химчистки', group: 'services', icon: 'WashingMachine', aliases: ['Химчистка', 'Бытовые услуги', 'Прачечные'] }
];

/** «Аптеки», «аптеки », «АПТЕКИ», «Ёлки» → один и тот же ключ */
export function normalizeDirectoryKey(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

const bankIndex = new Map<string, CashbackBank>();
for (const bank of CASHBACK_BANKS) {
  for (const key of [bank.name, ...(bank.aliases || [])]) {
    bankIndex.set(normalizeDirectoryKey(key), bank);
  }
}

const categoryIndex = new Map<string, CashbackCategory>();
for (const category of CASHBACK_CATEGORIES) {
  for (const key of [category.name, ...(category.aliases || [])]) {
    categoryIndex.set(normalizeDirectoryKey(key), category);
  }
}

export function findBank(name: string): CashbackBank | undefined {
  return bankIndex.get(normalizeDirectoryKey(name));
}

export function findCategory(name: string): CashbackCategory | undefined {
  return categoryIndex.get(normalizeDirectoryKey(name));
}

/** Название из справочника, если строка совпала с ним или с синонимом; иначе — как ввёл пользователь. */
export function canonicalBankName(name: string): string {
  return findBank(name)?.name ?? name.trim();
}

export function canonicalCategoryName(name: string): string {
  return findCategory(name)?.name ?? name.trim();
}

/** Порядок категории в справочнике; свои категории — в конце. */
export function categoryOrder(name: string): number {
  const category = findCategory(name);
  return category ? CASHBACK_CATEGORIES.indexOf(category) : CASHBACK_CATEGORIES.length;
}

/** Значок для банка не из справочника: первые буквы и цвет, вычисленный из названия. */
export function bankBadge(name: string): { short: string; color: string; textColor: string } {
  const bank = findBank(name);
  if (bank) return { short: bank.short, color: bank.color, textColor: bank.textColor };

  const words = name.trim().split(/[\s-]+/).filter(Boolean);
  const short = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { short, color: `hsl(${hash % 360}, 45%, 42%)`, textColor: WHITE };
}
