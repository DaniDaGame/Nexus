'use client'

import { DeviceSettings, useCall, VideoPreview } from '@stream-io/video-react-sdk';
import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from './ui/button';

const MeetingSetup = ({ setIsSetupComplete }: { setIsSetupComplete : (value: boolean) => void}) => {
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);
  
  const call = useCall();

  if(!call) {
    throw new Error('usecall must be used in streamcall component');
  }

  useEffect(() => {
    if(!call) return; 

    if(isMicCamToggledOn) { 
        call.camera.disable();
        call.microphone.disable();
    } else { 
        call.camera.enable();
        call.microphone.enable();
    }
}, [isMicCamToggledOn, call?.camera, call?.microphone, call]);

  return (
    <div className='flex h-screen w-full flex-col items-center justify-center gap-3 text-white'>
        <h1 className='text-2xl font-bold'>Setup</h1>
        <VideoPreview />
        <div className='flex h-16 items-center justify-center gap-3'>
            <label className='flex items-center justify-center gap-2 font-medium'>
                <input 
                type="checkbox"
                checked={isMicCamToggledOn}
                onChange={(e) => setIsMicCamToggledOn(e.target.checked)} //event to check if mic&|cam waas toggeled on 
                 />
                 join without microphone and camera
            </label>
            <DeviceSettings />
        </div>
        <Button className='rounded bg-blue-1 px-4 py-2.5' onClick={() => {call.join(); setIsSetupComplete(true);}}>
            Join Meeting
        </Button>
    </div>
  )
}

export default MeetingSetup