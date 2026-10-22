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

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
}

function App() {
  const [score, setScore] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clickScale, setClickScale] = useState(1);
  const [shooters, setShooters] = useState<Shooter[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [sphereHit, setSphereHit] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  
  const projectileIdRef = useRef(0);
  const textIdRef = useRef(0);
  const rippleIdRef = useRef(0);
  const shootIntervalRef = useRef<number | null>(null);

  const shooterCount = shooters.length;
  const nextCost = shooterCount === 0 ? 1 : Math.pow(10, shooterCount);

  // Generate random positions for shooters (avoiding center sphere area)
  const generatePosition = useCallback((): { x: number; y: number } => {
    const margin = 10;
    let x: number, y: number, attempts = 0;
    
    do {
      x = margin + Math.random() * (100 - 2 * margin);
      y = 20 + Math.random() * (70 - 20);
      attempts++;
      const dx = x - 50;
      const dy = y - 52;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 20) break;
    } while (attempts < 50);
    
    return { x, y };
  }, []);

  // Handle main sphere click
  const handleSphereClick = useCallback((e: React.MouseEvent) => {
    setScore(prev => prev + 1);
    setTotalClicks(prev => prev + 1);
    setClickScale(0.88);
    setSphereHit(true);
    setScreenShake(true);
    
    setTimeout(() => setClickScale(1.08), 60);
    setTimeout(() => setClickScale(1), 180);
    setTimeout(() => setSphereHit(false), 250);
    setTimeout(() => setScreenShake(false), 150);

    // Add ripple
    const rippleId = rippleIdRef.current++;
    setRipples(prev => [...prev, rippleId]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r !== rippleId));
    }, 700);

    // Floating +1 text
    const textId = textIdRef.current++;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetX = (Math.random() - 0.5) * 60;
    setFloatingTexts(prev => [...prev, { 
      id: textId, 
      x: rect.left + rect.width / 2 + offsetX, 
      y: rect.top,
      text: '+1' 
    }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== textId));
    }, 800);
  }, []);

  // Buy a new shooter
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

      // Animate fill after a brief delay
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

    // Each shooter fires every 1.5 seconds, staggered
    const shootOne = (index: number) => {
      const shooter = filledShooters[index % filledShooters.length];
      if (!shooter) return;

      // Animate shooter pulse
      setShooters(prev => prev.map(s => 
        s.id === shooter.id ? { ...s, shooting: true } : s
      ));

      // Create projectile
      const projId = projectileIdRef.current++;
      setProjectiles(prev => [...prev, {
        id: projId,
        startX: shooter.x,
        startY: shooter.y,
        progress: 0,
      }]);

      // Animate projectile towards sphere
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
          // Hit!
          setScore(prev => prev + 1);
          setSphereHit(true);
          setTimeout(() => setSphereHit(false), 100);

          // Ripple on hit
          const rippleId = rippleIdRef.current++;
          setRipples(prev => [...prev, rippleId]);
          setTimeout(() => {
            setRipples(prev => prev.filter(r => r !== rippleId));
          }, 700);

          // Remove projectile
          setProjectiles(prev => prev.filter(p => p.id !== projId));
          
          // Reset shooter
          setShooters(prev => prev.map(s => 
            s.id === shooter.id ? { ...s, shooting: false } : s
          ));
        }
      };
      
      requestAnimationFrame(animate);
    };

    let currentIndex = 0;
    const intervalTime = Math.max(300, 1500 / filledShooters.length);
    
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

  const perSecond = shooters.filter(s => s.filled).length;

  return (
    <div 
      className={`relative w-full h-screen bg-white overflow-hidden select-none ${screenShake ? 'animate-shake' : ''}`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Score Counter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black text-white px-10 py-5 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-50" />
          <div className="relative text-center">
            <div className="text-6xl font-black tracking-tight tabular-nums" 
              style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
              {score.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-[0.3em]">puntos</div>
          </div>
        </div>
        {perSecond > 0 && (
          <div className="text-center mt-2">
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
              +{perSecond}/seg
            </span>
          </div>
        )}
      </div>

      {/* Main Sphere */}
      <div 
        className="absolute top-1/2 left-1/2 z-10 cursor-pointer"
        style={{
          transform: `translate(-50%, -50%) scale(${clickScale})`,
          transition: 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={handleSphereClick}
      >
        {/* Ripples */}
        {ripples.map(id => (
          <div
            key={id}
            className="absolute top-1/2 left-1/2 rounded-full border-2 border-black/20"
            style={{
              width: '300px',
              height: '300px',
              transform: 'translate(-50%, -50%) scale(0.5)',
              animation: 'ripple 0.7s ease-out forwards',
            }}
          />
        ))}

        {/* Glow behind sphere */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: '280px',
            height: '280px',
            background: 'radial-gradient(circle, rgba(0,0,0,0.1) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        {/* The Sphere */}
        <div
          className="w-60 h-60 rounded-full relative"
          style={{
            background: `radial-gradient(circle at 35% 30%, #555 0%, #222 30%, #000 65%)`,
            boxShadow: sphereHit 
              ? '0 0 80px rgba(0,0,0,0.9), 0 0 150px rgba(0,0,0,0.4), inset 0 0 40px rgba(255,255,255,0.15)' 
              : '0 25px 80px rgba(0,0,0,0.6), 0 0 50px rgba(0,0,0,0.3), inset 0 -10px 30px rgba(0,0,0,0.9)',
            transition: 'box-shadow 0.15s ease',
          }}
        >
          {/* Specular highlight */}
          <div 
            className="absolute rounded-full"
            style={{
              top: '15%',
              left: '22%',
              width: '35%',
              height: '25%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)',
              transform: 'rotate(-20deg)',
            }}
          />
          {/* Secondary highlight */}
          <div 
            className="absolute rounded-full"
            style={{
              bottom: '20%',
              right: '25%',
              width: '15%',
              height: '10%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Click burst ring effect */}
        {sphereHit && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div 
              className="w-72 h-72 rounded-full border-4 border-black/30"
              style={{
                animation: 'burst-ring 0.4s ease-out forwards',
              }}
            />
          </div>
        )}
      </div>

      {/* Projectiles */}
      {projectiles.map(proj => {
        const currentX = proj.startX + (50 - proj.startX) * proj.progress;
        const currentY = proj.startY + (52 - proj.startY) * proj.progress;
        const size = 6 + Math.sin(proj.progress * Math.PI) * 4;
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
                boxShadow: '0 0 12px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.8)',
              }}
            />
            {/* Trail */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/20"
              style={{
                width: `${size * 2}px`,
                height: `${size * 2}px`,
                filter: 'blur(4px)',
              }}
            />
          </div>
        );
      })}

      {/* Shooters */}
      {shooters.map(shooter => (
        <div
          key={shooter.id}
          className="absolute z-5 pointer-events-none"
          style={{
            left: `${shooter.x}%`,
            top: `${shooter.y}%`,
            transform: `translate(-50%, -50%) scale(${shooter.shooting ? 1.3 : 1})`,
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
                ? '0 0 20px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.2)' 
                : shooter.filled 
                  ? '0 2px 10px rgba(0,0,0,0.3)' 
                  : 'none',
            }}
          />
          {/* Label */}
          {shooter.filled && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 font-medium">
              +1/s
            </div>
          )}
        </div>
      ))}

      {/* Floating +1 texts */}
      {floatingTexts.map(ft => (
        <div
          key={ft.id}
          className="fixed z-[100] pointer-events-none font-bold text-xl text-black"
          style={{
            left: `${ft.x}px`,
            top: `${ft.y}px`,
            animation: 'float-up 0.8s ease-out forwards',
          }}
        >
          {ft.text}
        </div>
      ))}

      {/* Buy Button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        <button
          onClick={buyShooter}
          disabled={score < nextCost}
          className={`group px-8 py-5 rounded-2xl font-bold text-lg transition-all duration-200 ${
            score >= nextCost
              ? 'bg-black text-white hover:scale-105 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)] active:scale-95 cursor-pointer shadow-xl'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div 
              className={`w-8 h-8 rounded-full border-[3px] transition-all duration-300 ${
                score >= nextCost ? 'border-white bg-gray-700' : 'border-gray-300'
              }`}
            />
            <div className="text-left">
              <div className="text-base">Comprar Disparador</div>
              <div className={`text-sm ${score >= nextCost ? 'text-gray-300' : 'text-gray-400'}`}>
                Costo: {nextCost.toLocaleString()} pts
              </div>
            </div>
          </div>
        </button>
        {shooterCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-gray-500 text-sm">
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              🔵 {shooterCount} disparador{shooterCount !== 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {totalClicks === 0 && shooterCount === 0 && (
        <div className="absolute top-48 left-1/2 -translate-x-1/2 z-50 text-gray-400 text-center">
          <p className="text-lg animate-pulse">↑ ¡Haz click en la esfera! ↑</p>
        </div>
      )}
      {totalClicks > 5 && shooterCount === 0 && (
        <div className="absolute top-48 left-1/2 -translate-x-1/2 z-50 text-gray-400 text-center">
          <p className="text-base animate-pulse">↓ Ahorra puntos para comprar un disparador ↓</p>
        </div>
      )}
    </div>
  );
}

export default App;
