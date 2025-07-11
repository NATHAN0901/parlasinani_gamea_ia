import { useState, useRef, useEffect } from 'react';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { getCategories, getProceduresByCategory, getRequirementsByProcedure } from '@/lib/chatbotApi';
import Logo1 from '@/pages/assets/logo1.png';

type Message = {
  text: string;
  sender: 'user' | 'bot';
};

type Category = {
  id: number;
  nombre_categoria: string;
};

type Procedure = {
  id: number;
  nombre_tramite: string;
};

type Requirement = {
  id: number;
  nombre_requisito: string;
};

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: '¡Hola! Soy tu asistente virtual para trámites municipales. ¿En qué puedo ayudarte?',
      sender: 'bot' 
    },
    { 
      text: 'Puedes escribir "categorías" para ver trámites, "preguntas" para ver temas frecuentes, o preguntarme directamente sobre algún procedimiento.',
      sender: 'bot' 
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [currentStep, setCurrentStep] = useState<'idle' | 'categories' | 'procedures' | 'faq'>('idle');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Base de datos de preguntas frecuentes (aproximadamente 200)
  const faqDatabase = [
    // Información general
    {
      question: "horario",
      response: "Nuestro horario de atención es de lunes a viernes de 8:00 a 16:00. Sábados de 9:00 a 12:00."
    },
    {
      question: "contacto",
      response: "Puedes contactarnos al teléfono 1234567 o al correo contacto@municipio.com"
    },
    {
      question: "ubicación",
      response: "Estamos ubicados en la Calle Principal #123, Centro de la ciudad."
    },
    {
      question: "requisitos generales",
      response: "Para la mayoría de trámites necesitas:\n1. Fotocopia de cédula de identidad\n2. Comprobante de domicilio\n3. Formulario específico del trámite"
    },

    
    // Servicios públicos
    {
      question: "reclamo agua",
      response: "Para reportar problemas con el servicio de agua:\n1. Llama al 0800-AGUA\n2. Presenta reclamo en ventanilla de servicios públicos\n3. Reporta en nuestra app móvil"
    },
    {
      question: "reclamo luz",
      response: "Reporta problemas de alumbrado público:\n1. Llama al 0800-LUZ\n2. Envía fotografía a reclamos@municipio.com\n3. Reporta en nuestra web"
    },
    {
      question: "basura",
      response: "El servicio de recolección de basura funciona:\n- Zona norte: lunes, miércoles, viernes\n- Zona sur: martes, jueves, sábado\nHorario: 7:00 a 12:00"
    }
    //etc a completar

  ];

  // Función para buscar en las preguntas frecuentes
  const searchFAQ = (query: string): string | null => {
    const cleanQuery = query.toLowerCase().trim();
    
    // Primero buscar coincidencias exactas
    const exactMatch = faqDatabase.find(item => 
      item.question.toLowerCase() === cleanQuery
    );
    
    if (exactMatch) return exactMatch.response;
    
    // Luego buscar coincidencias parciales
    const partialMatch = faqDatabase.find(item => 
      cleanQuery.includes(item.question.toLowerCase()) || 
      item.question.toLowerCase().includes(cleanQuery)
    );
    
    if (partialMatch) return partialMatch.response;
    
    // Finalmente buscar por palabras clave
    const keywords = cleanQuery.split(' ');
    for (const keyword of keywords) {
      const keywordMatch = faqDatabase.find(item => 
        item.question.toLowerCase().includes(keyword) && keyword.length > 3
      );
      
      if (keywordMatch) return keywordMatch.response;
    }
    
    return null;
  };

  const extractNumber = (text: string): number | null => {
    const match = text.match(/\d+/);
    const number = match ? parseInt(match[0], 10) : null;
    console.log(`Extrayendo número de "${text}" -> ${number}`);
    return number;
  };

  const formatBotMessage = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="text-white">
        {lines.map((line, idx) => (
          <p key={idx} className="mb-1">
            {line}
          </p>
        ))}
      </div>
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetFlow = () => {
    console.log("Reseteando flujo...");
    setCurrentStep('idle');
    setSelectedCategory(null);
    setProcedures([]);
  };

  // Función para procesar los requisitos de la API
  const processRequirements = (requirementsResponse: any): Requirement[] => {
    console.log("Procesando respuesta de requisitos:", requirementsResponse);
    
    // Si la respuesta es un array, lo devolvemos directamente
    if (Array.isArray(requirementsResponse)) {
      return requirementsResponse;
    }
    
    // Si es un objeto con propiedades numéricas (como "1", "2", etc.)
    if (typeof requirementsResponse === 'object' && requirementsResponse !== null) {
      let allRequirements: Requirement[] = [];
      
      // Recorremos todas las claves del objeto
      Object.keys(requirementsResponse).forEach(key => {
        const requirementsArray = requirementsResponse[key];
        
        // Verificamos que sea un array antes de concatenar
        if (Array.isArray(requirementsArray)) {
          allRequirements = [...allRequirements, ...requirementsArray];
        }
      });
      
      console.log("Requisitos combinados:", allRequirements);
      return allRequirements;
    }
    
    // Caso por defecto: devolver array vacío
    console.warn("Formato de respuesta de requisitos no reconocido");
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isBotTyping) return;

    console.log("--- Inicio de handleSubmit ---");
    console.log("Mensaje del usuario:", inputMessage);
    console.log("Paso actual:", currentStep);
    console.log("Categorías en estado:", categories.length);
    console.log("Procedimientos en estado:", procedures.length);
    console.log("Categoría seleccionada:", selectedCategory);

    const userMessage = inputMessage;
    const userMessageLower = userMessage.toLowerCase();

    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setIsBotTyping(true);
    let botResponse = '';
    setInputMessage('');

    try {
      // Paso 0: Verificar preguntas frecuentes
      const faqResult = searchFAQ(userMessage);
      if (faqResult) {
        botResponse = faqResult;
      }
      // Paso 1: Mostrar categorías
      else if (userMessageLower.includes('categorias') || currentStep === 'idle') {
        console.log("Entrando en paso 1: Mostrar categorías");
        
        const categoriesList = await getCategories();
        console.log("Categorías obtenidas de API:", categoriesList);
        
        setCategories(categoriesList);
        
        if (categoriesList.length) {
          botResponse = `Estas son las categorías disponibles:\n\n${categoriesList.map((category, index) => `${index + 1}. ${category.nombre_categoria}`).join('\n')}\n\nPor favor, escribe el número de la categoría que te interesa.`;
          setCurrentStep('categories');
          console.log("Nuevo paso: categories");
        } else {
          botResponse = 'Actualmente no hay categorías disponibles. Por favor intenta más tarde.';
          resetFlow();
        }
      } 
      // Paso 2: Seleccionar categoría por número
      else if (currentStep === 'categories') {
        console.log("Entrando en paso 2: Seleccionar categoría");
        
        const selectedNumber = extractNumber(userMessage);
        console.log("Número extraído para categoría:", selectedNumber);
        console.log("Categorías disponibles:", categories);
        
        if (selectedNumber === null) {
          console.log("Número inválido para categoría");
          botResponse = 'Por favor, ingresa un número válido. Por ejemplo: "1" o "opción 1"';
        } else if (selectedNumber < 1 || selectedNumber > categories.length) {
          console.log(`Número fuera de rango (1-${categories.length}): ${selectedNumber}`);
          botResponse = `Número inválido. Por favor ingresa un valor entre 1 y ${categories.length}.`;
        } else {
          const selected = categories[selectedNumber - 1];
          console.log("Categoría seleccionada:", selected);
          
          setSelectedCategory(selected);
          console.log("Categoría seleccionada establecida en estado");
          
          // Obtener procedimientos y extraer el array de la respuesta
          const proceduresResponse = await getProceduresByCategory(selected.id.toString());
          console.log("Respuesta completa de procedimientos:", proceduresResponse);
          
          // Verificar si la respuesta tiene la propiedad 'procedures'
          const proceduresList = proceduresResponse.procedures || [];
          console.log("Lista de procedimientos extraída:", proceduresList);
          
          setProcedures(proceduresList);
          
          if (proceduresList.length > 0) {
            botResponse = `Trámites disponibles en "${selected.nombre_categoria}":\n\n${proceduresList.map((procedure, index) => `${index + 1}. ${procedure.nombre_tramite}`).join('\n')}\n\nEscribe el número del trámite que deseas consultar.`;
            setCurrentStep('procedures');
            console.log("Nuevo paso: procedures");
          } else {
            console.log(`No se encontraron procedimientos para categoría ${selected.id}`);
            botResponse = `Actualmente no hay trámites disponibles en "${selected.nombre_categoria}". Puedes escribir "categorías" para ver otras opciones.`;
            resetFlow();
          }
        }
      }
      // Paso 3: Seleccionar trámite por número y mostrar requisitos
      else if (currentStep === 'procedures') {
        console.log("Entrando en paso 3: Seleccionar procedimiento");
        
        const selectedNumber = extractNumber(userMessage);
        console.log("Número extraído para procedimiento:", selectedNumber);
        console.log("Procedimientos disponibles:", procedures);
        
        if (selectedNumber === null) {
          console.log("Número inválido para procedimiento");
          botResponse = 'Por favor, ingresa un número válido. Por ejemplo: "2" o "trámite 2"';
        } else if (selectedNumber < 1 || selectedNumber > procedures.length) {
          console.log(`Número fuera de rango (1-${procedures.length}): ${selectedNumber}`);
          botResponse = `Número inválido. Por favor ingresa un valor entre 1 y ${procedures.length}.`;
        } else {
          const selectedProcedure = procedures[selectedNumber - 1];
          console.log("Procedimiento seleccionado:", selectedProcedure);
          
          // Obtener requisitos y procesar la respuesta
          const requirementsResponse = await getRequirementsByProcedure(selectedProcedure.id.toString());
          console.log("Respuesta completa de requisitos:", requirementsResponse);
          
          // Procesar la respuesta para obtener un array de requisitos
          const requirementsList = processRequirements(requirementsResponse);
          console.log("Lista de requisitos procesada:", requirementsList);
          
          if (requirementsList.length) {
            botResponse = `Requisitos para "${selectedProcedure.nombre_tramite}":\n\n${requirementsList.map(requirement => `• ${requirement.nombre_requisito}`).join('\n')}\n\n¿Necesitas algo más? Puedes escribir "categorías" para ver otros trámites.`;
          } else {
            console.log(`No se encontraron requisitos para procedimiento ${selectedProcedure.id}`);
            botResponse = `Actualmente no hay requisitos registrados para "${selectedProcedure.nombre_tramite}". Por favor consulta directamente en las oficinas municipales.`;
          }
          resetFlow();
        }
      } 
      // Paso 4: Mostrar preguntas frecuentes
      else if (userMessageLower.includes('preguntas') || userMessageLower.includes('frecuentes')) {
        botResponse = "Estos son algunos temas frecuentes:\n\n" +
          "• Horario de atención\n" +
          "• Contacto\n" +
          "• Ubicación\n" +
          "• Licencia de conducir\n" +
          "• Permiso de construcción\n" +
          "• Registro de propiedad\n" +
          "• Pago de impuestos\n" +
          "• Reclamo agua/luz\n" +
          "• Basura\n" +
          "• Partida de nacimiento\n" +
          "• Certificado de residencia\n\n" +
          "Escribe una de estas palabras clave para obtener más información.";
        setCurrentStep('faq');
      }
      // Comportamiento por defecto
      else {
        console.log("Entrando en comportamiento por defecto");
        botResponse = `Gracias por tu mensaje: "${userMessage}". Si necesitas ayuda con trámites, escribe "categorías" para comenzar, o "preguntas" para ver temas frecuentes.`;
        resetFlow();
      }
    } catch (error) {
      console.error('Error en el chatbot:', error);
      botResponse = 'Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente o comunícate directamente con el municipio.';
      resetFlow();
    }

    // Simular tiempo de respuesta del bot
    console.log("Simulando tiempo de respuesta del bot...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("Respuesta del bot:", botResponse);
    setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    setIsBotTyping(false);
    
    console.log("--- Fin de handleSubmit ---");
  };

  return (
    <AppHeaderLayout breadcrumbs={[]}>
      <div className="chatbot-container bg-black min-h-screen flex flex-col">
        <header className="chat-header bg-gray-900 text-white shadow-lg py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <img 
                src={Logo1}
                alt="Logo Municipalidad" 
                className="h-16 w-auto" 
              />
              
              <div className="text-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">
                  Chatbot Ciudadano
                </h1>
                <p className="text-gray-300">Asistente virtual para trámites municipales</p>
              </div>
              
              <img 
                src={Logo1}
                alt="Logo Gobierno Regional" 
                className="h-16 w-auto" 
              />
            </div>
          </div>
        </header>

        <div className="chat-messages flex-grow p-4 overflow-y-auto bg-gray-900">
          {messages.map((message, index) => (
            <div 
              key={`msg-${index}-${message.sender}`}
              className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${message.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-800 text-white rounded-bl-none'}`}
              >
                {message.sender === 'bot' 
                  ? formatBotMessage(message.text)
                  : message.text}
              </div>
            </div>
          ))}
          
          {isBotTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-800 text-white rounded-lg rounded-bl-none px-4 py-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-white rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-white rounded-full animate-bounce delay-75"></div>
                  <div className="h-2 w-2 bg-white rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-1" />
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="input-container bg-gray-800 border-t border-gray-700 p-4"
        >
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-grow bg-gray-700 text-white border border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              aria-label="Escribe tu mensaje"
              disabled={isBotTyping}
            />
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors disabled:opacity-50"
              disabled={isBotTyping || !inputMessage.trim()}
              aria-label="Enviar mensaje"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            Escribe "categorías" para trámites, "preguntas" para temas frecuentes
          </p>
        </form>
      </div>
    </AppHeaderLayout>
  );
};

export default Chatbot;