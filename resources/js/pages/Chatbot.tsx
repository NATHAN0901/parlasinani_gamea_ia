import { useState, useRef, useEffect } from 'react';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import '../../css/chatbot.css'; // Ruta ajustada según tu estructura

type Message = {
    text: string;
    sender: 'user' | 'bot';
};

const Chatbot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        // Mensaje usuario
        setMessages(prev => [...prev, { text: inputMessage, sender: 'user' }]);
        
        // Simular respuesta bot
        setTimeout(() => {
            setMessages(prev => [...prev, {
                text: `Hemos recibido: "${inputMessage}". Pronto responderemos.`,
                sender: 'bot'
            }]);
        }, 1000);

        setInputMessage('');
    };

    return (
        <AppHeaderLayout breadcrumbs={[]}>
            <div className="chatbot-container">
                <header className="chat-header">
                    <h1>Chatbot Ciudadano</h1>
                    <p>Asistente virtual para trámites</p>
                </header>

                <div className="chat-messages">
                    {messages.map((message, index) => (
                        <div 
                            key={index}
                            className={message.sender === 'user' ? 'message-user' : 'message-bot'}
                        >
                            {message.text}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="input-container">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Escribe tu mensaje..."
                        className="chat-input"
                    />
                    <button type="submit" className="chat-button">
                        Enviar
                    </button>
                </form>
            </div>
        </AppHeaderLayout>
    );
};

export default Chatbot;