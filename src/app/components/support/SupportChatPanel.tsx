import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SupportChatPanelProps {
  onClose: () => void;
}

export function SupportChatPanel({ onClose }: SupportChatPanelProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const history = messages;
    const nextMessages: ChatMessage[] = [...history, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const idToken = user ? await user.getIdToken() : null;

      const response = await fetch(`${backendUrl}/ai/support-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          conversation_history: history,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('[Soporte] Error del servidor:', errData.message || `HTTP ${response.status}`);
        throw new Error('support_chat_failed');
      }

      const data = await response.json();
      setMessages([...nextMessages, { role: 'assistant', content: data.reply || t('support.emptyReply') }]);
    } catch (error) {
      console.error('[Soporte] Error al enviar mensaje:', error);
      setMessages([...nextMessages, { role: 'assistant', content: t('support.error') }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[calc(100vw-2rem)] max-w-sm sm:w-96 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-black text-white">
        <span className="text-sm font-medium">{t('support.title')}</span>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
          aria-label={t('support.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 h-80 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">{t('support.placeholder')}</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'ml-auto bg-black text-white'
                : 'mr-auto bg-white border border-gray-200 text-gray-800'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isSending && (
          <div className="mr-auto bg-white border border-gray-200 text-gray-400 rounded-lg px-3 py-2 text-sm">
            {t('support.sending')}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('support.inputPlaceholder')}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
          aria-label={t('support.send')}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
