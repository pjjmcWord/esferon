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
  const [buyPulse, setBuyPulse] = useState(false);
  
  const projectileIdRef = useRef(0);
  const rippleIdRef = useRef(0);
  const shootIntervalRef = useRef<number | null>(null);

  const shooterCount = shooters.length;
  const nextCost = shooterCount === 0 ? 1 : Math.pow(10, shooterCount);

  const generatePosition = useCallback((): { x: number; y: number } => {
    const margin = 8;
    let x: number, y: number, attempts = 0;
    
    do {
      x = margin + Math.random() * (100 - 2 * margin);
      y = 15 + Math.random() * (75 - 15);
      attempts++;
      const dx = x - 50;
      const dy = y - 55;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 30) break;
    } while (attempts < 50);
    
    return { x, y };
  }, []);

  const handleSphereClick = useCallback(() => {
    setScore(prev => prev + 1);
    setClickScale(0.92);
    setSphereHit(true);
    setScreenShake(true);
    
    setTimeout(() => setClickScale(1.04), 60);
    setTimeout(() => setClickScale(1), 180);
    setTimeout(() => setSphereHit(false), 200);
    setTimeout(() => setScreenShake(false), 120);

    const rippleId = rippleIdRef.current++;
    setRipples(prev => [...prev, rippleId]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r !== rippleId));
    }, 800);
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
      setBuyPulse(true);
      setTimeout(() => setBuyPulse(false), 300);

      setTimeout(() => {
        setShooters(prev => prev.map(s => 
          s.id === newShooter.id ? { ...s, filled: true } : s
        ));
      }, 200);
    }
  }, [score, nextCost, generatePosition]);

  // Auto-shooting loop
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
      const duration = 450;
      
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
          }, 800);

          setProjectiles(prev => prev.filter(p => p.id !== projId));
          
          setShooters(prev => prev.map(s => 
            s.id === shooter.id ? { ...s, shooting: false } : s
          ));
        }
      };
      
      requestAnimationFrame(animate);
    };

    let currentIndex = 0;
    const intervalTime = Math.max(250, 1200 / filledShooters.length);
    
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
      className={`relative w-full h-screen bg-white overflow-hidden select-none ${screenShake ? 'animate-shake' : ''}`}
    >
      {/* Score - large bold numbers above sphere */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <div 
          className="text-center font-black tabular-nums text-black"
          style={{ 
            fontSize: 'clamp(4rem, 10vw, 8rem)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textShadow: sphereHit ? '0 0 30px rgba(0,0,0,0.3)' : 'none',
            transition: 'text-shadow 0.15s ease',
          }}
        >
          {score.toLocaleString()}
        </div>
      </div>

      {/* Main Giant Sphere - Cookie Clicker style */}
      <div 
        className="absolute top-1/2 left-1/2 z-10 cursor-pointer"
        style={{
          transform: `translate(-50%, -50%) scale(${clickScale})`,
          transition: 'transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
          width: 'min(75vw, 75vh)',
          height: 'min(75vw, 75vh)',
        }}
        onClick={handleSphereClick}
      >
        {/* Ripples */}
        {ripples.map(id => (
          <div
            key={id}
            className="absolute top-1/2 left-1/2 rounded-full border-[3px] border-black/15"
            style={{
              width: '110%',
              height: '110%',
              transform: 'translate(-50%, -50%) scale(0.6)',
              animation: 'ripple 0.8s ease-out forwards',
            }}
          />
        ))}

        {/* Shadow under sphere */}
        <div 
          className="absolute bottom-[-8%] left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: '80%',
            height: '15%',
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.15) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />

        {/* The Giant Sphere */}
        <div
          className="w-full h-full rounded-full relative"
          style={{
            background: `radial-gradient(circle at 38% 32%, #4a4a4a 0%, #222 25%, #0a0a0a 55%, #000 75%)`,
            boxShadow: sphereHit 
              ? '0 0 100px rgba(0,0,0,0.8), 0 0 200px rgba(0,0,0,0.3), inset 0 0 60px rgba(255,255,255,0.1)' 
              : '0 30px 100px rgba(0,0,0,0.5), 0 0 60px rgba(0,0,0,0.2), inset 0 -15px 40px rgba(0,0,0,0.9)',
            transition: 'box-shadow 0.15s ease',
          }}
        >
          {/* Main specular highlight */}
          <div 
            className="absolute rounded-full"
            style={{
              top: '12%',
              left: '20%',
              width: '30%',
              height: '22%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.3) 0%, transparent 70%)',
              transform: 'rotate(-15deg)',
            }}
          />
          {/* Small bright spot */}
          <div 
            className="absolute rounded-full"
            style={{
              top: '18%',
              left: '28%',
              width: '8%',
              height: '6%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 70%)',
            }}
          />
          {/* Subtle bottom reflection */}
          <div 
            className="absolute rounded-full"
            style={{
              bottom: '18%',
              right: '22%',
              width: '12%',
              height: '8%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Click burst ring */}
        {sphereHit && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div 
              className="rounded-full border-[4px] border-black/25"
              style={{
                width: '120%',
                height: '120%',
                animation: 'burst-ring 0.5s ease-out forwards',
              }}
            />
          </div>
        )}
      </div>

      {/* Projectiles */}
      {projectiles.map(proj => {
        const currentX = proj.startX + (50 - proj.startX) * proj.progress;
        const currentY = proj.startY + (55 - proj.startY) * proj.progress;
        const size = 8 + Math.sin(proj.progress * Math.PI) * 5;
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
                width: `${size}px`, 
                height: `${size}px`,
                boxShadow: '0 0 15px rgba(0,0,0,0.7), 0 0 5px rgba(0,0,0,0.9)',
              }}
            />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/15"
              style={{
                width: `${size * 2.5}px`,
                height: `${size * 2.5}px`,
                filter: 'blur(5px)',
              }}
            />
          </div>
        );
      })}

      {/* Shooters (circles scattered around) */}
      {shooters.map(shooter => (
        <div
          key={shooter.id}
          className="absolute z-5 pointer-events-none"
          style={{
            left: `${shooter.x}%`,
            top: `${shooter.y}%`,
            transform: `translate(-50%, -50%) scale(${shooter.shooting ? 1.4 : 1})`,
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="w-14 h-14 rounded-full shooter-fill"
            style={{
              borderWidth: '3px',
              borderStyle: 'solid',
              borderColor: '#000',
              background: shooter.filled 
                ? 'radial-gradient(circle at 40% 35%, #444 0%, #111 50%, #000 100%)' 
                : 'transparent',
              boxShadow: shooter.shooting 
                ? '0 0 25px rgba(0,0,0,0.6), 0 0 50px rgba(0,0,0,0.2)' 
                : shooter.filled 
                  ? '0 3px 12px rgba(0,0,0,0.3)' 
                  : 'none',
            }}
          />
        </div>
      ))}

      {/* Buy Button - just a circle, no text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={buyShooter}
          disabled={!canBuy}
          className={`relative rounded-full transition-all duration-200 ${
            canBuy
              ? 'cursor-pointer hover:scale-110 active:scale-90'
              : 'cursor-not-allowed opacity-40'
          }`}
          style={{
            width: '70px',
            height: '70px',
            borderWidth: '4px',
            borderStyle: 'solid',
            borderColor: canBuy ? '#000' : '#ccc',
            background: canBuy 
              ? 'radial-gradient(circle at 40% 35%, #444 0%, #111 50%, #000 100%)' 
              : 'transparent',
            boxShadow: canBuy 
              ? (buyPulse ? '0 0 40px rgba(0,0,0,0.8)' : '0 4px 20px rgba(0,0,0,0.4)')
              : 'none',
            transform: buyPulse ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Cost indicator - small dots showing cost level */}
          {canBuy && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
              {[...Array(Math.min(shooterCount + 1, 5))].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-black" />
              ))}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export default App;
