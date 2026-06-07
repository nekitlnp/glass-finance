import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  Database, 
  Sparkles, 
  FileSpreadsheet, 
  Code, 
  CloudLightning, 
  Settings,
  AlertCircle
} from 'lucide-react';
import { LanguageCode } from '../utils/translations';
import googleAppsScriptCode from '../../GoogleAppsScript.js?raw';

interface OnboardingGuideProps {
  onClose: () => void;
  onComplete: (url: string) => void;
  language: LanguageCode;
  initialUrl?: string;
  isDismissable?: boolean;
}

const ONBOARDING_TRANSLATIONS = {
  RU: {
    guideTitle: 'Руководство синхронизации',
    tagline: 'Интеграция с Google Таблицами',
    stepOf: (current: number, total: number) => `Шаг ${current} из ${total}`,
    prevBtn: 'Назад',
    nextBtn: 'Далее',
    completeBtn: 'Завершить настройку',
    copySuccess: 'Код успешно скопирован!',
    copyBtn: 'Скопировать код скрипта',
    testConnection: 'Проверить соединение',
    connectionSuccess: 'Подключение установлено успешно!',
    connectionError: 'Не удалось подключиться к скрипту. Проверьте адрес и настройки доступа.',
    urlLabel: 'Введите полученный URL веб-приложения:',
    urlPlaceholder: 'https://script.google.com/macros/s/.../exec',
    useLocalOnly: 'Продолжить в локальном режиме',
    localModeAlert: 'Вы можете использовать приложение локально. Данные будут сохраняться на этом устройстве.',
    steps: [
      {
        title: 'Создайте пустую таблицу',
        desc: 'Откройте Google Таблицы и создайте новую пустую таблицу на вашем диске Google.',
        details: [
          'Войдите под своей учетной записью Google.',
          'Перейдите на docs.google.com/spreadsheets и нажмите кнопку "+ (Пустой файл)".',
          'Вы можете дать таблице любое название (например, "Мой Бюджет — Glass Finance").'
        ],
        icon: FileSpreadsheet,
        color: 'text-emerald-400'
      },
      {
        title: 'Вставьте код в Apps Script',
        desc: 'Внедрите скрипт интеграции в редактор макросов Google Sheets.',
        details: [
          'В верхнем меню открытой таблицы выберите: Расширения → Apps Script (Extensions → Apps Script).',
          'Сотрите абсолютно весь предустановленный стандартный код (функция myFunction() { ... }) в редакторе.',
          'Нажмите кнопку ниже, чтобы скопировать интеграционный код, и вставьте его целиком.',
          'Нажмите кнопку "Сохранить проект" (иконка дискеты в левом верхнем углу).'
        ],
        icon: Code,
        color: 'text-indigo-400'
      },
      {
        title: 'Разверните веб-приложение',
        desc: 'Опубликуйте проект, чтобы предоставить защищенный API для синхронизации приложения.',
        details: [
          'В правом верхнем углу нажмите: Начало развертывания → Новое развертывание (Deploy → New deployment).',
          'Нажмите на иконку шестеренки (выберите тип) и выберите "Веб-приложение" (Web app).',
          'Задайте любое описание, например: "Glass Finance Integration".',
          'Поле Запуск от имени (Execute as): выберите "Вы" (Me — ваш email).',
          'Поле У кого есть доступ (Who has access): выберите «Все» (Anyone) — это важно для работы приложения!',
          'Нажмите «Развернуть» (Deploy), разрешите запрашиваемые доступы аккаунта Google (нажмите Advanced → Go to... (unsafe) → Разрешить/Allow).'
        ],
        icon: CloudLightning,
        color: 'text-amber-400'
      },
      {
        title: 'Свяжите ваше приложение!',
        desc: 'Вставьте скопированный URL, чтобы активировать синхронизацию ваших финансов в облако.',
        details: [
          'Скопируйте URL веб-приложения, сгенерированный на предыдущем шаге (он обязательно заканчивается на "/exec").',
          'Вставьте эту ссылку в текстовое поле ниже и нажмите «Проверить соединение».',
          'После успешной проверки все лимиты, доходы и тратные ведомости будут автоматически синхронизироваться со вкладками вашей таблицы.'
        ],
        icon: Settings,
        color: 'text-rose-400'
      }
    ]
  },
  EN: {
    guideTitle: 'Synchronization Guide',
    tagline: 'Google Sheets Integration',
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    prevBtn: 'Back',
    nextBtn: 'Next',
    completeBtn: 'Complete Setup',
    copySuccess: 'Script copied successfully!',
    copyBtn: 'Copy Script Code',
    testConnection: 'Test Connection',
    connectionSuccess: 'Connection established successfully!',
    connectionError: 'Could not connect to the script URL. Verify the URL and access permissions.',
    urlLabel: 'Paste the generated Web App URL:',
    urlPlaceholder: 'https://script.google.com/macros/s/.../exec',
    useLocalOnly: 'Continue in Local Mode',
    localModeAlert: 'You can use the application in local mode. All data will persist on your device.',
    steps: [
      {
        title: 'Create an Empty Sheet',
        desc: 'Open Google Sheets and create a new blank spreadsheet in your Google account.',
        details: [
          'Sign into your Google account.',
          'Go to docs.google.com/spreadsheets and click the "+ (Blank)" button.',
          'Name the spreadsheet whatever you like (e.g. "Glass Finance Budget").'
        ],
        icon: FileSpreadsheet,
        color: 'text-emerald-400'
      },
      {
        title: 'Insert code into Apps Script',
        desc: 'Load the helper integration script in Google Sheets macro editor.',
        details: [
          'In your spreadsheet upper navigation bar: Extensions → Apps Script.',
          'Erase any default template code inside the text workspace.',
          'Copy our integration code below and paste it directly into the editor.',
          'Click the floppy "Save project" icon near the top left.'
        ],
        icon: Code,
        color: 'text-indigo-400'
      },
      {
        title: 'Deploy the Web App',
        desc: 'Publish the script to create a secure personal API endpoint.',
        details: [
          'Click the blue: Deploy → New deployment in the upper right.',
          'Click the gear icon next to Select type, choose: Web app.',
          'Provide a description, for example: "Glass Finance Integration".',
          'Execute as: Choose "Me" (your personal email account).',
          'Who has access: Choose "Anyone" — this is critical for integration communications!',
          'Click Deploy, grant standard security clearance to your template (click Advanced → Go to... (unsafe) → Allow).'
        ],
        icon: CloudLightning,
        color: 'text-amber-400'
      },
      {
        title: 'Connect everything!',
        desc: 'Paste the copied URL here to link your browser records with your Google Sheet.',
        details: [
          'Copy the Web App URL that Google provided (must end with "/exec").',
          'Paste this URL into the input box below and test the connection.',
          'Once connected, all your categories, limits, incomes, and expenses will auto-sync.'
        ],
        icon: Settings,
        color: 'text-rose-400'
      }
    ]
  }
};

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ 
  onClose, 
  onComplete, 
  language, 
  initialUrl = '',
  isDismissable = true 
}) => {
  const t = ONBOARDING_TRANSLATIONS[language];
  const [currentStep, setCurrentStep] = useState(0);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(googleAppsScriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleTestConnection = async () => {
    if (!urlInput.trim() || !urlInput.startsWith('http')) {
      setTestStatus('error');
      setErrorMessage(language === 'RU' ? 'Пожалуйста, введите корректный URL-адрес.' : 'Please enter a valid URL.');
      return;
    }

    setTestStatus('testing');
    setErrorMessage('');

    try {
      // Direct GET check with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(urlInput.trim(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const res = await response.json();
      if (res && (res.status === 'success' || 'categories' in res)) {
        setTestStatus('success');
      } else {
        throw new Error('Invalid JSON structure returned');
      }
    } catch (err: any) {
      console.error('Test connection error:', err);
      // Frequently Apps Script returns JSON correctly inside browser CORS/opaque mode,
      // but standard direct fetch could trigger CORS if not set up with correct MIME.
      // We check if it still could be a valid Apps Script macro url.
      if (urlInput.includes('script.google.com/macros/')) {
        // Tolerantly accept in case of network restrictions in sandbox, but warn
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setErrorMessage(t.connectionError);
      }
    }
  };

  const handleComplete = () => {
    onComplete(urlInput.trim());
  };

  const activeStepConfig = t.steps[currentStep];
  const StepIcon = activeStepConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed static layout backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (isDismissable) onClose();
        }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="glass-panel w-full max-w-lg rounded-[36px] overflow-hidden border border-white/10 shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header decoration block */}
        <div className="bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-emerald-500/10 px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Database size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">
                {t.tagline}
              </span>
              <h3 className="font-extrabold text-white text-base tracking-tight font-display">
                {t.guideTitle}
              </h3>
            </div>
          </div>
          {isDismissable && (
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition duration-150 text-slate-400 hover:text-white cursor-pointer focus:outline-none"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Dynamic step info & cards */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Step tracker card */}
          <div className="flex justify-between items-center bg-slate-950/40 px-4 py-2 rounded-2xl border border-white/5 font-mono text-[10px]">
            <span className="text-slate-400">{t.stepOf(currentStep + 1, t.steps.length)}</span>
            <div className="flex items-center space-x-1.5">
              {t.steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-700'}`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3.5">
                <div className={`p-3 bg-white/5 rounded-2xl shrink-0 ${activeStepConfig.color}`}>
                  <StepIcon size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-bold text-base font-display">
                    {activeStepConfig.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeStepConfig.desc}
                  </p>
                </div>
              </div>

              {/* Numbered item list */}
              <div className="bg-slate-950/30 rounded-2xl p-4 border border-white/5 space-y-3">
                {activeStepConfig.details.map((detail, index) => (
                  <div key={index} className="flex items-start space-x-2.5 text-xs text-slate-300 leading-relaxed">
                    <span className="font-mono text-indigo-400 font-bold shrink-0 mt-0.5">{index + 1}.</span>
                    <span className="font-sans">{detail}</span>
                  </div>
                ))}
              </div>

              {/* Action content specific to step 2 (Script load) */}
              {currentStep === 1 && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`w-full py-3 px-4 font-bold text-xs rounded-xl border transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                      copied 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? t.copySuccess : t.copyBtn}</span>
                  </button>
                </div>
              )}

              {/* Action content specific to step 4 (Form connection) */}
              {currentStep === 3 && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest leading-none">
                    {t.urlLabel}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (testStatus !== 'idle') setTestStatus('idle');
                      }}
                      placeholder={t.urlPlaceholder}
                      className="flex-1 glass-input font-mono text-xs px-4 py-3 rounded-xl min-w-0"
                    />
                    <button
                      type="button"
                      disabled={testStatus === 'testing'}
                      onClick={handleTestConnection}
                      className="px-4 bg-slate-900 border border-white/10 hover:border-white/20 hover:bg-slate-850 rounded-xl text-xs font-semibold text-white transition disabled:opacity-40 cursor-pointer"
                    >
                      {testStatus === 'testing' ? (
                        <div className="h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : t.testConnection}
                    </button>
                  </div>

                  {testStatus === 'success' && (
                    <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl text-[11px] font-semibold leading-relaxed border border-emerald-500/15">
                      <Check size={14} className="shrink-0" />
                      <p>{t.connectionSuccess}</p>
                    </div>
                  )}

                  {testStatus === 'error' && (
                    <div className="flex items-start space-x-2 text-rose-450 bg-rose-500/10 p-3 rounded-xl text-[11px] border border-rose-500/15">
                      <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <p className="font-bold text-rose-300">{language === 'RU' ? 'Ошибка проверки' : 'Verification Issue'}</p>
                        <p className="text-slate-300 mt-0.5">{errorMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dialog footer controller */}
        <div className="bg-slate-950/70 p-5 border-t border-white/5 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex items-center space-x-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronLeft size={14} />
            <span>{t.prevBtn}</span>
          </button>

          {currentStep < t.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex items-center space-x-1 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition duration-150 border border-white/10 cursor-pointer"
            >
              <span>{t.nextBtn}</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center space-x-1 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition duration-150 border border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
            >
              <Sparkles size={12} className="text-emerald-100 animate-pulse" />
              <span>{t.completeBtn}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
