import React, { ReactElement } from 'react'
import Avatar from '../../Avatar'
import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";



export default function HeaderMenu(): ReactElement {
    const { t } = useTranslation('common');
    return (
        <div className='headerMenu'>
            
            <Avatar />
            <h3>Murillo Müller</h3>
            <span>{t('profile.role')}</span>
            <div className='contacts'>
                <a href='https://github.com/murillomuller' target='_blank' className='github' rel='noreferrer'><FontAwesomeIcon icon={faGithub} /></a>
                <a href='https://www.linkedin.com/in/murillomuller/' target='_blank' className='linkedin' rel='noreferrer'><FontAwesomeIcon icon={faLinkedin} /></a>
            </div>
        </div>
    )
}
