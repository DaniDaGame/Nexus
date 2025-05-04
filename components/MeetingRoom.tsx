import { CallControls, CallingState, CallParticipantsList, PaginatedGridLayout, SpeakerLayout, useCallStateHooks } from '@stream-io/video-react-sdk';
import React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import EndCallButton from './EndCallButton';
import Loader from './Loader';
import CustomCallControls from './CustomControls';


type callLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams(); 
  const isPersonalRoom = !!searchParams.get('personal')
  const [layout, setLayout] = useState<callLayoutType>('speaker-left')
  const [showPaticipants, setShowPaticipants] = useState(false);
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const router = useRouter();

  if(callingState !== CallingState.JOINED) return <Loader />


  const CallLayout = () => {
    switch (layout) {
        default:
            return <PaginatedGridLayout />
            break;
    }
  }

  return (
    <section className='relative h-screen w-full overflow-hidden pt-4 text-white'>
        <div className='relative flex size-full items-center justify-center'>
            <div className='flex size-full max-w-[1000px] items-center'>
                <CallLayout />
            </div>
            <div className={cn('h-[calc(100vh-86px)] hidden ml-2', { 'show-block': showPaticipants })}>
                <CallParticipantsList onClose={() => setShowPaticipants(false)}/>
            </div>
        </div>

        <div className='fixed bottom-0 flex w-full items-center justify-center gap-5 flex-wrap'>
            <CustomCallControls onLeave = {() => {router.push('/')}}/>
            
            <DropdownMenu>
            <div className='flex items-center'>
            <DropdownMenuTrigger></DropdownMenuTrigger>
            </div>
            <DropdownMenuContent>
              <DropdownMenuSeparator />
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={() => setShowPaticipants((prev) => !prev)}>
            <div className='cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]'>
              <Users size={20} className='text-white'/>
            </div>
          </button>
          {!isPersonalRoom && <EndCallButton />}
            
        </div>
    </section>
  )
}

export default MeetingRoom