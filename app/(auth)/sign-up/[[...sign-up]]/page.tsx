import React from 'react'
import { SignUp } from '@clerk/nextjs'
import SignUpForm from './signUp'

const SignUpPage = () => {
  return (
    <main className='flex h-screen w-full items-center justify-center'>
        <SignUp />
    </main>
  )
}

export default SignUpPage