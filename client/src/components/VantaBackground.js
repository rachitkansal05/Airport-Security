import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import RINGS from 'vanta/dist/vanta.rings.min';

const VantaBackground = ({ children }) => {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  useEffect(() => {
    if (!vantaEffect && vantaRef.current) {
      if (!THREE.Clock) {
        console.error('THREE.Clock is not available. Make sure THREE is properly loaded.');
        return;
      }

      const clock = new THREE.Clock();
      
      setVantaEffect(
        RINGS({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          backgroundColor: 0x030c20,
          color: 0x00ff41,
          backgroundAlpha: 1.0,
          points: 12,
          maxDistance: 28.00,
          spacing: 14.00,
          speed: 1.5,
          clock: clock
        })
      );
    }
    
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return (
    <>
      <div 
        className="vanta-background" 
        ref={vantaRef} 
        style={{ 
          position: 'fixed', 
          width: '100%', 
          height: '100%', 
          top: 0, 
          left: 0, 
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
      
      <div className="vanta-content">
        {children}
      </div>
    </>
  );
};

export default VantaBackground;