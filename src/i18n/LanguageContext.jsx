import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

/**
 * Language + direction for the whole app.
 *
 * Switching language sets <html lang="ar" dir="rtl">. Because all CSS uses *logical*
 * properties (margin-inline-start, padding-inline, text-align: start, …) the browser
 * mirrors the entire layout automatically – it's a real RTL layout, not just
 * right-aligned text.
 */

const LANG_KEY = 'support_desk_lang';
const LanguageContext = createContext(null);

// Intl locales: Gregorian calendar (ar-SA defaults to the Hijri calendar) + Arabic-Indic digits.
const LOCALES = { en: 'en-US', ar: 'ar-SA-u-ca-gregory-nu-arab' };

function readStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === 'ar' || stored === 'en' ? stored : 'en';
  } catch {
    return 'en';
  }
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readStoredLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = translations[lang].app.title;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, dir]);

  /** t('list.summary', { from: 1, to: 15, total: 58 }) */
  const t = useCallback(
    (key, vars) => {
      let text = lookup(translations[lang], key) ?? lookup(translations.en, key) ?? key;
      if (vars && typeof text === 'string') {
        text = text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
      }
      return text;
    },
    [lang],
  );

  const value = useMemo(() => {
    const locale = LOCALES[lang];
    const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const numberFmt = new Intl.NumberFormat(locale);
    return {
      lang,
      dir,
      t,
      toggleLang: () => setLang((l) => (l === 'en' ? 'ar' : 'en')),
      formatDate: (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
      },
      formatNumber: (n) => (typeof n === 'number' ? numberFmt.format(n) : n),
      /** Picks name_en / name_ar (or label_en / label_ar) for the current language. */
      localized: (obj, base = 'name') =>
        obj ? (obj[`${base}_${lang}`] ?? obj[`${base}_en`] ?? obj.slug ?? obj.value ?? '') : '',
    };
  }, [lang, dir, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
