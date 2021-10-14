import React, { ReactElement } from 'react'
import { Link } from "react-router-dom";
import HeaderMenu from './HeaderMenu';

interface Props {
    
}

export default function Menu({}: Props): ReactElement {
    const onClick = (a: any) => {
        console.log('clicou'+ a);
        return false;
    }
    return (
        <div className='leftMenu'>
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
