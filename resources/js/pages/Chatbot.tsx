/* ───────────────────────────────────────────── Imports ───────── */
import {
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Sun, Moon, SendHorizonal } from "lucide-react";
import Logo1 from "@/pages/assets/logo1.png";

/* API REST del municipio (categorías, trámites, requisitos) */
import {
  getCategories,
  getProceduresByCategory,
  getRequirementsByProcedure,
} from "@/lib/chatbotApi";

/* ────────────────────────────── Tipos ────────────────────────── */
type Message   = { text: string; sender: "user" | "bot" };
type Category  = { id: number; nombre_categoria: string };
type Procedure = { id: number; nombre_tramite: string };
type Requirement = { id: number; nombre_requisito: string };

/* ─────────────────────── Hooks utilitarios ───────────────────── */
function useDarkMode(init = false) {
  const [dark, setDark] = useState(
    () => localStorage.getItem("darkMode") === "true" || init,
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("darkMode", JSON.stringify(dark));
  }, [dark]);
  return [dark, setDark] as const;
}

function useRipple() {
  return useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const d   = Math.max(btn.clientWidth, btn.clientHeight);
    const s   = document.createElement("span");
    Object.assign(s.style, {
      width:  `${d}px`,
      height: `${d}px`,
      left:   `${e.clientX - btn.getBoundingClientRect().left - d / 2}px`,
      top:    `${e.clientY - btn.getBoundingClientRect().top  - d / 2}px`,
    });
    s.className = "ripple";
    btn.querySelector(".ripple")?.remove();
    btn.appendChild(s);
  }, []);
}

function useScrollBottom(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: "smooth" }), deps);
  return ref;
}

/* ────────────────────── Base de FAQ simple ───────────────────── */
const faqDB = [
  { question: "horario",    response: "Atención: lun‑vie 08 h – 16 h." },
  { question: "contacto",   response: "Tel 123‑4567 · contacto@municipio.com" },
  { question: "ubicación",  response: "Calle Principal #123, Centro" },
];

