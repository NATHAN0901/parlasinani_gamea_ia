# parlasinani_gamea_ia

# hola esto es un desarrollo en el Gobienrno Autonomo Municpal de el alto 

Aquí tienes un informe técnico profesional para tu README.md:

---

# Chatbot Ciudadano - Documentación Técnica

![Chatbot Dark Theme Preview](https://via.placeholder.com/800x500.png?text=Chatbot+Dark+Theme+Preview) *Ejemplo de vista previa (reemplazar con screenshot real)*

## Características Principales 🚀

### Interfaz de Usuario Avanzada
- **Tema Oscuro Premium**: Paleta de colores #0a0a0a/#18181b con acentos azules (#2563eb)
- **Efectos Visuales**:
  - Gradientes sutiles en header y fondos
  - Sombras neumórficas (box-shadow: 0 8px 32px rgba(0,0,0,0.25))
  - Animaciones fluidas (transiciones cubic-bezier)
- **Diseño Responsivo**: Adaptable a móviles y desktop (max-width: 420px)

### Funcionalidades Clave
- **Sistema de Mensajería en Tiem Real**:
  - Scroll automático con `scrollIntoView`
  - Historial de conversación persistente
  - Indicador de typing (animación de puntos)
- **Optimizaciones de Performance**:
  - Debouncing en envíos
  - Memoización de componentes
  - Carga diferida de assets
- **Accesibilidad**:
  - Soporte ARIA (aria-label)
  - Navegación por teclado
  - Contraste AA/AAA

## Stack Tecnológico 💻

| Capa          | Tecnologías                          |
|---------------|--------------------------------------|
| Frontend      | React 18+, TypeScript 5+, CSS Modules|
| Estilos       | Modern CSS (Grid/Flex, Variables)    |
| Animaciones   | CSS Keyframes, Transiciones          |
| Build         | Vite 4+                             |

## Instalación y Uso 🔧

1. **Requisitos**:
   ```bash
   Node.js >=18.x
   npm >=9.x
   ```

2. **Instalación**:
   ```bash
   git clone https://github.com/tu-usuario/chatbot-ciudadano.git
   cd chatbot-ciudadano
   npm install
   ```

3. **Ejecución**:
   ```bash
   npm run dev
   ```

## Arquitectura del Componente 📦

```mermaid
graph TD
  A[ChatContainer] --> B[ChatHeader]
  A --> C[ChatMessages]
  A --> D[InputForm]
  C --> E[MessageUser]
  C --> F[MessageBot]
  C --> G[TypingIndicator]
  D --> H[TextInput]
  D --> I[SubmitButton]
```

## Personalización 🎨

### Variables CSS Principales
```css
:root {
  --primary-bg: #0a0a0a;
  --secondary-bg: #18181b;
  --accent-blue: #2563eb;
  --text-primary: #f4f4f5;
  --chat-border: 1px solid #27272a;
}
```

### Modificar Temas
1. Crear nuevo tema en `src/themes/`
```tsx
export const lightTheme = {
  background: '#f8fafc',
  messageUser: '#3b82f6',
  messageBot: '#e2e8f0',
  text: '#1e293b'
}
```

2. Importar en componente principal:
```tsx
import { useTheme } from './hooks/useTheme';
import { darkTheme, lightTheme } from './themes';

const Chatbot = () => {
  const { theme } = useTheme();
  // ...
}
```

## Mejoras Futuras 🔮

| Prioridad | Feature                      | Estimación |
|-----------|------------------------------|------------|
| Alto      | Integración API              | 8h         |
| Media     | Soporte Multidioma           | 12h        |
| Alta      | Sistema de Autenticación     | 6h         |
| Baja      | Temas Personalizables        | 4h         |

