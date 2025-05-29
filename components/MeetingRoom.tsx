// components/MeetingRoom.tsx
import {
  CallingState,
  CallParticipantsList,
  PaginatedGridLayout,
  SpeakerLayout,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Keep if layout dropdown is planned
import { Users, MessageSquare, Send, X, LayoutDashboard } from 'lucide-react'; // Added LayoutDashboard for example
import { useRouter, useSearchParams } from 'next/navigation';
import EndCallButton from './EndCallButton';
import Loader from './Loader';
import CustomCallControls from './CustomControls';
import { Input } from './ui/input';
import { Button } from './ui/button';

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

  const [layout, setLayout] = useState<CallLayoutType>('grid');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (call?.id) {
        setMeetingIdFromCall(call.id);
    }
  }, [call?.id]);

  useEffect(() => {
    if (!meetingIdFromCall || !localParticipant?.userId) return;

    const newSocket = io(SOCKET_SERVER_URL);
    socketRef.current = newSocket;
    console.log(`Socket.IO: Attempting to connect to ${SOCKET_SERVER_URL}`);

    newSocket.on('connect', () => {
        console.log(`Socket.IO: Connected with id ${newSocket.id}`);
        newSocket.emit('join-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name || localParticipant.userId);
    });

    newSocket.on('connect_error', (err) => {
        console.error('Socket.IO: Connection error - ', err.message, err);
    });

    const messageListener = (message: Omit<ChatMessage, 'isLocal'>) => {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { ...message, isLocal: message.senderId === localParticipant.userId },
      ]);
    };
    newSocket.on('receive-chat-message', messageListener);

    const userJoinedListener = (data: ChatMessage) => {
        setChatMessages((prevMessages) => [...prevMessages, { ...data, isLocal: false }]);
    };
    newSocket.on('user-joined-chat', userJoinedListener);

    const userLeftListener = (data: ChatMessage) => {
        setChatMessages((prevMessages) => [...prevMessages, { ...data, isLocal: false }]);
    };
    newSocket.on('user-left-chat', userLeftListener);

    return () => {
      if (newSocket && meetingIdFromCall && localParticipant?.userId) {
        newSocket.emit('leave-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name || localParticipant.userId);
        newSocket.disconnect();
      }
      socketRef.current = null;
    };
  }, [meetingIdFromCall, localParticipant?.userId, localParticipant?.name]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (callingState !== CallingState.JOINED || !localParticipant) {
    return <Loader />;
  }

  const sendChatMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current || !meetingIdFromCall || !localParticipant?.userId) return;
    const messageData = {
      meetingId: meetingIdFromCall,
      senderId: localParticipant.userId,
      senderName: localParticipant.name || localParticipant.userId,
      text: chatInput,
      timestamp: Date.now(),
    };
    socketRef.current.emit('send-chat-message', messageData);
    setChatInput('');
  };

  const CallLayoutComponent = () => { // Renamed for clarity
    switch (layout) {
        case 'speaker-left':
             return <SpeakerLayout participantsBarPosition="left"/>;
        case 'speaker-right':
             return <SpeakerLayout participantsBarPosition="right"/>;
        case 'grid':
        default:
            // Wrap PaginatedGridLayout to ensure it fills its container for centering
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <PaginatedGridLayout />
                </div>
            );
    }
  };

  // Tailwind classes for sidebar animation
  const sidebarTransitionClasses = "transition-all duration-500 ease-in-out"; // Increased duration

  return (
    <section className='relative h-screen w-full flex flex-col overflow-hidden text-white bg-dark-2'>
        {/* Main content area including video and sidebars */}
        <div className='flex flex-grow overflow-hidden h-[calc(100vh-80px)]'> {/* Adjusted height to ensure control bar is visible */}
            {/* Video Area - Will take remaining space */}
            <div className='flex-grow p-3 md:p-4 flex items-center justify-center overflow-hidden'>
                {/* This inner div helps in centering content if PaginatedGridLayout doesn't fill it */}
                <div className='w-full h-full max-w-[1400px]'> {/* Increased max-width for video */}
                    <CallLayoutComponent />
                </div>
            </div>

            {/* Participants Sidebar */}
            <div className={cn(
                'h-full bg-dark-1 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden',
                sidebarTransitionClasses,
                showParticipants ? 'w-[300px] md:w-[350px] p-3 md:p-4 opacity-100' : 'w-0 p-0 opacity-0'
            )}>
                {showParticipants && ( // Render content only when shown to help with animation
                    <>
                        <div className="flex justify-between items-center mb-3 flex-shrink-0">
                            <h2 className="text-lg font-semibold">Participants</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </Button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <CallParticipantsList onClose={() => setShowParticipants(false)} />
                        </div>
                    </>
                )}
            </div>

            {/* Chat Sidebar */}
            <div className={cn(
                'h-full bg-dark-1 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden',
                sidebarTransitionClasses,
                showChat ? 'w-[300px] md:w-[350px] p-3 md:p-4 opacity-100' : 'w-0 p-0 opacity-0'
            )}>
                {showChat && ( // Render content only when shown to help with animation
                    <>
                        <div className="flex justify-between items-center mb-3 flex-shrink-0">
                          <h2 className="text-lg font-semibold">Chat</h2>
                          <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                            <X size={20} />
                          </Button>
                        </div>
                        <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-3 space-y-2.5 pr-1">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex w-full ${msg.type === 'notification' ? 'justify-center' : (msg.isLocal ? 'justify-end' : 'justify-start')}`}
                            >
                              {msg.type === 'notification' ? (
                                <p className="text-xs text-gray-500 italic px-2 py-1 bg-dark-3 rounded-md my-1 text-center">
                                  {msg.text}
                                </p>
                              ) : (
                                <div
                                  className={`p-2.5 rounded-xl max-w-[85%] shadow ${
                                    msg.isLocal
                                      ? 'bg-blue-600 text-white rounded-br-none'
                                      : 'bg-dark-3 text-gray-200 rounded-bl-none'
                                  }`}
                                >
                                  {!msg.isLocal && (
                                    <p className="text-xs text-sky-400 mb-0.5 font-medium">{msg.senderName}</p>
                                  )}
                                  <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                  <p className={`text-[10px] mt-1.5 ${msg.isLocal ? 'text-blue-200' : 'text-gray-400'} text-right opacity-80`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <form onSubmit={sendChatMessage} className="flex gap-2 mt-auto pt-2 border-t border-gray-700 flex-shrink-0">
                          <Input
                            type="text"
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="bg-dark-3 border-gray-600 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 text-white placeholder-gray-500 flex-grow"
                          />
                          <Button type="submit" className="bg-blue-1 hover:bg-blue-700 p-2.5 aspect-square">
                            <Send size={18} />
                          </Button>
                        </form>
                    </>
                )}
            </div>
        </div>

        {/* Controls Bar */}
        <div className='flex-shrink-0 fixed bottom-0 left-0 w-full flex items-center justify-center gap-2 md:gap-4 p-3 flex-wrap bg-dark-1/90 backdrop-blur-md border-t border-gray-700 h-[80px]'> {/* Increased height slightly for better spacing */}
            <CustomCallControls onLeave = {() => {
                if (socketRef.current && meetingIdFromCall && localParticipant?.userId) {
                    socketRef.current.emit('leave-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name);
                }
                router.push('/');
            }}/>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button variant="outline" className='p-2.5 bg-dark-3 hover:bg-gray-700 border-gray-600 text-white' title="Layout">
                        <LayoutDashboard size={20} />
                     </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-dark-1 text-white border-gray-700">
                    <DropdownMenuLabel>Layout</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700"/>
                    <DropdownMenuItem onClick={() => setLayout('grid')} className="focus:bg-gray-700 focus:text-white">Grid</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLayout('speaker-left')} className="focus:bg-gray-700 focus:text-white">Speaker Left</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLayout('speaker-right')} className="focus:bg-gray-700 focus:text-white">Speaker Right</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button 
                variant="outline"
                onClick={() => setShowParticipants((prev) => !prev)}
                className={cn(
                    'p-2.5 transition-colors border-gray-600',
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
                    'p-2.5 transition-colors border-gray-600',
                    showChat ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-dark-3 hover:bg-gray-700 text-gray-300 hover:text-white'
                )}
                title="Chat"
            >
              <MessageSquare size={20}/>
            </Button>

            {!isPersonalRoom && <EndCallButton />}
        </div>
    </section>
  )
}

export default MeetingRoom;