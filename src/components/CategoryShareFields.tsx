import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { AdditionalIncome } from '../types';
import {
  formatMoney,
  getCurrencySymbol,
  getIncomeBase,
  parseAmountInput,
  roundMoney
} from '../utils/finance';
import { LanguageCode, getMonthLocalizedName } from '../utils/translations';

const PLANNED_INCOME_KEY = 'glass_finance_planned_income';

function readPlannedIncome(): number {
  try {
    const stored = Number(localStorage.getItem(PLANNED_INCOME_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
}

function writePlannedIncome(value: number) {
  try {
    localStorage.setItem(PLANNED_INCOME_KEY, String(value));
  } catch (e) {
    console.error('Failed to write planned income to localStorage:', e);
  }
}

// 17.5 => "17.5", 15000 => "15000"
function toInputString(value: number): string {
  return String(roundMoney(value));
}

function formatPercent(value: number): string {
  return String(roundMoney(value)).replace('.', ',');
}

type MessageTone = 'error' | 'warn' | 'info' | 'ok';

interface ShareMessage {
  tone: MessageTone;
  text: string;
}

interface CategoryShareFieldsProps {
  incomes: AdditionalIncome[];
  currentMonth: string;
  /** Sum of the shares of all other categories, in percent. */
  otherPercentTotal: number;
  /** Share of the category being edited, or null for a new one. */
  initialPercent: number | null;
  /** Reports the share to save, or null while the form cannot be saved. */
  onChange: (percentage: number | null) => void;
  currencyCode: string;
  language: LanguageCode;
}

/**
 * Two linked inputs: a monthly amount and a share of income. Typing in either one fills in the other,
 * using the monthly income as the base. Only the share is stored, exactly as before.
 */
export default function CategoryShareFields({
  incomes,
  currentMonth,
  otherPercentTotal,
  initialPercent,
  onChange,
  currencyCode,
  language
}: CategoryShareFieldsProps) {
  const isRu = language === 'RU';
  const initialBase = useMemo(
    () => getIncomeBase(incomes, currentMonth, readPlannedIncome()),
    // The base is a starting value for the form: later edits belong to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [baseStr, setBaseStr] = useState(initialBase.amount > 0 ? toInputString(initialBase.amount) : '');
  const [baseEdited, setBaseEdited] = useState(false);
  const [percentStr, setPercentStr] = useState(initialPercent !== null ? toInputString(initialPercent) : '');
  const [amountStr, setAmountStr] = useState(
    initialPercent !== null && initialBase.amount > 0
      ? toInputString((initialBase.amount * initialPercent) / 100)
      : ''
  );
  const [lastEdited, setLastEdited] = useState<'percent' | 'amount'>('percent');

  const base = parseAmountInput(baseStr);
  const baseValid = Number.isFinite(base) && base > 0;
  const percentTyped = parseAmountInput(percentStr);
  const amountTyped = parseAmountInput(amountStr);

  const handlePercentChange = (value: string) => {
    setPercentStr(value);
    setLastEdited('percent');
    const parsed = parseAmountInput(value);
    if (value.trim() === '' || !baseValid) {
      setAmountStr('');
    } else if (Number.isFinite(parsed) && parsed >= 0) {
      setAmountStr(toInputString((base * parsed) / 100));
    }
  };

  const handleAmountChange = (value: string) => {
    setAmountStr(value);
    setLastEdited('amount');
    const parsed = parseAmountInput(value);
    if (value.trim() === '' || !baseValid) {
      setPercentStr('');
    } else if (Number.isFinite(parsed) && parsed >= 0) {
      setPercentStr(toInputString((parsed / base) * 100));
    }
  };

  const handleBaseChange = (value: string) => {
    setBaseStr(value);
    setBaseEdited(true);
    const parsed = parseAmountInput(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    writePlannedIncome(roundMoney(parsed));
    if (lastEdited === 'amount' && Number.isFinite(amountTyped) && amountTyped >= 0) {
      setPercentStr(toInputString((amountTyped / parsed) * 100));
    } else if (Number.isFinite(percentTyped) && percentTyped >= 0) {
      setAmountStr(toInputString((parsed * percentTyped) / 100));
    }
  };

  // Resolve what will be saved
  let percentage: number | null = null;
  let error: string | null = null;

  if (lastEdited === 'amount' && amountStr.trim() !== '') {
    if (!Number.isFinite(amountTyped) || amountTyped < 0) {
      error = isRu ? 'Сумма должна быть числом не меньше нуля.' : 'The amount must be a number of zero or more.';
    } else if (!baseValid) {
      error = isRu
        ? 'Чтобы пересчитать сумму в долю, укажите доход в месяц.'
        : 'Enter your monthly income to convert the amount to a share.';
    } else {
      percentage = roundMoney((amountTyped / base) * 100);
    }
  } else if (percentStr.trim() === '') {
    error = isRu ? 'Укажите сумму или долю. Можно и 0.' : 'Enter an amount or a share. Zero is fine.';
  } else if (!Number.isFinite(percentTyped) || percentTyped < 0) {
    error = isRu ? 'Доля должна быть числом не меньше нуля.' : 'The share must be a number of zero or more.';
  } else {
    percentage = roundMoney(percentTyped);
  }

  useEffect(() => {
    onChange(percentage);
    // onChange is recreated by the parent on every render; only the value matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage]);

  const money = (value: number) => formatMoney(value, currencyCode);
  const messages: ShareMessage[] = [];

  if (error) {
    messages.push({ tone: 'error', text: error });
  } else if (percentage !== null) {
    const total = roundMoney(otherPercentTotal + percentage);

    if (lastEdited === 'amount' && baseValid && Number.isFinite(amountTyped)) {
      const actual = roundMoney((base * percentage) / 100);
      if (Math.abs(actual - amountTyped) >= 0.01) {
        messages.push({
          tone: 'info',
          text: isRu
            ? `Доля хранится с точностью до сотых: ${formatPercent(percentage)}% — это ${money(actual)}, а не ${money(amountTyped)}.`
            : `The share is stored to two decimals: ${formatPercent(percentage)}% is ${money(actual)}, not ${money(amountTyped)}.`
        });
      }
    }

    if (percentage === 0) {
      messages.push({
        tone: 'info',
        text: isRu
          ? 'С долей 0% категория не получает денег из основного дохода — только доп. доходы и остатки прошлых месяцев.'
          : 'At 0% the category gets nothing from primary income, only additional income and carried-over balances.'
      });
    }

    if (total > 100) {
      const over = roundMoney(total - 100);
      const overMoney = baseValid ? ` (${money((base * over) / 100)})` : '';
      messages.push({
        tone: 'warn',
        text: isRu
          ? `Вместе с другими категориями распределено ${formatPercent(total)}% — на ${formatPercent(over)}%${overMoney} больше дохода. Лимиты в сумме превысят то, что реально приходит: уменьшите долю здесь или в других категориях.`
          : `With the other categories ${formatPercent(total)}% is allocated, ${formatPercent(over)}%${overMoney} more than the income. Reduce the share here or in other categories.`
      });
    } else if (total < 100) {
      const free = roundMoney(100 - total);
      const freeMoney = baseValid ? ` (${money((base * free) / 100)})` : '';
      messages.push({
        tone: 'info',
        text: isRu
          ? `Вместе с другими категориями распределено ${formatPercent(total)}%. Свободно ещё ${formatPercent(free)}%${freeMoney}.`
          : `With the other categories ${formatPercent(total)}% is allocated. ${formatPercent(free)}%${freeMoney} is still free.`
      });
    } else {
      messages.push({
        tone: 'ok',
        text: isRu ? 'Распределено ровно 100% дохода.' : 'Exactly 100% of the income is allocated.'
      });
    }
  }

  let baseCaption: string;
  if (!baseValid) {
    baseCaption = isRu
      ? 'Доходов пока нет. Впишите, сколько примерно получаете в месяц, — тогда сумма и доля будут пересчитываться друг в друга.'
      : 'No income yet. Enter roughly what you earn per month and the amount and share will convert into each other.';
  } else if (baseEdited) {
    baseCaption = isRu ? 'Указан вручную, подставится и в следующие категории.' : 'Entered manually, it will be offered for the next categories too.';
  } else if (initialBase.source === 'month') {
    baseCaption = isRu
      ? `Основной доход за ${getMonthLocalizedName(initialBase.month || currentMonth, language).toLowerCase()}.`
      : `Primary income for ${getMonthLocalizedName(initialBase.month || currentMonth, language)}.`;
  } else if (initialBase.source === 'last') {
    baseCaption = isRu
      ? `За выбранный месяц дохода ещё нет, взят последний: ${getMonthLocalizedName(initialBase.month || currentMonth, language).toLowerCase()}.`
      : `No income for the selected month yet, using the latest one: ${getMonthLocalizedName(initialBase.month || currentMonth, language)}.`;
  } else {
    baseCaption = isRu ? 'Доход, который вы указывали раньше.' : 'The income you entered earlier.';
  }

  const toneClass: Record<MessageTone, string> = {
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
    warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    info: 'border-white/10 bg-white/[0.03] text-slate-300',
    ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  };

  const symbol = getCurrencySymbol(currencyCode);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 font-medium block">
          {isRu ? `Доход в месяц, ${symbol}` : `Monthly income, ${symbol}`}
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={baseStr}
          onChange={(e) => handleBaseChange(e.target.value)}
          className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
          placeholder={isRu ? 'например, 100000' : 'e.g. 3000'}
          aria-label={isRu ? 'Доход в месяц' : 'Monthly income'}
        />
        <p className="text-[10px] text-slate-400 leading-normal">{baseCaption}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs text-slate-400 font-medium block truncate">
            {isRu ? `Сумма в месяц, ${symbol}` : `Per month, ${symbol}`}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
            placeholder={isRu ? 'например, 15000' : 'e.g. 450'}
            aria-label={isRu ? 'Сумма в месяц' : 'Amount per month'}
          />
        </div>
        <div className="space-y-1.5 min-w-0">
          <label className="text-xs text-slate-400 font-medium block truncate">
            {isRu ? 'Доля дохода, %' : 'Share of income, %'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={percentStr}
            onChange={(e) => handlePercentChange(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
            placeholder={isRu ? 'например, 15' : 'e.g. 15'}
            aria-label={isRu ? 'Доля дохода в процентах' : 'Share of income in percent'}
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-normal">
        {isRu
          ? 'Заполните любое из двух полей — второе посчитается само. Лимит месяца = доля × основной доход, внесённый за этот месяц.'
          : 'Fill in either field and the other is calculated. Monthly limit = share × primary income entered for that month.'}
      </p>

      {messages.map((message, index) => (
        <div
          key={index}
          role={message.tone === 'error' ? 'alert' : undefined}
          className={`flex items-start space-x-2 rounded-xl border px-3 py-2 text-[11px] leading-snug ${toneClass[message.tone]}`}
        >
          <span className="shrink-0 mt-0.5">
            {message.tone === 'ok' ? (
              <CheckCircle2 size={13} />
            ) : message.tone === 'info' ? (
              <Info size={13} />
            ) : (
              <AlertTriangle size={13} />
            )}
          </span>
          <span>{message.text}</span>
        </div>
      ))}
    </div>
  );
}
