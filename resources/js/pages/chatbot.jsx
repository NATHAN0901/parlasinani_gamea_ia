import { useState, useRef, useEffect } from 'react';
import Message from '../components/Message';
import InputBar from '../components/InputBar';

export default function chatbot() {
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);

    // Auto-scroll al final del chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Función para manejar el envío de mensajes
    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        // Mensaje del usuario
        const userMessage = { text, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);

        // Simular respuesta del bot (luego lo conectaremos a Laravel)
        setTimeout(() => {
            const botMessage = { 
                text: `Aquí está la información sobre "${text}". Pronto me conectaré a la API.`, 
                sender: 'bot' 
            };
            setMessages(prev => [...prev, botMessage]);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-blue-600 text-white p-4 shadow-md">
                <h1 className="text-xl font-bold">Chatbot Ciudadano</h1>
                <p className="text-sm">Asistente virtual para trámites</p>
            </header>

            {/* Historial de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <Message key={index} text={msg.text} sender={msg.sender} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Barra de entrada */}
            <InputBar onSendMessage={handleSendMessage} />
        </div>
    );
}