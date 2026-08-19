import { X } from "lucide-react";

interface Props {
  onClick: () => void;
  /** true em modais de fundo escuro (X branco); false/omitido em cards claros. */
  light?: boolean;
  /** cor explicita do X (ex.: segue o tema); tem prioridade sobre `light`. */
  color?: string;
  /** ajuste fino de posicao quando o padrao nao encaixa */
  top?: number;
  right?: number;
}

/** Botao de fechar (X) no canto superior direito de um modal.
 *  O card pai precisa ter position:relative para ancorar corretamente. */
export default function ModalCloseButton({ onClick, light, color, top = 10, right = 10 }: Props) {
  const fg = color ?? (light ? "#ffffff" : "#64748b");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fechar"
      style={{
        position: "absolute", top, right,
        width: 34, height: 34, borderRadius: "50%",
        border: "none", cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: light ? "rgba(255,255,255,0.18)" : "rgba(148,163,184,0.16)",
        color: fg,
        zIndex: 5,
      }}
    >
      <X style={{ width: 20, height: 20 }} />
    </button>
  );
}
