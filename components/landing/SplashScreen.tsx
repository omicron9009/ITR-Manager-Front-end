'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('splashSeen')) return;
    // rAF ensures the element is painted before the animation clock starts
    requestAnimationFrame(() => setShow(true));
    const exitTimer = setTimeout(() => setExiting(true), 2200);
    return () => clearTimeout(exitTimer);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`splash-overlay${exiting ? ' splash-overlay--exit' : ''}`}
      onAnimationEnd={(e) => {
        // Only react to THIS element's own animation, not bubbled child events
        if (exiting && e.target === e.currentTarget) {
          sessionStorage.setItem('splashSeen', '1');
          setShow(false);
        }
      }}
    >
      <Image
        src="/darklogo1.png"
        alt="ITR Manager"
        width={320}
        height={110}
        priority
        className="splash-logo"
      />
    </div>
  );
}
