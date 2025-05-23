import { useState, useRef, useEffect } from 'react';
import AppHeaderLayout from '@/layouts/app/app-header-layout';

type Message = {
  text: string;
  sender: 'user' | 'bot';
};

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isBotTyping) return;

    // Mensaje usuario
    setMessages(prev => [...prev, { 
      text: inputMessage, 
      sender: 'user' 
    }]);
    
    // Estado de typing
    setIsBotTyping(true);
    
    // Simular respuesta bot con delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    setMessages(prev => [...prev, {
      text: `Hemos recibido: "${inputMessage}". Nuestro equipo responderá en menos de 24 horas.`,
      sender: 'bot'
    }]);
    
    setIsBotTyping(false);
    setInputMessage('');
  };

  return (
    <AppHeaderLayout breadcrumbs={[]}>
      <div className="chatbot-container">
        <header className="chat-header">
          <div className="header-content">
            <h1 className="title-gradient">Chatbot Ciudadano</h1>
            <p className="subtitle">Asistente virtual para trámites</p>
          </div>
        </header>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div 
              key={`msg-${index}-${message.sender}`}
              className={`message ${message.sender}`}
            >
              <div className="message-content">
                {message.text}
              </div>
            </div>
          ))}
          
          {isBotTyping && (
            <div className="message bot typing-indicator">
              <div className="dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="scroll-anchor" />
        </div>

        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          className="input-container"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="chat-input"
            aria-label="Escribe tu mensaje"
            disabled={isBotTyping}
          />
          <button 
            type="submit" 
            className="chat-button"
            disabled={isBotTyping}
            aria-label="Enviar mensaje"
          >
            <span className="button-text">Enviar</span>
            <span className="send-icon"></span>
          </button>
        </form>
      </div>
    </AppHeaderLayout>
  );
};

export default Chatbot;