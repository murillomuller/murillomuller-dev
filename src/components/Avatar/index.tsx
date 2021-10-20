import React, { ReactElement } from 'react'
import profilePic from '../../assets/profile_pic.jpg';
interface Props {
    
}

export default function Avatar({}: Props): ReactElement {
    return (
            <img className='profileAvatar' src={profilePic} alt='profilepic'/>
    )
}
