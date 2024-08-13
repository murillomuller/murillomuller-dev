import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { useParams } from 'react-router-dom';

export default function Home() {
    let { language } = useParams<{ language: string }>();
    const { i18n, t } = useTranslation('common');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (language === 'br' || language === 'en') {
            // Fetch the JSON file dynamically
            fetch(`/locales/${language}/common.json`)
                .then(response => response.json())
                .then(data => {
                    // Add the fetched translations to i18next
                    i18n.addResourceBundle(language, 'common', data);
                    i18n.changeLanguage(language);
                    setLoaded(true);
                })
                .catch(error => {
                    console.error("Failed to load translations:", error);
                    setLoaded(true); // Handle the error case
                });
        }
    }, [language, i18n]);

    if (!loaded) {
        return <div>Loading...</div>; // Optional: show a loading state while translations are being fetched
    }

    return (
        <div>
            <div id='about' className='about'>
                <h1>{t('sections.about.hi')},</h1>
                <p>{t('sections.about.first')}</p>
                <p>{t('sections.about.second')}</p>
                <p>{t('sections.about.third')}</p>
            </div>
            {/* Rest of your component */}
        </div>
    );
}
