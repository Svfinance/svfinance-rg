import { useTheme } from "../../contexts/ThemeContext";
import worldMap from "../../assets/world-map.svg";
import fundoGlassEGelo  from "../../assets/fundoglassegelo.jpg";
import fundoCinzaPrata  from "../../assets/fundocinzaprata.jpg";

/**
 * PageLayout — wrapper de fundo global
 *
 * Lógica automática por tema:
 *   glass → fundoglassegelo.jpg   + overlay rgba(200,215,235,0.25)
 *   gray  → fundocinzaprata.jpg   + overlay rgba(15,20,35,0.45)
 *   demais → bgPrimary sólido     + mapa SVG com mapOpacity do tema
 *
 * Para trocar a imagem de fundo de qualquer tema:
 *   1. Baixe a imagem desejada
 *   2. Coloque em src/assets/ com o nome correspondente:
 *      - Glass & Gelo  → fundoglassegelo.jpg
 *      - Cinza & Prata → fundocinzaprata.jpg
 *   3. Pronto — reflete em todas as páginas automaticamente
 */

// Mapa de imagens por themeId — adicione novos temas aqui se precisar
const BG_IMAGES = {
  glass: fundoGlassEGelo,
  gray:  fundoCinzaPrata,
};

export default function PageLayout({ children, style }) {
  const { theme, themeId } = useTheme();

  const bgImage   = BG_IMAGES[themeId] || null;
  const isImgTheme = !!bgImage;   // true para glass e gray

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      // fallback de cor enquanto imagem carrega (ou para temas sem imagem)
      background: isImgTheme ? theme.bgImageFallback : theme.bgPrimary,
      // imagem de fundo fixa para temas com bgImage
      ...(isImgTheme && {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }),
      color: theme.textPrimary,
      fontFamily: "'Inter','Segoe UI',sans-serif",
      position: "relative",
      ...style,
    }}>

      {/* ── Overlay semitransparente — temas com imagem de fundo ── */}
      {isImgTheme && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: theme.bgOverlay,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}

      {/* ── Mapa SVG — temas sem imagem de fundo ── */}
      {!isImgTheme && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(${worldMap})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "1100px",
          opacity: theme.mapOpacity,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}

      {/* ── Conteúdo da página ── */}
      {children}
    </div>
  );
}