import React from 'react'
import { PAYLOAD_PUBLIC_SERVER_URL } from '@/constants/env'

export const BeforeLogin: React.FC = () => {
  return (
    <div>
      <p>
        <b>Welcome to your dashboard!</b>
        {' This is where site admins will log in to manage your store. Customers will need to '}
        <a href={`${PAYLOAD_PUBLIC_SERVER_URL}/login`}>log in to the site instead</a>
        {' to access their user account, order history, and more.'}
      </p>
    </div>
  )
}
