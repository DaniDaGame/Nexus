// components/MeetingChat.tsx
import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
  type?: 'user-message' | 'notification';
}

interface MeetingChatProps {
  showChat: boolean;
  setShowChat: (value: boolean) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  socketRef: React.MutableRefObject<Socket | null>;
  meetingId: string;
  localUserId: string;
  localUserName?: string;
}

const MeetingChat = ({
  showChat,
  setShowChat,
  chatMessages,
  setChatMessages,
  socketRef,
  meetingId,
  localUserId,
  localUserName
}: MeetingChatProps) => {
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendChatMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current || !meetingId || !localUserId) return;

    const messageData = {
      meetingId,
      senderId: localUserId,
      senderName: localUserName || localUserId,
      text: chatInput,
      timestamp: Date.now(),
    };

    socketRef.current.emit('send-chat-message', messageData);
    setChatInput('');
  };

  return (
    <div className={cn(
      'h-full bg-dark-1 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
      showChat ? 'w-[300px] md:w-[350px] p-5 md:p-5 opacity-100' : 'w-0 p-0 opacity-0 pointer-events-none'
    )}>
      {showChat && (
        <div className="flex flex-col h-full">
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

          <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto mb-3 space-y-2.5 pr-1">
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
  );
};

export default MeetingChat;
