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
            <div className='about'>
                <h1>{t('sections.about.hi')},</h1>
                <p>{t('sections.about.first')}</p>
                <p>{t('sections.about.second')}</p>
                <p>{t('sections.about.third')} </p>
                <div className='mt-40'>
                    <Button to='#'><FontAwesomeIcon icon={faDownload} />{' '} Download CV</Button>{' '}
                    <Button type='secondary' className='mt-20' to='#'><FontAwesomeIcon icon={faEnvelope} />{' '} {t('sections.about.contactme')}</Button>
                </div>
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.experience.title')}</h1>
            <div className='experience'>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2021 - {t('common.current')}</div>
                    <div className='body'>
                        <h2>Inmetrics</h2>
                        <p>Engenheiro de Software Sênior, atuo no time mobile frontend desenvolvimento e evoluindo em um projeto para uma Fintech. Trabalhando principalmente com React Native.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2019 - {t('date.months.june')} 2021</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>Analista Pleno, atuei no time mobile e arquitetura, participando de grandes projetos de criação de aplicativo e desenvolvimento de apis. Trabalhei com React Native, React.JS, Java (Camel Spring Boot), 3Scale, Openshift.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2018 - {t('date.months.june')} 2019</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>Analista Júnior, atuei no time de sustentação e arquitetura participando de grandes projetos na estruturação de tecnologia da CASSI, trabalhei com Openshift, RHSSO, 3Scale, Java(Camel Sprint Boot), .NET CORE, React.JS, React Native.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2016 - {t('date.months.june')} 2018</div>
                    <div className='body'>
                        <h2>Stefanini</h2>
                        <p>Programador Intermediário, atuei como terceirizado dentro do time de Marketing da CASSI, ajudando a manter o website e criando hotsites para a empresa, trabalhando com HTML, JS, CSS, Joomla.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2015 - {t('date.months.june')} 2016</div>
                    <div className='body'>
                        <h2>Stefanini</h2>
                        <p>Programador Básico, atuei como terceirizado dentro do time de TI da CASSI, em projetos grandes dentro da empresa utilizando C#, Asp.NET MVC, HTML, CSS, Javascript. </p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.june')} 2014 - {t('date.months.june')} 2015</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>Estagiário, atuei na Caixa de Assistência dos Funcionários do Banco do Brasil. Lá auxiliei na manutenção e desenvolvimento de alguns sistemas C#, Asp.Net MVC, HTML, CSS, Javascript.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>{t('date.months.january')} 2010 - {t('date.months.july')} 2010</div>
                    <div className='body'>
                        <h2>Mundo da Web</h2>
                        <p>Atuei como Colaborador em um projeto de reformulação do website de Geotecnia da UNB - Universidade de Brasília, e também atuei na parte de manutenção de websites.</p>
                    </div>
                </p>
                <div className='timeline' />
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.techskills.title')}</h1>
            <div className='techSkills'>
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
                </ul>
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.academic.title')}</h1>
            <div className='academic'>
                <img src={logoUniceub} alt="logo-uniceub" />
                <h3>{t('sections.academic.computerscience', {university:'UniCEUB'})}</h3>
                <p><b>{t('sections.academic.graduation')}</b> <br /> Jan/2014 - Dez/2019</p>
            </div>
            <div className='separator' />
            <h1 className='title'>{t('sections.language.title')}</h1>
            <div className='language'>
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
            <div className='portfolio'>
                <div>
                    <img src={logoPurple} />
                    <h3>Purple</h3>
                    <p>Aplicativo de cartão fidelidade para uma empresa de Brasília - DF, desenvolvido em React Native, com uma dashboard de gestão em React.JS, backend em .NET CORE, e banco de dados em MySQL.</p>
                </div>
                <div>
                    <img src={logoGoObra} />
                    <h3>GoObra</h3>
                    <p>Aplicativo de gestão de obras para uma empresa de Brasília - DF, planejado com AdobeXD, desenvolvido em React Native, com uma dashboard de gestão em React.JS, backend em .NET CORE, e banco de dados em MySQL.</p>
                </div>
                <div>
                    <img src={logo7virtual} />
                    <h3>7Virtual</h3>
                    <p>Sistema de deploy automatizado e gestão de aplicações em qualquer servidor linux, desenvolvido utilizando Python, NodeJS e MongoDB.</p>
                </div>
            </div>
        </div>
    )
}
