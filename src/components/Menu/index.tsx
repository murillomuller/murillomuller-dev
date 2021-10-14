import React, { ReactElement } from 'react'
import { Link } from "react-router-dom";
import HeaderMenu from './HeaderMenu';
import { useTranslation } from "react-i18next";

import flagBrazil from "../../assets/brazil_flag.png"
import flagUsa from "../../assets/usa_flag.png"
interface Props {
    
}

export default function Menu({}: Props): ReactElement {
  const { t, i18n } = useTranslation('common');

    const onClick = (a: any) => {
        console.log('clicou'+ a);
        return false;
    }
    return (
        <div className='leftMenu'>
          <div className='flags'>
                <span onClick={() => i18n.changeLanguage('br')}><img src={flagBrazil} alt='flag-brazil' width='20px' /></span>
                <span onClick={() => i18n.changeLanguage('en')}><img src={flagUsa} alt='flag-usa' width='20px' /></span>
            </div>
            <HeaderMenu />
             <nav>
               <ul>
                 <li>
                   <Link to="#sobre">Sobre</Link>
                 </li>
                 <li>
                   <Link to="#experiencia-profissional" onClick={onClick}>Experiência Profissional</Link>
                 </li>
                 <li>
                   <Link to="#conhecimentos-tecnicos">Conhecimentos Técnicos</Link>
                 </li>
                 <li>
                   <Link to="#formacao-academica">Formação Acadêmica</Link>
                 </li>
                 <li>
                   <Link to="#idiomas">Idiomas</Link>
                 </li>
                 <li>
                   <Link to="#portfolio">Portfólio</Link>
                 </li>
               </ul>
             </nav>
        </div>
    )
}
