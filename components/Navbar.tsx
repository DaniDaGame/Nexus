import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import MobileNav from './MobileNav'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

const Navbar = () => {
  return (
    <nav className='flex-between fixed z-50 w-full bg-dark-1 px-6 py-4 lg:px-10'>
      <Link href='/' className='flex items-center gap-1'>
        <Image 
        src='/icons/nexus_logo.png' 
        width={32} 
        height={32}
        alt='Nexus logo'
        className='max-sm:size-10'/>
        <p className='text-[26px] font-extrabold text-white max-sm:hidden'>Nexus</p> 
      </Link>
      <div className='flex-between gap-5'>
        <SignedIn>
          <UserButton/>
        </SignedIn>
        
        <MobileNav />
      </div>
    </nav>
  )
}

export default Navbar