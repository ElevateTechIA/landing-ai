import HeroSection from '../components/HeroSection';
import HowItWorksSection from '../components/HowItWorksSection';
import ReplaceThisSection from '../components/ReplaceThisSection';

export default function AIAgentLanding() {
  return (
    <main className="min-h-screen bg-white">
      <div id="hero">
        <HeroSection />
      </div>
      <div id="process">
        <HowItWorksSection />
      </div>
      <div id="replace">
        <ReplaceThisSection />
      </div>
    </main>
  );
}
