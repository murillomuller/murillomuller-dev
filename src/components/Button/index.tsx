import React, { ReactElement } from 'react'

interface Props {
    type?: string;
    children: any;
    className?: string;
    to?: string
}

export default function Button({type, children, to, className}: Props): ReactElement {
    return (
        <a href={to} className={`button ${type} ${className}`}>
            {children}
        </a>
    )
}
