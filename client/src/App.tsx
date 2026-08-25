/**
 * Ecos de Aetherion — Cartografia Viva.
 * A moldura React permanece discreta: a cena e a exploração são a experiência central.
 */
import ErrorBoundary from "./components/ErrorBoundary";
import GameCanvas from "./components/GameCanvas";

export default function App() {
  return (
    <ErrorBoundary>
      <GameCanvas />
    </ErrorBoundary>
  );
}
