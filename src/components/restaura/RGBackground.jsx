// src/components/restaura/RGBackground.jsx
// Plano de fundo com logo Restaura Glass em marca d'água.
// Renderizado APENAS quando company_id === "17" (isRestauraGlass).
// Colocar dentro do PageLayout, antes do conteúdo, com position fixed.

export default function RGBackground() {
  return (
    <>
      <style>{`
        .rg-bg-wrapper {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        /* Gradiente base verde escuro suave */
        .rg-bg-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 30%,
              rgba(43,81,2,0.08) 0%,
              rgba(43,81,2,0.03) 50%,
              transparent 100%),
            radial-gradient(ellipse 60% 80% at 80% 80%,
              rgba(43,81,2,0.06) 0%,
              transparent 70%);
        }

        /* Logo central em marca d'água */
        .rg-bg-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -52%);
          width: min(520px, 75vw);
          opacity: 0.045;
          filter: grayscale(0%) saturate(0.8) brightness(0.6);
          user-select: none;
          -webkit-user-select: none;
        }

        /* Versão menor no canto inferior direito */
        .rg-bg-logo-corner {
          position: absolute;
          bottom: 32px;
          right: 40px;
          width: 140px;
          opacity: 0.06;
          filter: grayscale(20%) saturate(0.7);
          user-select: none;
          -webkit-user-select: none;
        }

        /* Linha decorativa tênue no topo */
        .rg-bg-topline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(43,81,2,0.4) 30%,
            rgba(43,81,2,0.6) 50%,
            rgba(43,81,2,0.4) 70%,
            transparent 100%
          );
        }

        @media (max-width: 768px) {
          .rg-bg-logo {
            width: min(320px, 90vw);
            opacity: 0.035;
          }
          .rg-bg-logo-corner {
            display: none;
          }
        }
      `}</style>

      <div className="rg-bg-wrapper">
        <div className="rg-bg-gradient" />
        <div className="rg-bg-topline" />

        {/* Logo central — marca d'água principal */}
        <img
          className="rg-bg-logo"
          src="/logos/restauraglass.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        {/* Logo canto — marca d'água secundária */}
        <img
          className="rg-bg-logo-corner"
          src="/logos/restauraglass.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      </div>
    </>
  );
}