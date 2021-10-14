import React from 'react'
import Button from '../../components/Button';
import { faDownload, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import logoUniceub from '../../assets/logo_uniceub.png';
import logoPurple from '../../assets/logo_purple.png';
import logoGoObra from '../../assets/logo_goobra.png';
import logo7virtual from '../../assets/logo_7virtual.png';

export default function index() {
    return (
        <div>
            <div className='about'>
                <h1>Olá,</h1>
                <p>Eu sou o Murillo, sou um desenvolvedor nascido em Londrina - PR. Sou formado em Ciência da Computação pelo UniCEUB, trabalho com desenvolvimento a mais de 8 anos e sou apaixonado por tecnologia.</p>
                <p>Desde pequeno sempre gostei de computador, e em uma de minhas pesquisas online encontrei a programação, um mundo totalmente novo. Então por conta própria com 14 anos resolvi aprender a programar e acabei descobrindo que era algo que me divertia muito mais do que jogos online.</p>
                <p>Sempre venho tentando me atualizar e buscar por novas tecnologias e me aventurando com desenvolvimento de projetos pessoais e no trabalho. </p>
                <div className='mt-40'>
                    <Button to='#'><FontAwesomeIcon icon={faDownload} />{' '} Download CV</Button>{' '}
                    <Button type='secondary' className='mt-20' to='#'><FontAwesomeIcon icon={faEnvelope} />{' '} Fale Comigo</Button>
                </div>
            </div>
            <div className='separator' />
            <h1 className='title'>Experiência Profissional</h1>
            <div className='experience'>
                <p className='xp'>
                    <div className='title'>Junho 2021 - Atual</div>
                    <div className='body'>
                        <h2>Inmetrics</h2>
                        <p>Engenheiro de Software Sênior, atuo no time mobile frontend desenvolvimento e evoluindo em um projeto para uma Fintech. Trabalhando principalmente com React Native.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>Junho 2019 - Junho 2021</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>Analista Pleno, atuei no time mobile e arquitetura, participando de grandes projetos de criação de aplicativo e desenvolvimento de apis. Trabalhei com React Native, React.JS, Java (Camel Spring Boot), 3Scale, Openshift.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>Junho 2018 - Junho 2019</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>Analista Júnior, atuei no time de sustentação e arquitetura participando de grandes projetos na estruturação de tecnologia da CASSI, trabalhei com Openshift, RHSSO, 3Scale, Java(Camel Sprint Boot), .NET CORE, React.JS, React Native.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>Junho 2016 - Junho 2018</div>
                    <div className='body'>
                        <h2>Stefanini</h2>
                        <p>Programador Intermediário, atuei como terceirizado dentro do time de Marketing da CASSI, ajudando a manter o website e criando hotsites para a empresa, trabalhando com HTML, JS, CSS, Joomla.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>Junho 2015 - Junho 2016</div>
                    <div className='body'>
                        <h2>Stefanini</h2>
                        <p>Programador Básico, atuei como terceirizado dentro do time de TI da CASSI, em projetos grandes dentro da empresa utilizando C#, Asp.NET MVC, HTML, CSS, Javascript. </p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>Junho 2014 - Junho 2015</div>
                    <div className='body'>
                        <h2>CASSI</h2>
                        <p>Estagiário, atuei na Caixa de Assistência dos Funcionários do Banco do Brasil. Lá auxiliei na manutenção e desenvolvimento de alguns sistemas C#, Asp.Net MVC, HTML, CSS, Javascript.</p>
                    </div>
                </p>
                <p className='xp'>
                    <div className='title'>Janeiro 2010 - Julho 2010</div>
                    <div className='body'>
                        <h2>Mundo da Web</h2>
                        <p>Atuei como Colaborador em um projeto de reformulação do website de Geotecnia da UNB - Universidade de Brasília, e também atuei na parte de manutenção de websites.</p>
                    </div>
                </p>
                <div className='timeline' />
            </div>
            <div className='separator' />
            <h1 className='title'>Conhecimentos Técnicos</h1>
            <div className='techSkills'>
                <ul>
                    <li className='skill-100'>React.JS<span>Avançado</span></li>
                    <li className='skill-100'>React Native<span>Avançado</span></li>
                    <li className='skill-100'>Javascript<span>Avançado</span></li>
                    <li className='skill-100'>HTML<span>Avançado</span></li>
                    <li className='skill-100'>CSS<span>Avançado</span></li>
                </ul>
                <ul>
                    <li className='skill-70'>Java<span>Intermediário</span></li>
                    <li className='skill-90'>.NET Core <span>Avançado</span></li>
                    <li className='skill-75'>Node.js<span>Avançado</span></li>
                    <li className='skill-80'>PHP<span>Avançado</span></li>
                    <li className='skill-60'>Python <span>Intermediário</span></li>
                </ul>
                <ul>
                    <li className='skill-90'>MySQL <span>Avançado</span></li>
                    <li className='skill-70'>SQL Server <span>Avançado</span></li>
                    <li className='skill-70'>MongoDB <span>Intermediário</span></li>
                    <li className='skill-80'>Joomla <span>Intermediário</span></li>
                    <li className='skill-90'>Wordpress <span>Avançado</span></li>
                </ul>
                <ul>
                    <li className='skill-50'>Openshift<span>Básico</span></li>
                    <li className='skill-40'>Keycloak<span>Básico</span></li>
                    <li className='skill-40'>RHSSO<span>Básico</span></li>
                    <li className='skill-20'>3Scale <span>Básico</span></li>
                </ul>
            </div>
            <div className='separator' />
            <h1 className='title'>Formação Acadêmica</h1>
            <div className='academic'>
                <img src={logoUniceub} />
                <h3>Ciência da Computação pelo UniCEUB</h3>
                <p><b>Graduação</b> <br /> Jan/2014 - Dez/2019</p>
            </div>
            <div className='separator' />
            <h1 className='title'>Idiomas</h1>
            <div className='language'>
                <div>
                    <h3>Português</h3>
                    <p><b>Nativo</b></p>
                </div>
                <div>
                    <h3>Inglês</h3>
                    <p><b>Intermediário</b></p>
                </div>
            </div>
            <div className='separator' />
            <h1 className='title'>Portfólio</h1>
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
