import React, { ReactElement } from 'react'
import profilePic from '../../assets/profile_pic.jpg';

export default function Avatar(): ReactElement {
    return (
            <img className='profileAvatar' src={profilePic} alt='profilepic'/>
    )
}
