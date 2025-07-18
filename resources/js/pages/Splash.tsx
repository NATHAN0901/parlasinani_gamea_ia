// resources/js/pages/Splash.tsx
import WaterWave from "react-water-wave";
import "jquery";
import { router } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

const MAX_RIPPLES = 5;

export default function Splash() {
  const [ripples, setRipples] = useState(0);
  const waveRef = useRef<any>(null);

  useEffect(() => () => waveRef.current?.destroy?.(), []);

  const handleClick = () => {
    if (ripples + 1 >= MAX_RIPPLES && waveRef.current?.pause) {
      waveRef.current.pause();
      waveRef.current.$el.css("pointer-events", "none");
    }
    setRipples((c) => Math.min(c + 1, MAX_RIPPLES));
  };

  const prefersReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowEnd = window.innerWidth < 768;

  return (
    <div
      onClick={handleClick}
      className="relative h-screen w-screen overflow-hidden"
    >
      {/* Lienzo agua */}
      <WaterWave
        ref={waveRef}
        className="!h-full !w-full"
        imageUrl="images/chat1.png"
        interactive={!prefersReduce}
        resolution={lowEnd ? 160 : 320}
        dropRadius={24}
        perturbance={0.04}
      >
        {() => (
          <div className="relative z-20 flex h-full w-full flex-col items-center justify-center gap-10 px-4 text-center">
            {/* TITULAR grande */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold uppercase tracking-widest text-white drop-shadow-[0_4px_25px_rgba(255,0,255,0.45)]">
              ¡Bienvenido!
            </h1>

            {/* DESCRIPCIÓN resaltada */}
            <p className="max-w-3xl text-lg sm:text-2xl md:text-3xl font-medium text-violet-100">
              Este chatbot municipal te ayudará a resolver consultas en&nbsp;
              <span className="font-extrabold text-fuchsia-300">48&nbsp;categorías</span>
              &nbsp;de trámites y servicios ciudadanos.
            </p>

            {/* BOTÓN notorio */}
            <button
                onClick={() => router.visit("/chatbot")}
                className="
                  relative inline-flex items-center justify-center
                  px-16 py-5 text-2xl font-bold tracking-wider uppercase
                  rounded-full
                  bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600
                  shadow-xl shadow-fuchsia-500/30
                  transition-transform duration-300
                  hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-fuchsia-400/60
                  before:absolute before:inset-0 before:-z-10 before:rounded-full
                  before:bg-gradient-to-br before:from-fuchsia-400/40 before:to-purple-400/40
                  before:blur-lg before:opacity-0
                  hover:before:opacity-100 before:transition-opacity before:duration-300
                  animate-pulse
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-3 h-7 w-7 drop-shadow-sm"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.752 11.168l-9.6-5.76A1 1 0 004 6.26v11.48a1 1 0 001.152.992l9.6-1.92a1 1 0 00.8-.992v-4.64a1 1 0 00-.8-.992z"
                  />
                </svg>
                Iniciar conversación
              </button>

          </div>
        )}
      </WaterWave>

      {/* Fondo violeta profundo */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-purple-900 via-violet-800 to-black" />

      {/* Resplandor radial */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.45)_0%,rgba(0,0,0,0)_65%)]" />
    </div>
  );
}
