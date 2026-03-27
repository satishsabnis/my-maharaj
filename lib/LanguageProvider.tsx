import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getTranslations, Translations } from './translations';
import { en } from './translations';

interface LangContextType {
  lang: string;
  t: Translations;
  setLang: (code: string) => void;
  isEnglish: boolean;
  toggleEnglish: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  t: en,
  setLang: () => {},
  isEnglish: true,
  toggleEnglish: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang,      setLangState] = useState('en');
  const [prevLang,  setPrevLang]  = useState('en');
  const [isEnglish, setIsEnglish] = useState(true);

  useEffect(() => {
    async function loadLang() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles')
          .select('app_language').eq('id', user.id).maybeSingle();
        const saved = data?.app_language ?? 'en';
        setLangState(saved);
        setPrevLang(saved);
        setIsEnglish(saved === 'en');
      } catch (e) { console.error(e); }
    }
    void loadLang();
  }, []);

  function setLang(code: string) {
    setLangState(code);
    setPrevLang(code);
    setIsEnglish(code === 'en');
  }

  function toggleEnglish() {
    if (isEnglish && prevLang !== 'en') {
      setLangState(prevLang);
      setIsEnglish(false);
    } else {
      setPrevLang(lang);
      setLangState('en');
      setIsEnglish(true);
    }
  }

  const t = getTranslations(lang);

  return (
    <LangContext.Provider value={{ lang, t, setLang, isEnglish, toggleEnglish }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
