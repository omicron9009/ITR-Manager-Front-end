'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import RoleCards from '@/components/landing/RoleCards';
import CTABanner from '@/components/landing/CTABanner';
import Footer from '@/components/landing/Footer';
import SplashScreen from '@/components/landing/SplashScreen';

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / 800, 1);
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="relative min-h-screen">
      {/* Background layer - dark */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-300"
        style={{
          backgroundImage: "url('/bg-1.png')",
          opacity: 1 - scrollProgress,
        }}
      />
      {/* Background layer - light */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-300 brightness-77"
        style={{
          backgroundImage: "url('/bg-dark.png')",
          opacity: scrollProgress,
        }}
      />
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
