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
import Logo1 from "@/pages/assets/plantilla-logotipo-computadora-profesional.png";

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

/* ─────────────────── Componente principal ───────────────────── */
export default function Chatbot() {
  /* UI */
  const [dark, setDark] = useDarkMode();
  const ripple = useRipple();

  /* Chat */
  const [messages, setMessages] = useState<Message[]>([
    {
      text : "¡Hola! Soy tu asistente virtual municipal. ¿En qué puedo ayudarte?",
      sender: "bot",
    },
    { text : 'Escribe "categorías" para trámites o "preguntas" para FAQ.',
      sender: "bot",
    },
  ]);
  const [input,  setInput]  = useState("");
  const [typing, setTyping] = useState(false);

  /* Datos cargados dinámicamente */
  const [cats,       setCats]       = useState<Category[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [catSel,     setCatSel]     = useState<Category|null>(null);

  const endRef = useScrollBottom([messages]);

  /* ─────────────── FSM ─────────────── */
  type Step =
    | "idle"
    | "listingCats"
    | "listingProcs"
    | "faq"
    | "nlpAnswer";          // acaba de responder la rama NLP

  const [step, setStep] = useState<Step>("idle");
  const goto = (s: Step) => {
    setStep(s);
    if (s === "idle") {
      setCatSel(null);
      setProcedures([]);
    }
  };

  /* ───────── utilidades ───────── */
  const extractNumber = (t:string) => {
    const m = t.match(/\d+/);
    return m ? Number(m[0]) : null;
  };

  // Preguntas frecuentes (FAQ) de ejemplo
  const faqDB: { question: string; response: string }[] = [
    { question: "¿cuáles son los horarios de atención?", response: "El horario de atención es de lunes a viernes de 8:00 a 16:00." },
    { question: "¿dónde se encuentra la municipalidad?", response: "La municipalidad se encuentra en la Plaza Principal, Av. Central #123." },
    // Agrega más preguntas y respuestas aquí según sea necesario
  ];

  const searchFAQ = (q:string) => {
    const clean = q.toLowerCase().trim();
    return (
      faqDB.find(f => f.question === clean)?.response ??
      faqDB.find(f => clean.includes(f.question))?.response ?? null
    );
  };

  const formatBot = (txt:string) =>
    txt.split("\n").map((l,i)=>
      <p key={i} className="whitespace-pre-wrap">{l}</p>);

  /* ─────── Respuesta NLP aislada ─────── */
  async function handleNlp(catName: string) {
    let bot = `Categoría detectada: **${catName}**`;

    /* asegura cats[] */
    let cat =
      cats.find(c => c.nombre_categoria === catName) ??
      (await (async () => {
        const full = await getCategories();
        setCats(full);
        return full.find((c: Category) => c.nombre_categoria === catName);
      })());

    if (!cat) return bot;              // sin coincidencia: solo devuelve línea

    const procs = (await getProceduresByCategory(String(cat.id))).procedures;
    setProcedures(procs);
    setCatSel(cat);

    if (procs.length) {
      bot +=
        "\n\nTrámites:\n" +
        procs.map((p: Procedure, i: number) => `${i+1}. ${p.nombre_tramite}`).join("\n");
    }
    return bot;
  }

 /* ─────────────── envío ─────────────── */
async function onSubmit(e: FormEvent) {
  e.preventDefault();
  if (!input.trim() || typing) return;

  const userMsg  = input;
  const lowMsg   = userMsg.toLowerCase();
  const isCmdCat = lowMsg.includes("categorias");
  const isCmdFAQ = lowMsg.includes("preguntas");

  setMessages(p => [...p, { text:userMsg, sender:"user" }]);
  setInput("");
  setTyping(true);

  /*  Si la petición es un comando (“categorias” / “preguntas”)    ──
      o ya estamos dentro de un sub‑menú, *omitimos* el clasificador NLP.
  */
  const skipNlp =
    isCmdCat || isCmdFAQ ||
    ["listingCats","listingProcs","faq"].includes(step);

  /* 1️⃣ Clasificador NLP (solo cuando procede) */
  if (!skipNlp) {
    try {
      const res = await fetch("http://localhost:9000/predict", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ text: userMsg }),
      });
      if (res.ok) {
        const { categoria } = (await res.json()) as { categoria: string };
        const bot = await handleNlp(categoria);

        goto("nlpAnswer");
        await new Promise(r => setTimeout(r,650));
        setMessages(p => [...p, { text: bot, sender:"bot" }]);
        setTyping(false);
        return;                       // ← no se ejecuta FSM
      }
    } catch {/* si falla, sigue con FSM */}
  }

  /* 2️⃣ FSM tradicional */
  let bot = "";
  try {
    switch (step) {
      /* ───────── estado idle ───────── */
      case "idle":
        if (isCmdCat) {                               // listar categorías
          const db = await getCategories();
          setCats(db);
          bot = db.length
            ? "Categorías:\n" +
              db.map((c,i)=>`${i+1}. ${c.nombre_categoria}`).join("\n")
            : "No hay categorías registradas.";
          goto("listingCats");
        } else if (isCmdFAQ) {                        // listar FAQ
          bot = faqDB.length
            ? "Preguntas frecuentes:\n" +
              faqDB.map(f=>`• ${f.question}`).join("\n")
            : "No hay preguntas registradas.";
          goto("faq");
        } else {
          bot = searchFAQ(userMsg) ??
            'No entiendo. Escribe "categorías" o "preguntas".';
        }
        break;

      /* ───────── dentro de lista de categorías ───────── */
      case "listingCats": {
        const idx = extractNumber(userMsg);
        if (!idx || idx<1 || idx>cats.length) {
          bot = `Número inválido (1‑${cats.length}).`;
          break;
        }
        const cat = cats[idx-1];
        setCatSel(cat);
        const procs = (await getProceduresByCategory(String(cat.id))).procedures;
        setProcedures(procs);
        bot = procs.length
          ? `Trámites en "${cat.nombre_categoria}":\n` +
            procs.map((p,i)=>`${i+1}. ${p.nombre_tramite}`).join("\n")
          : `No hay trámites en "${cat.nombre_categoria}".`;
        goto("listingProcs");
        break;
      }

      /* ───────── dentro de lista de trámites ───────── */
      case "listingProcs": {
        const idx = extractNumber(userMsg);
        if (!idx || idx<1 || idx>procedures.length) {
          bot = `Número inválido (1‑${procedures.length}).`;
          break;
        }
        const proc = procedures[idx-1];
        const raw  = await getRequirementsByProcedure(String(proc.id));
        const reqs: Requirement[] =
          Array.isArray(raw) ? raw : Object.values(raw).flat();
        bot = reqs.length
          ? `Requisitos de "${proc.nombre_tramite}":\n` +
            reqs.map(r=>`• ${r.nombre_requisito}`).join("\n")
          : "No hay requisitos registrados.";
        goto("idle");
        break;
      }
    }
  } catch {
    bot = "Lo siento, ocurrió un error en el servidor.";
    goto("idle");
  }

  await new Promise(r => setTimeout(r,650));
  setMessages(p => [...p, { text: bot, sender:"bot" }]);
  setTyping(false);
}

  /* Esc → limpiar input */
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
          onClick={() => setDark((d: boolean) => !d)}
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
          className="h-20 w-11/12 md:w-3/4 max-w-2xl mx-auto rounded-full bg-glass px-8 py-5 text-lg tracking-wide text-force-foreground placeholder:text-center placeholder:text-sm placeholder:foreground/50 dark:placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-accent-400 disabled:opacity-40"/>



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


function useScrollBottom(deps: any[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  }, deps);
  return ref;
}

function useDarkMode(): [boolean, (fn: (d: boolean) => boolean) => void] {
  const [dark, setDarkState] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const setDark = useCallback((fn: (d: boolean) => boolean) => {
    setDarkState(prev => fn(prev));
  }, []);

  return [dark, setDark];
}

// Simple ripple hook placeholder
function useRipple() {
  return () => {};
}
/* ------------------------------------------------------------------
   Fin — ~360 líneas, comentarios incluidos
------------------------------------------------------------------ */
