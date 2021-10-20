import React from 'react'
import Button from '../../components/Button';
import { faDownload, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {useTranslation} from "react-i18next";

import logoUniceub from '../../assets/logo_uniceub.png';
import logoPurple from '../../assets/logo_purple.png';
import logoGoObra from '../../assets/logo_goobra.png';
import logo7virtual from '../../assets/logo_7virtual.png';

export default function Home() {
    const {t, i18n} = useTranslation('common');

    return (
        <div>
            <div id='about' className='about'>
                <h1>{t('sections.about.hi')},</h1>
                <p>{t('sections.about.first')}</p>
                <p>{t('sections.about.second')}</p>
                <p>{t('sections.about.third')} </p>
                <div className='mt-40'>
                    <Button to='#'><FontAwesomeIcon icon={faDownload} />{' '} {t('sections.about.downloadcv')}</Button>{' '}
                    <Button type='secondary' className='mt-20' to='#'><FontAwesomeIcon icon={faEnvelope} />{' '} {t('sections.about.contactme')}</Button>
                </div>
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.experience.title')}</h1>
            <div id='experience' className='experience'>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2021 - {t('common.current')}</div>
                    <div className='body'>
                        <h2>Inmetrics</h2>
                        <p>{t('sections.experience.inmetrics')}</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.april')} 2019 - {t('date.months.june')} 2021</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>{t('sections.experience.cassipleno')}</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.april')} 2018 - {t('date.months.april')} 2019</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>{t('sections.experience.cassijunior')}</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.january')} 2016 - {t('date.months.april')} 2018</div>
                    <div className='body'>
                        <h2>Stefanini</h2>
                        <p>{t('sections.experience.stefaniniintermediary')}</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.february')} 2015 - {t('date.months.january')} 2016</div>
                    <div className='body'>
                        <h2>Stefanini</h2>
                        <p>{t('sections.experience.stefaninibasic')} </p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2014 - {t('date.months.january')} 2015</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>{t('sections.experience.cassiintern')}</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.january')} 2010 - {t('date.months.july')} 2010</div>
                    <div className='body'>
                        <h2>Mundo da Web</h2>
                        <p>{t('sections.experience.mundodaweb')}</p>
                    </div>
                </p>
                <div className='timeline' />
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.techskills.title')}</h1>
            <div id='techskills' className='techSkills'>
                <ul>
                    <li className='skill-100'>React.JS<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-100'>React Native<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-100'>Javascript<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-100'>HTML<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-100'>CSS<span>{t('sections.techskills.level.advanced')}</span></li>
                </ul>
                <ul>
                    <li className='skill-70'>Java<span>{t('sections.techskills.level.intermediary')}</span></li>
                    <li className='skill-90'>.NET Core <span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-75'>Node.js<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-80'>PHP<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-60'>Python <span>{t('sections.techskills.level.intermediary')}</span></li>
                </ul>
                <ul>
                    <li className='skill-90'>MySQL <span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-70'>SQL Server <span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-70'>MongoDB <span>{t('sections.techskills.level.intermediary')}</span></li>
                    <li className='skill-80'>Joomla <span>{t('sections.techskills.level.intermediary')}</span></li>
                    <li className='skill-90'>Wordpress <span>{t('sections.techskills.level.advanced')}</span></li>
                </ul>
                <ul>
                    <li className='skill-50'>Openshift<span>{t('sections.techskills.level.basic')}</span></li>
                    <li className='skill-40'>Keycloak<span>{t('sections.techskills.level.basic')}</span></li>
                    <li className='skill-40'>RHSSO<span>{t('sections.techskills.level.basic')}</span></li>
                    <li className='skill-20'>3Scale <span>{t('sections.techskills.level.basic')}</span></li>
                    <li className='skill-50'>Agile<span>{t('sections.techskills.level.intermediary')}</span></li>
                </ul>
                <ul>
                    <li className='skill-90'>Docker<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-90'>Jenkins<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-90'>Git<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-90'>Azure DevOPS<span>{t('sections.techskills.level.advanced')}</span></li>
                    <li className='skill-100'>REST<span>{t('sections.techskills.level.advanced')}</span></li>
                </ul>
                <ul>
                    <li className='skill-20'>SOAP<span>{t('sections.techskills.level.basic')}</span></li>
                    <li className='skill-20'>Kubernetes<span>{t('sections.techskills.level.basic')}</span></li>
                    <li className='skill-90'>Typescript <span>{t('sections.techskills.level.advanced')}</span></li>
                </ul>
            </div>
            <div className='separator' />
            <h1 id='academic' className='title'>{t('sections.academic.title')}</h1>
            <div className='academic'>
                <img src={logoUniceub} alt="logo-uniceub" />
                <h3>{t('sections.academic.computerscience', {university:'UniCEUB'})}</h3>
                <p><b>{t('sections.academic.graduation')}</b> <br /> Jan/2014 - Dez/2019</p>
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.language.title')}</h1>
            <div id='language' className='language'>
                <div>
                    <h3>{t('sections.language.portuguese')}</h3>
                    <p><b>{t('sections.language.native')}</b></p>
                </div>
                <div>
                    <h3>{t('sections.language.english')}</h3>
                    <p><b>{t('sections.language.intermediary')}</b></p>
                </div>
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.portfolio.title')}</h1>
            <div id='portfolio' className='portfolio'>
                <div>
                    <img src={logoPurple} alt='logo-purple' />
                    <h3>Purple</h3>
                    <p>{t('sections.portfolio.purple')}</p>
                </div>
                <div>
                    <img src={logoGoObra}  alt='logo-goobra'/>
                    <h3>GoObra</h3>
                    <p>{t('sections.portfolio.goobra')}</p>
                </div>
                <div>
                    <img src={logo7virtual}  alt='logo-7virtual'/>
                    <h3>7Virtual</h3>
                    <p>{t('sections.portfolio.7virtual')}</p>
                </div>
            </div>
        </div>
    )
}
