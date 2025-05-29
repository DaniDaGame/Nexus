// components/MeetingRoom.tsx
import {
  CallControls, // Keep if CustomCallControls doesn't replace it entirely
  CallingState,
  CallParticipantsList,
  PaginatedGridLayout,
  SpeakerLayout, // Keep if you plan to use other layouts
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
} from "@/components/ui/dropdown-menu" // Keep if layout dropdown is planned
import { Users, MessageSquare, Send, X } from 'lucide-react'; // Added MessageSquare, Send, X
import { useRouter, useSearchParams } from 'next/navigation';
import EndCallButton from './EndCallButton';
import Loader from './Loader';
import CustomCallControls from './CustomControls'; // Your existing custom controls
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
  const call = useCall(); // Stream call object
  const [meetingIdFromCall, setMeetingIdFromCall] = useState<string | null>(null);


  const { useCallCallingState, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const router = useRouter();

  // Original states
  const [layout, setLayout] = useState<CallLayoutType>('grid'); // Default to grid as per your original
  const [showParticipants, setShowParticipants] = useState(false);

  // Chat specific states
  const [showChat, setShowChat] = useState(false); // Start with chat hidden
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Set meetingId when call object is available
  useEffect(() => {
    if (call?.id) {
        setMeetingIdFromCall(call.id);
    }
  }, [call?.id]);


  // Initialize and manage Socket.IO connection
  useEffect(() => {
    if (!meetingIdFromCall || !localParticipant?.userId) {
      console.log("MeetingRoom: Waiting for meetingId or localParticipant to connect chat socket.");
      return;
    }

    // Connect to Socket.IO server
    const newSocket = io(SOCKET_SERVER_URL);
    socketRef.current = newSocket;
    console.log(`Socket.IO: Attempting to connect to ${SOCKET_SERVER_URL}`);

    newSocket.on('connect', () => {
        console.log(`Socket.IO: Connected with id ${newSocket.id}`);
        // Join the meeting room on the socket server
        newSocket.emit('join-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name || localParticipant.userId);
    });

    newSocket.on('connect_error', (err) => {
            // console.error('Socket.IO: Connection error - ', err.message, err.data); // השורה הבעייתית
            console.error('Socket.IO: Connection error - ', err.message, err); // הדפס את כל האובייקט err
        });


    // Listener for new chat messages
    const messageListener = (message: Omit<ChatMessage, 'isLocal'>) => {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
            ...message,
            isLocal: message.senderId === localParticipant.userId,
            // type will be set by server for notifications
        },
      ]);
    };
    newSocket.on('receive-chat-message', messageListener);

    // Listener for user joined notifications
    const userJoinedListener = (data: ChatMessage) => { // Assuming server sends full ChatMessage for notifications
        setChatMessages((prevMessages) => [...prevMessages, { ...data, isLocal: false }]);
    };
    newSocket.on('user-joined-chat', userJoinedListener);

    // Listener for user left notifications
    const userLeftListener = (data: ChatMessage) => { // Assuming server sends full ChatMessage for notifications
        setChatMessages((prevMessages) => [...prevMessages, { ...data, isLocal: false }]);
    };
    newSocket.on('user-left-chat', userLeftListener);

    // Cleanup on component unmount
    return () => {
      if (newSocket && meetingIdFromCall && localParticipant?.userId) {
        console.log(`Socket.IO: Emitting leave-meeting-room for ${meetingIdFromCall}`);
        newSocket.emit('leave-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name || localParticipant.userId);
        newSocket.disconnect();
        console.log("Socket.IO: Disconnected.");
      }
      socketRef.current = null;
    };
  }, [meetingIdFromCall, localParticipant?.userId, localParticipant?.name]); // Dependencies for re-connecting if they change

  // Scroll to bottom of chat when new messages arrive
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
      // type is implicitly 'user-message' when sent by user
    };

    socketRef.current.emit('send-chat-message', messageData);
    setChatInput('');
  };

  // Original CallLayout function
  const CallLayout = () => {
    switch (layout) {
        // case 'speaker-left': // Example for future
        //     return <SpeakerLayout participantsBarPosition="left"/>;
        // case 'speaker-right': // Example for future
        //     return <SpeakerLayout participantsBarPosition="right"/>;
        case 'grid':
        default:
            return <PaginatedGridLayout />;
    }
  };

  return (
    <section className='relative h-screen w-full overflow-hidden text-white bg-dark-2'>
        <div className='flex flex-1 overflow-hidden h-[calc(100vh-80px)]'> {/* Adjusted height for control bar */}
            {/* Main Video Area - Takes remaining space */}
            <div className='flex-1 p-3 md:p-4 flex items-center justify-center overflow-hidden min-w-0'>
                <div className='w-full h-full max-w-[1200px]'> {/* Max width for video content */}
                    <CallLayout />
                </div>
            </div>

            {/* Participants Sidebar */}
            {showParticipants && (
                <div className="w-[300px] md:w-[350px] h-full bg-dark-1 border-l border-gray-700 p-4 flex flex-col flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-semibold">Participants</h2>
                        <Button variant="ghost" size="icon" onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </Button>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        <CallParticipantsList onClose={() => setShowParticipants(false)} />
                    </div>
                </div>
            )}

            {/* Chat Sidebar */}
            {showChat && (
              <div className="w-[300px] md:w-[350px] h-full bg-dark-1 border-l border-gray-700 flex flex-col p-4 flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
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
                <form onSubmit={sendChatMessage} className="flex gap-2 mt-auto pt-2 border-t border-gray-700">
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
              </div>
            )}
        </div>

        {/* Controls Bar - Original structure */}
        <div className='fixed bottom-0 left-0 w-full flex items-center justify-center gap-3 md:gap-5 p-3 flex-wrap bg-dark-1/80 backdrop-blur-sm border-t border-gray-700 h-[70px]'>
            <CustomCallControls onLeave = {() => {
                if (socketRef.current && meetingIdFromCall && localParticipant?.userId) {
                    socketRef.current.emit('leave-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name);
                }
                router.push('/');
            }}/>
            
            {/* Your original DropdownMenu for layouts - keep if planned */}
            {/* <DropdownMenu>
                <div className='flex items-center'>
                    <DropdownMenuTrigger asChild>
                         <button className='p-2.5 rounded-full cursor-pointer bg-dark-3 hover:bg-gray-700' title="Layout">
                            <LayoutDashboard size={20} className="text-white" />
                         </button>
                    </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent className="bg-dark-1 text-white border-gray-700">
                    <DropdownMenuLabel>Layout</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700"/>
                    <DropdownMenuItem onClick={() => setLayout('grid')} className="hover:!bg-gray-700">Grid</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLayout('speaker-left')} className="hover:!bg-gray-700">Speaker Left</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLayout('speaker-right')} className="hover:!bg-gray-700">Speaker Right</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu> */}

            <button 
                onClick={() => setShowParticipants((prev) => !prev)}
                className={cn(
                    'p-2.5 rounded-full cursor-pointer transition-colors',
                    showParticipants ? 'bg-blue-600 text-white' : 'bg-dark-3 hover:bg-gray-700 text-gray-300 hover:text-white'
                )}
                title="Participants"
            >
              <Users size={20}/>
            </button>

            <button 
                onClick={() => setShowChat((prev) => !prev)}
                className={cn(
                    'p-2.5 rounded-full cursor-pointer transition-colors',
                    showChat ? 'bg-blue-600 text-white' : 'bg-dark-3 hover:bg-gray-700 text-gray-300 hover:text-white'
                )}
                title="Chat"
            >
              <MessageSquare size={20}/>
            </button>

            {!isPersonalRoom && <EndCallButton />}
        </div>
    </section>
  )
}

export default MeetingRoom;