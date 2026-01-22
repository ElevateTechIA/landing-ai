import HeroSection from './components/HeroSection';
import ServicesGridSection from './components/ServicesGridSection';
import HowItWorksSection from './components/HowItWorksSection';
import FinalCallToActionSection from './components/FinalCallToActionSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div id="hero">
        <HeroSection />
      </div>
      <div id="services">
        <ServicesGridSection />
      </div>
      <div id="process">
        <HowItWorksSection />
      </div>
      <div id="contact-form">
        <FinalCallToActionSection />
      </div>
    </main>
  );
}