/* ─────────────────── Componente principal ───────────────────── */
export default function Chatbot() {
  /* UI y helpers */
  const [dark, setDark] = useDarkMode();
  const ripple          = useRipple();

  /* Estado del chat */
  const [messages, setMessages] = useState<Message[]>([
    { text: "¡Hola! Soy tu asistente virtual municipal. ¿En qué puedo ayudarte?", sender: "bot" },
    { text: 'Escribe "categorías" para trámites o "preguntas" para FAQ.',        sender: "bot" },
  ]);
  const [input,  setInput]  = useState("");
  const [typing, setTyping] = useState(false);

  /* Última predicción NLP (debug) */
  const [lastNlp, setLastNlp] = useState<string | null>(null);

  /* Flujo de menú */
  const [step, setStep] = useState<"idle"|"categories"|"procedures"|"faq">("idle");
  const [cats,       setCats]       = useState<Category[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [catSel,     setCatSel]     = useState<Category|null>(null);

  const endRef = useScrollBottom([messages]);

  /* Helpers texto → número */
  const extractNumber = (t: string) => {
    const m = t.match(/\d+/); return m ? Number(m[0]) : null;
  };

  const searchFAQ = (q: string) => {
    const clean = q.toLowerCase().trim();
    return (
      faqDB.find(f => f.question === clean)?.response ??
      faqDB.find(f => clean.includes(f.question))?.response ??
      null
    );
  };

  const formatBot = (txt: string) =>
    txt.split("\n").map((l,i)=><p key={i} className="whitespace-pre-wrap">{l}</p>);

  const resetFlow = () => {
    setStep("idle");
    setCatSel(null);
    setProcedures([]);
  };

  /* ──────────── Envío de mensaje ──────────── */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || typing) return;

    /* Añade mensaje del usuario */
    const userMsg = input;
    setMessages(p => [...p, { text:userMsg, sender:"user" }]);
    setInput(""); setTyping(true);

    /* 1️⃣  NLP: /predict */
    let nlpCat: string | null = null;
    try {
      const res = await fetch("http://localhost:9000/predict", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ text: userMsg }),
      });
      if (res.ok) {
        const data = await res.json() as { categoria: string };
        nlpCat = data.categoria;
        setLastNlp(nlpCat);
      }
    } catch { /* silencioso */ }

    /* 2️⃣  Flujo tradicional */
    let bot = nlpCat ? `Categoría detectada: **${nlpCat}**` : "";

    const faq = searchFAQ(userMsg);
    if (faq) bot += (bot?"\n\n":"") + faq;
    else {
      try {
        /* 2.1 Listar categorías */
        if (userMsg.toLowerCase().includes("categorias") || step==="idle") {
          const db = await getCategories(); setCats(db);
          bot += (bot?"\n\n":"") +
            (db.length
              ? "Categorías:\n" + db.map((c,i)=>`${i+1}. ${c.nombre_categoria}`).join("\n")
              : "No hay categorías registradas.");
          setStep(db.length?"categories":"idle");
        }
        /* 2.2 Seleccionar categoría */
        else if (step==="categories") {
          const idx = extractNumber(userMsg);
          if (!idx || idx<1 || idx>cats.length)
            bot += (bot?"\n\n":"") + `Número inválido (1‑${cats.length}).`;
          else {
            const cat = cats[idx-1]; setCatSel(cat);
            const procs = (await getProceduresByCategory(String(cat.id))).procedures;
            setProcedures(procs);
            bot += (bot?"\n\n":"") +
              (procs.length
                ? `Trámites en "${cat.nombre_categoria}":\n` +
                  procs.map((p,i)=>`${i+1}. ${p.nombre_tramite}`).join("\n")
                : `No hay trámites en "${cat.nombre_categoria}".`);
            setStep(procs.length?"procedures":"idle");
          }
        }
        /* 2.3 Seleccionar trámite */
        else if (step==="procedures") {
          const idx = extractNumber(userMsg);
          if (!idx || idx<1 || idx>procedures.length)
            bot += (bot?"\n\n":"") + `Número inválido (1‑${procedures.length}).`;
          else {
            const proc = procedures[idx-1];
            const raw  = await getRequirementsByProcedure(String(proc.id));
            const reqs: Requirement[] = Array.isArray(raw) ? raw : Object.values(raw).flat();
            bot += (bot?"\n\n":"") +
              (reqs.length
                ? `Requisitos de "${proc.nombre_tramite}":\n` +
                  reqs.map(r=>`• ${r.nombre_requisito}`).join("\n")
                : "No hay requisitos registrados.");
            resetFlow();
          }
        }
        /* 2.4 FAQ list */
        else if (userMsg.toLowerCase().includes("preguntas")) {
          bot += (bot?"\n\n":"") +
            (faqDB.length
              ? "Preguntas frecuentes:\n" + faqDB.map(f=>`• ${f.question}`).join("\n")
              : "No hay preguntas registradas.");
          setStep("faq");
        }
        /* 2.5 Fallback */
        else {
          bot += (bot?"\n\n":"") +
            'No entiendo. Escribe "categorías" o "preguntas".';
          resetFlow();
        }
      } catch {
        bot = (bot?"\n\n":"") + "Lo siento, ocurrió un error en el servidor.";
        resetFlow();
      }
    }

    /* Delay de “escribiendo…” */
    await new Promise(r=>setTimeout(r,650));
    setMessages(p => [...p, { text: bot, sender:"bot" }]);
    setTyping(false);
  }

  /* Esc = limpiar */
  useEffect(() => {
    const h = (e:KeyboardEvent)=> e.key==="Escape" && setInput("");
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  }, []);

  /* ───────────────────────── Hasta aquí, antes del return JSX ── */

  /* ════════════════════════════════════════════════════════════
     6.  Renderizado
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* HEADER */}
      <header className="flex items-center gap-4 bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-2 shadow">
        {/* Logo principal */}
        <img
          src={Logo1}
          alt="Logo principal"
          className="h-12 max-w-[160px] w-auto object-contain"
        />

        {/* ─── Títulos ─────────────────────────────────────────── */}
        <div className="flex-1 text-center">
          <h1
            style={{ color: "white" }}
            className="uppercase tracking-widest font-serif font-extrabold
                      text-3xl md:text-4xl lg:text-5xl drop-shadow-lg
                      dark:bg-gradient-to-r dark:from-teal-300 dark:to-cyan-100
                      dark:bg-clip-text dark:text-transparent"
          >
            Chatbot&nbsp;Ciudadano
          </h1>


          <p className="
              mt-1 text-teal-700 dark:text-teal-200
              text-sm md:text-base lg:text-lg
              font-medium tracking-wide
            "
          >
            Asistente virtual de trámites
          </p>
        </div>



        {/* Ícono Dark/Light */}
        <button
          onClick={() => setDark((d) => !d)}
          className="rounded-full p-2 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Cambiar tema"
        >
          {dark ? (
            <Sun className="h-6 w-6 text-yellow-300" />
          ) : (
            <Moon className="h-6 w-6 text-indigo-900" />
          )}
        </button>

        {/* Logo secundario */}
        <img
          src={Logo1}
          alt="Logo secundario"
          className="h-12 max-w-[160px] w-auto object-contain"
        />
      </header>

      {/* MENSAJES */}
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 shadow-lg backdrop-blur-sm ${
                m.sender === "user"
                  ? "bg-accent-500 text-white rounded-br-none"
                  : "bg-glass border border-white/10 text-foreground rounded-bl-none"
              }`}
            >
              {m.sender === "bot" ? formatBot(m.text) : m.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-glass rounded-xl rounded-bl-none px-4 py-2 flex gap-1">
              {[0, 0.15, 0.3].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-bounce rounded-full bg-primary-200"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </main>

      {/* INPUT */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-3 border-t border-white/10 bg-background px-4 py-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje…"
          disabled={typing}
          className="
            /* ─── Medidas ─────────────────────────────── */
            h-20                /* alto 80 px (tablet‑like) */
            w-11/12 md:w-3/4    /* 92 % en móvil · 75 % en ≥768 px */
            max-w-2xl           /* nunca pasa de 512 px */
            mx-auto             /* centrado horizontal */

            /* ─── Estilo visual ───────────────────────── */
            rounded-full bg-glass
            px-8 py-5 text-lg tracking-wide

            /* Color adaptativo */
            text-force-foreground
            placeholder:text-center placeholder:text-sm placeholder:foreground/50
            dark:placeholder:text-white/50

            /* Accesibilidad & estados */
            focus:outline-none focus:ring-1 focus:ring-accent-400
            disabled:opacity-40
          "
        />




        <button
          type="submit"
          onMouseDown={ripple}
          disabled={typing || !input.trim()}
          className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-accent-500 transition active:scale-95 enabled:hover:bg-accent-400 disabled:opacity-30"
          aria-label="Enviar"
        >
          {/* ícono SIEMPRE blanco para contrastar */}
          <SendHorizonal className="h-6 w-6 text-white" />
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------
   Fin — ~360 líneas, comentarios incluidos
------------------------------------------------------------------ */
