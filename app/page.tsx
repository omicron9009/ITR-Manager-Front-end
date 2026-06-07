import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import RoleCards from '@/components/landing/RoleCards';
import CTABanner from '@/components/landing/CTABanner';
import Footer from '@/components/landing/Footer';
import SplashScreen from '@/components/landing/SplashScreen';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <SplashScreen />
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <RoleCards />
      <CTABanner />
      <Footer />
    </main>
  );
}
