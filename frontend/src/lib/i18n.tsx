"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

type Locale = "en" | "ar";

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
  dir: "ltr" | "rtl";
}

const dictionaries: Record<Locale, any> = { en, ar };

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  t: (key: string) => key,
  setLocale: () => {},
  dir: "ltr",
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
      document.documentElement.setAttribute("lang", l);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  const t = (path: string): string => {
    const keys = path.split(".");
    let current = dictionaries[locale];
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        // Fallback to English
        let fallback = dictionaries["en"];
        for (const fbKey of keys) {
          if (fallback && typeof fallback === "object" && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return path;
          }
        }
        return typeof fallback === "string" ? fallback : path;
      }
    }
    return typeof current === "string" ? current : path;
  };

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, dir: locale === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

