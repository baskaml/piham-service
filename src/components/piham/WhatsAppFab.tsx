import { buildWaUrl, trackWaClick } from "@/lib/whatsapp";

const WA_NUMBER = "22899500054";
const WA_MESSAGE = "Bonjour PIHAM Info Services, je souhaite discuter d'un projet avec vous.";

export const WhatsAppFab = () => (
  <a
    href={buildWaUrl(WA_NUMBER, WA_MESSAGE) ?? `https://wa.me/${WA_NUMBER}`}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => trackWaClick("fab")}
    aria-label="Discuter avec nous sur WhatsApp"
    className="group fixed bottom-6 right-6 z-40 flex items-center gap-3"
  >
    <span className="hidden sm:inline-flex bg-white shadow-card-soft text-neutral-900 rounded-full px-4 py-2 text-xs font-semibold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
      Discutons sur WhatsApp
    </span>
    <span className="relative h-14 w-14 rounded-full flex items-center justify-center text-white shadow-hover animate-pulse-soft" style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="relative w-7 h-7">
        <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.2-.3-.3-.6-.4z" />
        <path d="M20.5 3.5C18.3 1.2 15.3 0 12 0 5.4 0 0 5.4 0 12c0 2.1.5 4.2 1.6 6L0 24l6.2-1.6c1.7.9 3.7 1.4 5.7 1.4h.1c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.3zM12 21.8c-1.8 0-3.6-.5-5.2-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.6 15.6 2 13.8 2 12 2 6.5 6.5 2 12 2c2.7 0 5.2 1 7 3 1.9 1.9 3 4.4 3 7 0 5.5-4.5 9.8-10 9.8z" />
      </svg>
    </span>
  </a>
);
