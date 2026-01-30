import HeroSectionOriginal from './components/HeroSectionOriginal';
import FinalCallToActionSection from './components/FinalCallToActionSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div id="hero">
        <HeroSectionOriginal />
      </div>
      <div id="contact-form">
        <FinalCallToActionSection />
      </div>
    </main>
  );
}
