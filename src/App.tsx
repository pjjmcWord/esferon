import { useState, useEffect, useCallback, useRef } from 'react';

interface Shooter {
  id: number;
  x: number;
  y: number;
  filled: boolean;
  shooting: boolean;
}

interface Projectile {
  id: number;
  startX: number;
  startY: number;
  progress: number;
}

function App() {
  const [score, setScore] = useState(0);
  const [clickScale, setClickScale] = useState(1);
  const [shooters, setShooters] = useState<Shooter[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [sphereHit, setSphereHit] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  
  const projectileIdRef = useRef(0);
  const rippleIdRef = useRef(0);
  const shootIntervalRef = useRef<number | null>(null);

  const shooterCount = shooters.length;
  const nextCost = shooterCount === 0 ? 1 : Math.pow(10, shooterCount);

  const generatePosition = useCallback((): { x: number; y: number } => {
    const margin = 10;
    let x: number, y: number, attempts = 0;
    
    do {
      x = margin + Math.random() * (100 - 2 * margin);
      y = 18 + Math.random() * (70 - 18);
      attempts++;
      const dx = x - 50;
      const dy = y - 55;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 28) break;
    } while (attempts < 50);
    
    return { x, y };
  }, []);

  const handleSphereClick = useCallback(() => {
    setScore(prev => prev + 1);
    setClickScale(0.94);
    setSphereHit(true);
    setScreenShake(true);
    
    setTimeout(() => setClickScale(1.03), 50);
    setTimeout(() => setClickScale(1), 150);
    setTimeout(() => setSphereHit(false), 150);
    setTimeout(() => setScreenShake(false), 100);

    const rippleId = rippleIdRef.current++;
    setRipples(prev => [...prev, rippleId]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r !== rippleId));
    }, 700);
  }, []);

  const buyShooter = useCallback(() => {
    if (score >= nextCost) {
      setScore(prev => prev - nextCost);
      const pos = generatePosition();
      const newShooter: Shooter = {
        id: Date.now(),
        x: pos.x,
        y: pos.y,
        filled: false,
        shooting: false,
      };
      setShooters(prev => [...prev, newShooter]);

      setTimeout(() => {
        setShooters(prev => prev.map(s => 
          s.id === newShooter.id ? { ...s, filled: true } : s
        ));
      }, 150);
    }
  }, [score, nextCost, generatePosition]);

  useEffect(() => {
    const filledShooters = shooters.filter(s => s.filled);
    if (filledShooters.length === 0) {
      if (shootIntervalRef.current) {
        clearInterval(shootIntervalRef.current);
        shootIntervalRef.current = null;
      }
      return;
    }

    const shootOne = (index: number) => {
      const shooter = filledShooters[index % filledShooters.length];
      if (!shooter) return;

      setShooters(prev => prev.map(s => 
        s.id === shooter.id ? { ...s, shooting: true } : s
      ));

      const projId = projectileIdRef.current++;
      setProjectiles(prev => [...prev, {
        id: projId,
        startX: shooter.x,
        startY: shooter.y,
        progress: 0,
      }]);

      const startTime = Date.now();
      const duration = 400;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        setProjectiles(prev => prev.map(p => 
          p.id === projId ? { ...p, progress } : p
        ));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setScore(prev => prev + 1);
          setSphereHit(true);
          setTimeout(() => setSphereHit(false), 100);

          const rippleId = rippleIdRef.current++;
          setRipples(prev => [...prev, rippleId]);
          setTimeout(() => {
            setRipples(prev => prev.filter(r => r !== rippleId));
          }, 700);

          setProjectiles(prev => prev.filter(p => p.id !== projId));
          
          setShooters(prev => prev.map(s => 
            s.id === shooter.id ? { ...s, shooting: false } : s
          ));
        }
      };
      
      requestAnimationFrame(animate);
    };

    let currentIndex = 0;
    const intervalTime = Math.max(300, 1400 / filledShooters.length);
    
    shootIntervalRef.current = window.setInterval(() => {
      shootOne(currentIndex);
      currentIndex++;
    }, intervalTime);

    return () => {
      if (shootIntervalRef.current) {
        clearInterval(shootIntervalRef.current);
        shootIntervalRef.current = null;
      }
    };
  }, [shooters]);

  const canBuy = score >= nextCost;

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden select-none crt-screen ${screenShake ? 'animate-shake' : ''}`}
    >
      {/* CRT Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none z-[100] scanlines" />
      
      {/* CRT Vignette */}
      <div className="absolute inset-0 pointer-events-none z-[99] vignette" />

      {/* Score - flat retro style */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
        <div 
          className={`text-center font-black tabular-nums text-black retro-text ${sphereHit ? 'score-hit' : ''}`}
          style={{ 
            fontSize: 'clamp(3.5rem, 9vw, 7rem)',
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}
        >
          {score.toLocaleString()}
        </div>
      </div>

      {/* Main Sphere - flat style */}
      <div 
        className="absolute top-1/2 left-1/2 z-10 cursor-pointer"
        style={{
          transform: `translate(-50%, -50%) scale(${clickScale})`,
          transition: 'transform 0.1s ease-out',
          width: 'min(55vw, 55vh)',
          height: 'min(55vw, 55vh)',
        }}
        onClick={handleSphereClick}
      >
        {/* Ripples */}
        {ripples.map(id => (
          <div
            key={id}
            className="absolute top-1/2 left-1/2 rounded-full border-[2px] border-black/20"
            style={{
              width: '115%',
              height: '115%',
              transform: 'translate(-50%, -50%) scale(0.7)',
              animation: 'ripple 0.7s ease-out forwards',
            }}
          />
        ))}

        {/* The Sphere - flat black circle */}
        <div
          className="w-full h-full rounded-full relative"
          style={{
            background: '#111',
            boxShadow: sphereHit 
              ? '0 0 0 4px rgba(0,0,0,0.1), 0 8px 30px rgba(0,0,0,0.3)' 
              : '0 8px 30px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.15s ease',
          }}
        >
          {/* Subtle flat highlight */}
          <div 
            className="absolute rounded-full"
            style={{
              top: '15%',
              left: '22%',
              width: '25%',
              height: '18%',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '50%',
            }}
          />
        </div>

        {/* Click burst ring - flat style */}
        {sphereHit && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div 
              className="rounded-full border-[2px] border-black/30"
              style={{
                width: '125%',
                height: '125%',
                animation: 'burst-ring 0.4s ease-out forwards',
              }}
            />
          </div>
        )}
      </div>

      {/* Projectiles - flat style */}
      {projectiles.map(proj => {
        const currentX = proj.startX + (50 - proj.startX) * proj.progress;
        const currentY = proj.startY + (55 - proj.startY) * proj.progress;
        return (
          <div
            key={proj.id}
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${currentX}%`,
              top: `${currentY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div 
              className="rounded-full bg-black"
              style={{ 
                width: '10px', 
                height: '10px',
              }}
            />
          </div>
        );
      })}

      {/* Shooters - flat circles */}
      {shooters.map(shooter => (
        <div
          key={shooter.id}
          className="absolute z-5 pointer-events-none"
          style={{
            left: `${shooter.x}%`,
            top: `${shooter.y}%`,
            transform: `translate(-50%, -50%) scale(${shooter.shooting ? 1.3 : 1})`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          <div
            className="rounded-full shooter-fill"
            style={{
              width: '40px',
              height: '40px',
              borderWidth: '2.5px',
              borderStyle: 'solid',
              borderColor: '#111',
              background: shooter.filled ? '#111' : 'transparent',
              boxShadow: shooter.shooting ? '0 0 0 3px rgba(0,0,0,0.1)' : 'none',
            }}
          />
        </div>
      ))}

      {/* Buy Button - flat circle */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={buyShooter}
          disabled={!canBuy}
          className={`rounded-full transition-all duration-150 ${
            canBuy
              ? 'cursor-pointer hover:scale-110 active:scale-90'
              : 'cursor-not-allowed opacity-30'
          }`}
          style={{
            width: '56px',
            height: '56px',
            borderWidth: '3px',
            borderStyle: 'solid',
            borderColor: canBuy ? '#111' : '#999',
            background: canBuy ? '#111' : 'transparent',
          }}
        />
      </div>
    </div>
  );
}

export default App;
