import React, { ReactNode } from 'react'
import StreamVProvider from '@/providers/StreamClientProvider'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Nexus",
    description: "Video Calling App",
    icons: {
      icon: '/icons/nexus_logo.png'
    }
};

const RootLayout = ({ children }: { children: ReactNode }) => {
    return (
        <main>
            <StreamVProvider>
                {children}
            </StreamVProvider>
            
        </main>
    )
}

export default RootLayout