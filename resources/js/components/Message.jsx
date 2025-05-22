export default function Message({ text, sender }) {
    const isUser = sender === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md rounded-lg p-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                {text}
            </div>
        </div>
    );
}