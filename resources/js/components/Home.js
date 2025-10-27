import React, { useState, useEffect } from "react";
import Login from "./Login";

export default function Home() {
  // Slideshow images
  const images = [
    '/images/sjit-cta-group-a-1168x657.webp',
    '/images/SJIT_Final_Logo.original.png',
    '/images/sjit-campus.jpg', // Replace with another SJIT image if available
  ];
  const [bgIndex, setBgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setBgIndex((prev) => (prev + 1) % images.length);
        setFade(true);
      }, 600); // fade out duration
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="login-page fade-in"
      style={{
        minHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
      }}
    >
      {/* Slideshow background */}
      {images.map((img, i) => (
        <img
          key={img}
          src={img}
          alt="SJIT"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: 0,
            opacity: bgIndex === i && fade ? 1 : 0,
            transition: 'opacity 1s cubic-bezier(.4,0,.2,1)',
            pointerEvents: 'none',
          }}
        />
      ))}
      {/* Centered login form only, no extra modal */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
      }}>
        <Login />
      </div>
    </div>
  );
}
