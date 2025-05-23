'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation'
import Link from 'next/link';
import Image from 'next/image';
import React from 'react'


const Sidebar = () => {
    const pathname = usePathname();
  return (
    <section className='sticky left-0 top-0 flex h-screen w-fit flex-col justify-between bg-dark-1 p-6 pt-28 text-white max-sm:hidden lg:w-[264px]'>
        <div className='flex flex-1 flex-col gap-6'>
            {sidebarLinks.map((link) => {
                const isActive = link.route === '/'
                ? pathname === '/' 
                : pathname.startsWith(link.route); 
                return (
                <Link 
                href = { link.route }
                key = { link.lable }
                className = {cn('flex gap-4 items-center p-4 rounded-xl justify-start', {
                    'bg-blue-1': isActive,
                    })}
                >
                    <Image 
                        src = {link.imgUrl}
                        alt = {link.lable}
                        width = {24}
                        height = {24}
                    />
                    <p className='text-lg font-semibold max-lg:hidden'>
                        {link.lable}
                    </p>
                </Link>)
                })}
        </div>
    </section>
  )
}

export default Sidebar