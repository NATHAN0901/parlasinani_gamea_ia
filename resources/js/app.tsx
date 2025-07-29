import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

// ✅ 1. IMPORTA EL COMPONENTE SILBER AQUÍ
import Silber from './components/Silber';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // ✅ 2. MODIFICA EL RENDER PARA INCLUIR SILBER
        // La variable 'App' aquí es tu página actual (ej. Chatbot.tsx).
        // Al poner <Silber /> al lado, se mostrará en todas las páginas.
        root.render(
            <>
                <Silber />
                <App {...props} />
            </>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();