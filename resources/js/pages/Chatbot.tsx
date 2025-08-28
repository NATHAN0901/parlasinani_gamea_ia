import { useEffect, useMemo, useRef, useState } from "react";
import AppHeaderLayout from "@/layouts/app/app-header-layout";
import { getCategories, getProceduresByCategory, getRequirementsByProcedure, predictCategory, predictSubcategory } from "@/lib/chatbotApi";
import Logo1 from "@/pages/assets/logo1.png";
import Logo2 from "@/pages/assets/DAC_Mesa de trabajo 1.png";
import Logo4 from "@/pages/assets/usut blanco.png";
import "../../css/chatbot1.css";
import { assets } from "@/pages/assets/assets";

type Message = { text: string; sender: "user" | "bot" };
type Category = { id: number; nombre_categoria: string };
type Procedure = { id: number; nombre_tramite: string };
type Requirement = { id: number; nombre_requisito: string };

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: "¡Hola! Soy tu asistente virtual para trámites municipales. ¿En qué puedo ayudarte?", sender: "bot" },
    { text: 'Escribe "categorías" para ver trámites, "preguntas" para temas frecuentes, o pregúntame directamente.', sender: "bot" },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [currentStep, setCurrentStep] = useState<"idle" | "categories" | "procedures" | "faq">("idle");

  /* ------------ FAQ (Atención Ciudadana) -------------- */
  const faqDatabase = [
    { question: "horario de atención", response: "Lun–Vie 08:00–16:00 y sáb 09:00–12:00." },
    { question: "contacto", response: "Tel: 123-456-789 • Email: atencionciudadana@municipio.gob" },
    { question: "ubicación", response: "Av. Principal #123, Centro." },
    { question: "estado de trámite", response: "Indique su número de expediente para consultar el estado en línea." },
    { question: "agendar cita", response: "Puede reservar una cita presencial o virtual indicando área y fecha." },
    { question: "buzón ciudadano", response: "Envíe solicitudes y adjunte documentos. Recibirá notificaciones por correo." },
    { question: "licencia de conducir", response: "Requisitos: examen médico, teórico/práctico y pago de tasa. Entrega: 15 días hábiles." },
    { question: "certificado de residencia", response: "Cédula + comprobante de domicilio. Emisión en 24–48 h." },
    { question: "impuesto vehicular", response: "Pago anual antes del 31 de marzo. Descuento por pronto pago." },
    { question: "reclamo agua", response: "Llama al 0800‑AGUA o repórtalo en la app con dirección y foto." },
    { question: "denuncia ruidos molestos", response: "Llama al 0800‑SILENCIO o registra tu denuncia en Medio Ambiente." },
  ];

  const searchFAQ = (q: string): string | null => {
    const s = q.toLowerCase().trim();
    const exact = faqDatabase.find(i => i.question.toLowerCase() === s);
    if (exact) return exact.response;
    const partial = faqDatabase.find(i => s.includes(i.question.toLowerCase()) || i.question.toLowerCase().includes(s));
    if (partial) return partial.response;
    for (const k of s.split(" ")) {
      if (k.length < 4) continue;
      const hit = faqDatabase.find(i => i.question.toLowerCase().includes(k));
      if (hit) return hit.response;
    }
    return null;
  };

  const extractNumber = (t: string) => { const m = t.match(/\d+/); return m ? parseInt(m[0], 10) : null; };
  const formatBotMessage = (t: string) => <div>{t.split("\n").map((l, i) => <p key={i} className="mb-1">{l}</p>)}</div>;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const resetFlow = () => { setCurrentStep("idle"); setProcedures([]); setCategories([]); };

  const processRequirements = (resp: any): Requirement[] => {
    if (Array.isArray(resp)) return resp;
    if (resp && typeof resp === "object") {
      let all: Requirement[] = [];
      Object.keys(resp).forEach(k => { if (Array.isArray(resp[k])) all = [...all, ...resp[k]]; });
      return all;
    }
    return [];
  };

  // =========================================================================
  // [VOZ] Estados y referencias para STT (dictado) y TTS (voz del bot)
  // =========================================================================
  const [isListening, setIsListening] = useState(false);            // STT activo
  const [voiceOutputOn, setVoiceOutputOn] = useState(true);         // TTS activado/desactivado
  const recognitionRef = useRef<SpeechRecognition | null>(null);    // instancia de reconocimiento

  // [VOZ] función de lectura en voz alta (TTS)
  const speak = (text: string) => {
    if (!voiceOutputOn || !("speechSynthesis" in window)) return;

    // Quitar marcas simples de markdown para que suene natural
    const plain = text
      .replace(/\*\*/g, "")
      .replace(/__|`|#/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1");

    const u = new SpeechSynthesisUtterance(plain);
    // Elegir una voz en español si existe
    const selectSpanish = () =>
      window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith("es"));
    const voice = selectSpanish();
    if (voice) u.voice = voice;
    u.rate = 1; u.pitch = 1; u.volume = 1;

    window.speechSynthesis.cancel(); // evitar solapamiento
    window.speechSynthesis.speak(u);
  };

  // [VOZ] Inicializar SpeechRecognition (STT)
  useEffect(() => {
    const SR = (window.SpeechRecognition || window.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;
    if (!SR) {
      console.warn("Web Speech API no soportada en este navegador.");
      return;
    }

    const rec = new SR();
    rec.lang = "es-BO";          // si no reconoce bien, prueba "es-ES" o "es-419"
    rec.continuous = false;      // una frase por envío; pon true si quieres “dictado continuo”
    rec.interimResults = true;   // mostrar texto parcial mientras habla
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let finalTxt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results.item(i);
        const alt = r.item(0)?.transcript ?? "";
        if (r.isFinal) finalTxt += alt + " ";
        else interim += alt;
      }

      // Mostrar mientras dicta
      if (interim) setInputMessage(interim);

      // Cuando la frase sea final, enviamos el formulario
      finalTxt = finalTxt.trim();
      if (finalTxt) {
        setInputMessage(finalTxt);
        setTimeout(() => {
          const formEl =
            (document.getElementById("chat-form") as HTMLFormElement | null) ||
            (document.getElementById("hero-form") as HTMLFormElement | null);
          formEl?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }, 0);
      }
    };

    rec.onerror = () => setIsListening(false);
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;

    // Opcional: precargar voces para TTS cuando estén disponibles
    const onVoices = () => { /* dispara getVoices() */ window.speechSynthesis.getVoices(); };
    window.speechSynthesis?.addEventListener?.("voiceschanged", onVoices);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", onVoices);
  }, []);

  // Helpers locales (usados en handleSubmit)
  const roundPct = (x: number) => Math.round(x * 100);
  const listProcedures = (procs: Procedure[]) =>
    procs.map((p, i) => `${i + 1}. ${p.nombre_tramite}`).join("\n");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isBotTyping) return;

    // Normalizador: minúsculas y sin tildes (diacríticos)
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

    const userMessage = inputMessage;
    const low = normalize(userMessage);

    setMessages(prev => [...prev, { text: userMessage, sender: "user" }]);
    setIsBotTyping(true);
    setInputMessage("");
    let botResponse = "";

    // ── Parche A: detectores explícitos y FAQ menos intrusivo ───────────
    const isStatus = /\b(expediente|seguim|estado\s+del?\s+tramite)\b/.test(low);
    const isAskCategories = /\bcategor(i|í)as?\b/.test(low);
    const isAskFAQ = /\b(preguntas|faq|frecuentes)\b/.test(low);
    const faqWhitelist = [
      "horario", "contacto", "ubicacion", "buzon ciudadano", "agendar cita",
      "licencia de conducir", "certificado de residencia",
      "impuesto vehicular", "reclamo agua", "denuncia ruidos"
    ];
    const isLikelyFAQ = isAskFAQ || faqWhitelist.some(k => low.includes(k));

    try {
      // 0) Estado de trámite / expediente (explícito)
      if (isStatus) {
        botResponse = "Indique su número de expediente para consultar el estado en línea.";
      }

      // 1) Mostrar categorías (solo si el usuario lo pide)
      else if (isAskCategories) {
        const list = await getCategories();
        setCategories(list);
        if (list.length) {
          botResponse =
            "Estas son las categorías disponibles:\n\n" +
            list.map((c: any, i: number) => `${i + 1}. ${c.nombre_categoria}`).join("\n") +
            "\n\nEscribe el número de la categoría que te interesa.";
          setCurrentStep("categories");
        } else {
          botResponse = "Actualmente no hay categorías disponibles. Intenta más tarde.";
          resetFlow();
        }
      }

      // 2) Usuario elige una categoría por número
      else if (currentStep === "categories") {
        const n = extractNumber(userMessage);
        if (n === null) {
          botResponse = 'Por favor, ingresa un número válido. Ej: "1" o "opción 1"';
        } else if (!categories.length || n < 1 || n > categories.length) {
          botResponse = `Número inválido. Ingresa entre 1 y ${categories.length}.`;
        } else {
          const selected = categories[n - 1];
          const res = await getProceduresByCategory(String(selected.id));
          const procs: Procedure[] = res.procedures || [];
          setProcedures(procs);
          if (procs.length) {
            botResponse =
              `Trámites en "${selected.nombre_categoria}":\n\n` +
              listProcedures(procs) +
              `\n\nEscribe el número del trámite que deseas.`;
            setCurrentStep("procedures");
          } else {
            botResponse = `No hay trámites en "${selected.nombre_categoria}". Escribe "categorías" para ver otras.`;
            resetFlow();
          }
        }
      }

      // 3) Usuario elige un trámite por número
      else if (currentStep === "procedures") {
        const n = extractNumber(userMessage);
        if (n === null) {
          botResponse = 'Por favor, ingresa un número válido. Ej: "2" o "trámite 2"';
        } else if (!procedures.length || n < 1 || n > procedures.length) {
          botResponse = `Número inválido. Ingresa entre 1 y ${procedures.length}.`;
        } else {
          const proc = procedures[n - 1];
          const reqResp = await getRequirementsByProcedure(String(proc.id));
          const reqs = processRequirements(reqResp);
          botResponse = reqs.length
            ? `Requisitos para "${proc.nombre_tramite}":\n\n` +
              reqs.map(r => `• ${r.nombre_requisito}`).join("\n") +
              `\n\n¿Necesitas algo más? Escribe "categorías" para ver otros trámites.`
            : `No hay requisitos registrados para "${proc.nombre_tramite}". Consulta en oficinas.`;
          resetFlow();
        }
      }

      // 4) Preguntas frecuentes (cuando el usuario lo pide o coincide con whitelist)
      else if (isLikelyFAQ) {
        const faq = searchFAQ(userMessage);
        botResponse = faq ?? (
          "Temas frecuentes:\n\n" +
          "• Horario de atención\n• Contacto\n• Ubicación\n• Estado de trámite\n• Agendar cita\n" +
          "• Licencia de conducir\n• Permiso de construcción\n• Registro de propiedad\n" +
          "• Pago de impuestos\n• Reclamo agua/luz\n• Basura\n• Certificado de residencia\n\n" +
          "Escribe una palabra clave para ampliar."
        );
        setCurrentStep("faq");
      }

      // 5) Flujo IA: Modelo A → Modelo B → API municipal
      else {
        const TH_CAT = 0.60;
        const TH_SUB = 0.60;

        // A) Categoría
        const cat = await predictCategory(userMessage);
        const catRes = cat?.categoria;

        if (!catRes || catRes.confidence < TH_CAT) {
          botResponse = `Gracias por tu mensaje: "${userMessage}". No estoy seguro de la categoría. Escribe "categorías" o reformula tu consulta.`;
          resetFlow();
        } else {
          const idx = Number(catRes.id);
          const catName = String(catRes.name || "").trim();

          // Resolver catId REAL (externo) por NOMBRE desde la API municipal
          const allCats: Category[] = await getCategories();
          const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

          let catId: number | null = null;

          const exact = allCats.find(c => norm(c.nombre_categoria) === norm(catName));
          if (exact) {
            catId = exact.id;
          } else {
            const incl = allCats.find(c =>
              norm(catName).includes(norm(c.nombre_categoria)) ||
              norm(c.nombre_categoria).includes(norm(catName))
            );
            if (incl) catId = incl.id;
          }

          if (catId == null) { catId = idx + 1; }

          // B) Subcategoría
          const sub = await predictSubcategory(userMessage, catId);
          const subRes = sub?.subcategoria;

          if (!subRes || subRes.confidence < TH_SUB) {
            const res = await getProceduresByCategory(String(catId));
            const procs: Procedure[] = res.procedures || [];
            setProcedures(procs);
            if (procs.length) {
              botResponse =
                `Creo que tu consulta corresponde a **${catName}** ` +
                `(confianza ${roundPct(catRes.confidence)}%).\n\n` +
                listProcedures(procs) +
                `\n\nEscribe el número del trámite que deseas.`;
              setCurrentStep("procedures");
            } else {
              botResponse =
                `Te ubico en **${catName}** (confianza ${roundPct(catRes.confidence)}%), ` +
                `pero no encontré trámites. Escribe "categorías" para ver otras.`;
              resetFlow();
            }
          } else {
            const extId = subRes.ext_id as number;
            let procName = subRes.name as string | null;

            if (!procName) {
              const res = await getProceduresByCategory(String(catId));
              const procs: Procedure[] = res.procedures || [];
              const m = procs.find(p => String(p.id) === String(extId));
              if (m) procName = m.nombre_tramite;
            }

            const reqResp = await getRequirementsByProcedure(String(extId));
            const reqs = processRequirements(reqResp);

            if (reqs.length) {
              botResponse =
                `Te entiendo: parece ser **${procName || "este trámite"}** ` +
                `(cat: ${catName}, conf: ${roundPct(catRes.confidence)}%, ` +
                `sub: ${roundPct(subRes.confidence)}%).\n\n` +
                `**Requisitos:**\n\n` +
                reqs.map(r => `• ${r.nombre_requisito}`).join("\n") +
                `\n\n¿Deseas ver otra cosa? Escribe "categorías" o haz otra consulta.`;
            } else {
              botResponse =
                `Identifiqué **${procName || "un trámite"}** en **${catName}** ` +
                `(conf: ${roundPct(subRes.confidence)}%), ` +
                `pero no encontré requisitos registrados. Prueba en oficinas o escribe "categorías".`;
            }
            resetFlow();
          }
        }
      }
    } catch {
      botResponse = "Ocurrió un error al procesar tu solicitud. Intenta nuevamente.";
      resetFlow();
    }

    // Simulación de tipeo + respuesta
    await new Promise(r => setTimeout(r, 700));
    setMessages(prev => [...prev, { text: botResponse, sender: "bot" }]);
    setIsBotTyping(false);

    // [VOZ] Leer respuesta en voz alta (si está activado)
    if (botResponse) speak(botResponse);
  };

  const isChatMode = useMemo(
    () => messages.some(m => m.sender === "user") || inputMessage.trim().length > 0,
    [messages, inputMessage]
  );

  const quickSend = (text: string) => {
    if (isBotTyping) return;
    setInputMessage(text);
    setTimeout(() => {
      const form = document.getElementById(isChatMode ? "chat-form" : "hero-form") as HTMLFormElement | null;
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }, 10);
  };

  const features = [
    { key: "estado de trámite", title: "Consultar Estado de Trámite", desc: "Verifique el progreso de sus solicitudes.", icon: assets.history_icon, hue: "270" },
    { key: "agendar cita", title: "Agendar Cita o Audiencia", desc: "Reserve un horario presencial o virtual.", icon: assets.plus_icon, hue: "320" },
    { key: "buzón ciudadano", title: "Buzón Ciudadano Digital", desc: "Envíe y reciba documentos oficiales.", icon: assets.message_icon, hue: "200" },
    { key: "base de conocimiento", title: "Base de Conocimiento", desc: "Guías, normativas y preguntas frecuentes.", icon: assets.question_icon, hue: "50" },
  ];

  const pills = ["categorías", "preguntas", "ubicación", "contacto", "requisitos generales"];

  // Botón micrófono y TTS (mismo bloque se usa en HERO y en COMPOSER)
  const MicAndToggles = () => (
    <>
      <button
        type="button"
        title={isListening ? "Detener dictado" : "Hablar"}
        onClick={() => {
          const rec = recognitionRef.current;
          if (!rec || isBotTyping) return;
          try {
            if (isListening) {
              rec.stop();
            } else {
              // Evitar que TTS hable mientras el usuario dicta
              window.speechSynthesis?.cancel();
              rec.start();
            }
          } catch { /* noop */ }
        }}
      >
        <img src={assets.mic_icon} alt="" />
      </button>

      <button
        type="button"
        title={voiceOutputOn ? "Silenciar bot" : "Activar voz del bot"}
        onClick={() => setVoiceOutputOn(v => !v)}
      >
        <img src={(assets as any).sound_icon ?? assets.message_icon} alt="" />
      </button>
    </>
  );

  return (
    <AppHeaderLayout breadcrumbs={[]}>
      <div className="main">
        {/* fondos estáticos */}
        <div className="aurora-background">
          <div className="aurora-shape shape1" />
          <div className="aurora-shape shape2" />
          <div className="aurora-shape shape3" />
        </div>
        <div className="neural-grid" aria-hidden="true" />

        {/* Top bar */}
        <div className="nav">
          <div className="brand">
            <img src={Logo1} alt="Logo Municipalidad" />
            <img className="logo-secundario" src={Logo2} height={50} width={70} alt="Logo Secundario" />
            <img className="logo-extra" src={Logo4} alt="Logo Extra" />
            <span>Atención Ciudadana</span>
          </div>
          <img src={assets.user_icon} alt="Usuario" />
        </div>

        <div className="main-container">
          {/* ======== HERO ======== */}
          {!isChatMode && (
            <section className="hero-section">
              <h1>La Administración Pública del Futuro es Hoy.</h1>
              <p>Estamos aquí para servirle con claridad, eficiencia y transparencia.</p>

              <div className="service-cards-grid">
                {features.map(f => (
                  <button
                    key={f.key}
                    className="service-card"
                    style={{ ["--card-hue" as any]: f.hue }}
                    onClick={() => quickSend(f.key)}
                    type="button"
                  >
                    <div className="card-icon-wrapper">
                      <img src={f.icon} alt="" />
                    </div>
                    <h3>{f.title}</h3>
                    <div className="service-card-description">{f.desc}</div>
                  </button>
                ))}
              </div>

              {/* Barra de búsqueda central */}
              <form id="hero-form" className="search-box" onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escriba su consulta…"
                  aria-label="Escriba su consulta"
                  disabled={isBotTyping}
                />
                <div className="icon-buttons">
                  <button type="button" title="Adjuntar" onClick={() => quickSend("adjuntar documento")}><img src={assets.gallery_icon} alt=""/></button>

                  {/* [VOZ] Botones de micrófono y TTS */}
                  <MicAndToggles />

                  <button type="submit" className="send-btn" aria-label="Enviar" disabled={isBotTyping || !inputMessage.trim()}>
                    <img src={assets.send_icon} alt=""/>
                  </button>
                </div>

                {/* [VOZ] Indicador simple */}
                {isListening && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>🎙️ Escuchando…</div>}
              </form>

              {/* Atajos */}
              <div className="quick-pills">
                {pills.map(p => (
                  <button key={p} className="pill" type="button" onClick={() => quickSend(p)}>{p}</button>
                ))}
              </div>
            </section>
          )}

          {/* ======== CHAT MODE ======== */}
          {isChatMode && (
            <div className="chat-wrapper">
              <div className="chat-header-compact">
                <div className="brand"><img src={Logo1} alt="Logo" /><span className="chat-title">Chatbot Ciudadano</span></div>
                <img src={assets.user_icon} alt="Usuario" />
              </div>

              <div className="chat-log" aria-live="polite">
                {messages.map((m, i) => {
                  const isUser = m.sender === "user";
                  const avatar = isUser ? assets.user_icon : assets.chatbot_icon;
                  return (
                    <div key={`msg-${i}`} className={`msg ${isUser ? "msg--end msg--user" : "msg--bot"}`}>
                      {!isUser && <div className="avatar"><img src={avatar} alt="" className="w-full h-full" /></div>}
                      <div className="bubble">{m.sender === "bot" ? formatBotMessage(m.text) : <span>{m.text}</span>}</div>
                      {isUser && <div className="avatar"><img src={avatar} alt="" className="w-full h-full" /></div>}
                    </div>
                  );
                })}

                {isBotTyping && (
                  <div className="msg msg--bot">
                    <div className="avatar"><img src={assets.chatbot_icon} alt="" className="w-full h-full" /></div>
                    <div className="bubble"><div className="typing"><span className="dot"/><span className="dot"/><span className="dot"/></div></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="composer">
                <form id="chat-form" className="search-box" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe tu mensaje…"
                    aria-label="Escribe tu mensaje"
                    disabled={isBotTyping}
                  />
                  <div className="icon-buttons">
                    <button type="button" title="Adjuntar" onClick={() => quickSend("adjuntar documento")}><img src={assets.gallery_icon} alt=""/></button>

                    {/* [VOZ] Botones de micrófono y TTS */}
                    <MicAndToggles />

                    <button type="submit" className="send-btn" aria-label="Enviar" disabled={isBotTyping || !inputMessage.trim()}>
                      <img src={assets.send_icon} alt=""/>
                    </button>
                  </div>

                  {/* [VOZ] Indicador simple */}
                  {isListening && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>🎙️ Escuchando…</div>}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppHeaderLayout>
  );
};

export default Chatbot;
/*"hola tengo un asunto en el duplicado de placas es mas por un robo que esto me sucedio" */