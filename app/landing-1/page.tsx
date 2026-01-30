import HeroSectionOriginal from '../components/HeroSectionOriginal';
import ServicesGridSection from '../components/ServicesGridSection';
import HowItWorksSectionOriginal from '../components/HowItWorksSectionOriginal';
import FinalCallToActionSection from '../components/FinalCallToActionSection';

export default function Landing1() {
  return (
    <main className="min-h-screen bg-white">
      <div id="hero">
        <HeroSectionOriginal />
      </div>
      <div id="services">
        <ServicesGridSection />
      </div>
      <div id="process">
        <HowItWorksSectionOriginal />
      </div>
      <div id="contact-form">
        <FinalCallToActionSection />
      </div>
    </main>
  );
}
