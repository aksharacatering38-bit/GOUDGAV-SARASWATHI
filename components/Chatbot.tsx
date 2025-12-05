
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { MenuItem } from '../types';
import { CUTOFF_HOUR, DELIVERY_TIME, STORE_NAME } from '../constants';

interface ChatbotProps {
  menu: MenuItem[];
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

const Chatbot: React.FC<ChatbotProps> = ({ menu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: `Hello! I'm your ${STORE_NAME} assistant. Ask me about our menu, prices, or delivery timings!`,
      sender: 'bot',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref for the chat session to persist across renders
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initChat = async () => {
    if (!process.env.API_KEY) {
        console.error("API Key missing");
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Construct system instruction with dynamic menu data
        const menuContext = menu.map(item => 
            `- ${item.name} (₹${item.price}): ${item.description || ''} [${item.isVeg ? 'Veg' : 'Non-Veg'}] ${!item.available ? '(Currently Unavailable)' : ''}`
        ).join('\n');

        const systemInstruction = `You are a friendly and helpful AI assistant for "${STORE_NAME}", a homemade food delivery service.
        
        Essential Info:
        - We accept orders strictly before ${CUTOFF_HOUR}:00 PM (18:00).
        - Delivery time is around ${DELIVERY_TIME}.
        - We serve authentic homemade tiffins.
        - Support Phone: 9959730602
        - Admin contact is available for bulk orders.
        
        Current Menu:
        ${menuContext}
        
        Rules:
        - Keep answers concise and polite.
        - If a user asks for something not on the menu, politely inform them it's not available today.
        - Use Indian Rupees (₹) for currency.
        - Do not ask for personal details or payment info directly.
        `;

        chatSessionRef.current = ai.chats.create({
            model: 'gemini-3-pro-preview',
            config: {
                systemInstruction: systemInstruction,
            }
        });
    } catch (error) {
        console.error("Failed to init chat", error);
    }
  };

  // Initialize chat when opened for the first time
  useEffect(() => {
      if (isOpen && !chatSessionRef.current) {
          initChat();
      }
  }, [isOpen, menu]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
        id: Date.now().toString(),
        text: input,
        sender: 'user',
        timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        if (!chatSessionRef.current) {
            await initChat();
        }
        
        if (chatSessionRef.current) {
            const result = await chatSessionRef.current.sendMessage({ message: userMsg.text });
            const responseText = result.text;

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'bot',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, botMsg]);
        } else {
             throw new Error("Chat session not initialized");
        }
    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: "I'm having trouble connecting right now. Please try again later.",
            sender: 'bot',
            timestamp: Date.now()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-4 z-40 p-4 rounded-full shadow-lg transition-all transform hover:scale-105 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-orange-600'} text-white`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 z-40 w-[90vw] max-w-sm h-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border border-gray-100 font-sans">
          {/* Header */}
          <div className="bg-orange-600 p-4 text-white flex items-center gap-2">
            <Bot size={20} />
            <div>
                <h3 className="font-bold text-sm">Saraswathi Assistant</h3>
                <p className="text-[10px] text-orange-100 opacity-90">Powered by Gemini AI</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-orange-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-xl rounded-bl-none shadow-sm flex gap-1 items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about menu, timings..."
              className="flex-1 bg-gray-100 text-sm px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
