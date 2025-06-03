// components/MeetingRoom.tsx
import {
  CallingState,
  CallParticipantsList,
  useCall, // Keep useCall if CustomCallControls or other parts need it directly
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import React, { useState, useEffect, useRef } from 'react'; // FormEvent and Input removed as chat logic is in MeetingChat
import { io, Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import MeetingChat from './MeetingChat'; // This is good
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, MessageSquare, LayoutDashboard } from 'lucide-react'; // Send, X are in MeetingChat
import { useRouter, useSearchParams } from 'next/navigation';
import EndCallButton from './EndCallButton';
import Loader from './Loader';
import CustomCallControls from './CustomControls';
import { Button } from './ui/button';
import VideoStreamArea from './VideoStreamArea'; // This is good

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
  type?: 'user-message' | 'notification';
}

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const call = useCall();
  const [meetingIdFromCall, setMeetingIdFromCall] = useState<string | null>(null);

  const { useCallCallingState, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const router = useRouter();

  const [layout, setLayout] = useState<CallLayoutType>('grid'); // Default to grid, can be changed by Dropdown
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (call?.id) {
        setMeetingIdFromCall(call.id);
    }
  }, [call?.id]);

  useEffect(() => {
    if (!meetingIdFromCall || !localParticipant?.userId) {
      // console.log("MeetingRoom: Waiting for meetingId or localParticipant to connect chat socket.");
      return;
    }
    const newSocket = io(SOCKET_SERVER_URL);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
        if (localParticipant?.userId && meetingIdFromCall) {
            newSocket.emit('join-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name || localParticipant.userId);
        }
    });
    newSocket.on('connect_error', (err) => console.error('Socket.IO: Connection error - ', err.message, err));
    
    const messageListener = (message: Omit<ChatMessage, 'isLocal'>) => {
      if (localParticipant?.userId) {
        setChatMessages((prevMessages) => [...prevMessages, { ...message, isLocal: message.senderId === localParticipant.userId }]);
      }
    };
    newSocket.on('receive-chat-message', messageListener);
    
    const userJoinedListener = (data: ChatMessage) => setChatMessages((prevMessages) => [...prevMessages, { ...data, isLocal: false }]);
    newSocket.on('user-joined-chat', userJoinedListener);
    
    const userLeftListener = (data: ChatMessage) => setChatMessages((prevMessages) => [...prevMessages, { ...data, isLocal: false }]);
    newSocket.on('user-left-chat', userLeftListener);

    return () => {
      if (newSocket && meetingIdFromCall && localParticipant?.userId) {
        newSocket.emit('leave-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name || localParticipant.userId);
        newSocket.disconnect();
      }
      socketRef.current = null;
    };
  }, [meetingIdFromCall, localParticipant?.userId, localParticipant?.name]);


  if (callingState !== CallingState.JOINED) return <Loader />; // Removed !localParticipant as JOINED implies localParticipant exists.

  // The main structure is simplified to be closer to the working version
  // while still using VideoStreamArea for video rendering.
  return (
    <section className='relative h-screen w-full flex flex-col overflow-hidden text-white bg-dark-2'>
        {/* Main content area: Video and Sidebars */}
        <div className='flex flex-1 min-h-0'> {/* Ensure this container can shrink and allows children to scroll */}
            
            {/* Video Area - Simplified to mirror the old structure's focus */}
            <div className='relative flex-1 flex items-center justify-center p-1 sm:p-2 md:p-4'>
                {/* The VideoStreamArea itself should handle the max-width and centering of its content */}
                <VideoStreamArea layout={layout} />
            </div>

            {/* Participants Sidebar */}
            {/* Using show-block style similar to old version for conditional rendering, ensure 'show-block' is defined or use ternary */}
            <div className={cn(
                'h-full bg-dark-1 border-l border-gray-700 flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out',
                showParticipants ? 'w-[250px] sm:w-[300px] p-3' : 'w-0 p-0 opacity-0 pointer-events-none' // Adjusted width and padding
            )}>
                {showParticipants && (
                    <CallParticipantsList onClose={() => setShowParticipants(false)} />
                )}
            </div>

            {/* Chat Sidebar - Kept similar to your new version */}
            <MeetingChat
                showChat={showChat}
                setShowChat={setShowChat}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages} // Pass down if MeetingChat needs to modify (e.g., clear messages)
                socketRef={socketRef}
                meetingId={meetingIdFromCall!}
                localUserId={localParticipant!.userId} // Assert non-null as we are in JOINED state
                localUserName={localParticipant!.name}
            />
        </div>

        {/* Controls Bar - Kept similar */}
        <div className='flex-shrink-0 w-full flex items-center justify-center gap-2 md:gap-4 p-3 flex-wrap bg-dark-1/90 backdrop-blur-md border-t border-gray-700 min-h-[70px] sm:min-h-[80px]'>
            <CustomCallControls onLeave={() => {
                // Ensure socket cleanup happens before navigation if onLeave in CustomCallControls doesn't handle it
                if (socketRef.current && meetingIdFromCall && localParticipant?.userId) {
                    socketRef.current.emit('leave-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name);
                    socketRef.current.disconnect(); // Good to disconnect here as well
                    socketRef.current = null;
                }
                router.push('/');
            }}/>
            
            

            <Button 
                variant="outline"
                onClick={() => setShowParticipants((prev) => !prev)}
                className={cn(
                    'p-2.5 transition-colors border-none rounded-full',
                    showParticipants ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-dark-3 hover:bg-gray-700 text-gray-300 hover:text-white'
                )}
                title="Participants"
            >
              <Users size={20}/>
            </Button>

            <Button 
                variant="outline"
                onClick={() => setShowChat((prev) => !prev)}
                className={cn(
                    'p-2.5 transition-colors border-none rounded-full',
                    showChat ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-dark-3 hover:bg-gray-700 text-gray-300 hover:text-white'
                )}
                title="Chat"
            >
              <MessageSquare size={20}/>
            </Button>

            {!isPersonalRoom && <EndCallButton />}
        </div>
    </section>
  );
}

export default MeetingRoom;