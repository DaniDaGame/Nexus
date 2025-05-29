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
import { Users, MessageSquare, Send, X, LayoutDashboard } from 'lucide-react';
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
const CallLayoutComponent = () => { // <--- שם הפונקציה המעודכן
    switch (layout) {
        case 'speaker-left':
             return <SpeakerLayout participantsBarPosition="left"/>;
        case 'speaker-right':
             return <SpeakerLayout participantsBarPosition="right"/>;
        case 'grid':
        default:
            // עטיפה זו עוזרת למרכז את הרשת אם היא לא ממלאה את כל האזור
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <PaginatedGridLayout />
                </div>
            );
    }
  };
const sidebarTransitionClasses = "transition-all duration-300 ease-in-out";
  

return (
    <section className='relative h-screen w-full flex flex-col overflow-hidden text-white bg-dark-2'>
        {/* אזור התוכן הראשי (וידאו וסיידברים) */}
        <div className='flex flex-1 overflow-hidden'> {/* גובהו ייקבע על ידי flex-1 בתוך section */}
            {/* אזור הווידאו - יתפוס את השטח הנותר */}
            <div className='flex-1 p-3 md:p-4 flex items-center justify-center overflow-hidden min-w-0'>
                <div className='w-full h-full max-w-[1400px]'>
                    <CallLayoutComponent />
                </div>
            </div>

            {/* Participants Sidebar */}
            <div className={cn(
                'h-full bg-dark-1 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden',
                sidebarTransitionClasses,
                showParticipants ? 'w-[300px] md:w-[350px] p-3 md:p-4 opacity-100' : 'w-0 p-0 opacity-0 pointer-events-none'
            )}>
                {showParticipants && (
                    <div className="flex flex-col h-full"> {/* עטיפה פנימית */}
                        <div className="flex justify-between items-center mb-3 flex-shrink-0">
                            <h2 className="text-lg font-semibold">Participants</h2>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setShowParticipants(false)} 
                                className="text-gray-400 hover:text-white hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                aria-label="Close participants panel"
                            >
                                <X size={24} />
                            </Button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto stream-participants-list-container"> {/* שונה ל-flex-1 ו-min-h-0 */}
                            <CallParticipantsList onClose={() => setShowParticipants(false)} />
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Sidebar */}
            <div className={cn(
                'h-full bg-dark-1 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden',
                sidebarTransitionClasses,
                showChat ? 'w-[300px] md:w-[350px] p-3 md:p-4 opacity-100' : 'w-0 p-0 opacity-0 pointer-events-none'
            )}>
                {showChat && (
                    <div className="flex flex-col h-full"> {/* עטיפה פנימית */}
                        <div className="flex justify-between items-center mb-3 flex-shrink-0">
                          <h2 className="text-lg font-semibold">Chat</h2>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setShowChat(false)} 
                            className="text-gray-400 hover:text-white hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            aria-label="Close chat panel"
                          >
                            <X size={24} />
                          </Button>
                        </div>
                        <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto mb-3 space-y-2.5 pr-1"> {/* שונה ל-flex-1 ו-min-h-0 */}
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
                        <form onSubmit={sendChatMessage} className="flex gap-2 pt-2 border-t border-gray-700 flex-shrink-0">
                          <Input
                            type="text"
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="bg-dark-3 border-gray-600 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 text-white placeholder-gray-500 flex-grow rounded-md"
                          />
                          <Button type="submit" className="bg-blue-1 hover:bg-blue-700 p-2.5 aspect-square rounded-md">
                            <Send size={18} />
                          </Button>
                        </form>
                    </div>
                )}
            </div>
        </div>

        {/* Controls Bar - ילד ישיר של ה-section, עם גובה קבוע */}
        <div className='flex-shrink-0 w-full flex items-center justify-center gap-2 md:gap-4 p-3 flex-wrap bg-dark-1/90 backdrop-blur-md border-t border-gray-700 h-[80px]'>
            <CustomCallControls onLeave = {() => {
                if (socketRef.current && meetingIdFromCall && localParticipant?.userId) {
                    socketRef.current.emit('leave-meeting-room', meetingIdFromCall, localParticipant.userId, localParticipant.name);
                }
                router.push('/');
            }}/>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button variant="outline" className='p-2.5 bg-dark-3 hover:bg-gray-700 border-gray-600 text-white rounded-full' title="Layout">
                        <LayoutDashboard size={20} />
                     </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-dark-1 text-white border-gray-700">
                    <DropdownMenuLabel>Layout Options</DropdownMenuLabel>
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

