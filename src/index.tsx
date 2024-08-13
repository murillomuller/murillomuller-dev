import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './styles/index.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

const loadTranslations = async (language) => {
  const response = await fetch(`/locales/${language}/common.json`);
  if (!response.ok) {
    throw new Error(`Failed to load translations for ${language}`);
  }
  return response.json();
};

const initializeI18next = async () => {
  const brTranslations = await loadTranslations('br');
  const enTranslations = await loadTranslations('en');

  i18next.init({
    interpolation: { escapeValue: false },  // React already does escaping
    lng: 'br',                              // language to use by default
    resources: {
      br: { common: brTranslations },
      en: { common: enTranslations },
    },
  });
};

const Root = () => {
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    initializeI18next().then(() => {
      setI18nInitialized(true);
    }).catch(err => {
      console.error('Failed to initialize i18next:', err);
    });
  }, []);

  if (!i18nInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <React.StrictMode>
      <I18nextProvider i18n={i18next}>
        <App />
      </I18nextProvider>
    </React.StrictMode>
  );
};

ReactDOM.render(
  <Root />,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
