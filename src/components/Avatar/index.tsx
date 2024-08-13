import React, { ReactElement, useState, useEffect } from 'react';

export default function Avatar(): ReactElement {
    const [profilePic, setProfilePic] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfilePic = async () => {
            try {
                const response = await fetch('/settings/config.json');
                const config = await response.json();
                if (config && config.profilePic) {
                    setProfilePic(config.profilePic);
                } else {
                    console.error('Profile picture not found in config');
                }
            } catch (error) {
                console.error('Error loading config.json:', error);
            }
        };

        fetchProfilePic();
    }, []);

    return (
        <div>
            {profilePic ? (
                <img className='profileAvatar' src={profilePic} alt='profilepic' />
            ) : (
                <p>Loading profile picture...</p>
            )}
        </div>
    );
}
