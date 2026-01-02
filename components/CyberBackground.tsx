import React, { useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
  lineWidth: number;
}

interface CyberBackgroundProps {
  theme?: 'cyberpunk' | 'neon-3d' | 'iridescent' | 'crystal';
}

const CyberBackground: React.FC<CyberBackgroundProps> = ({ theme = 'cyberpunk' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const createRipple = (x: number, y: number, isClick: boolean) => {
      let color = '#00f3ff';
      if (theme === 'neon-3d') color = '#ff0055'; // Hot pink for neon 3d default
      if (theme === 'iridescent') color = `hsl(${Math.random() * 360}, 100%, 50%)`;
      if (theme === 'crystal') color = `hsl(${Math.random() * 60 + 180}, 90%, 80%)`; // Cyan/Blue crystal range

      if (isClick) {
        const count = 3;
        for (let i = 0; i < count; i++) {
          ripples.current.push({
            x,
            y,
            radius: 5 + (i * 10), 
            maxRadius: 250 + (i * 50),
            alpha: 0.8 - (i * 0.1),
            color: color,
            speed: 3 + Math.random(),
            lineWidth: 2 + Math.random() * 2
          });
        }
      } else {
        ripples.current.push({
          x,
          y,
          radius: 2,
          maxRadius: 60,
          alpha: 0.4,
          color: color,
          speed: 1.5,
          lineWidth: 1
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - lastMousePos.current.x, e.clientY - lastMousePos.current.y);
      if (dist > 10) {
        createRipple(e.clientX, e.clientY, false);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleClick = (e: MouseEvent) => {
      createRipple(e.clientX, e.clientY, true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    const drawCyberpunk = () => {
       // Original Grid Logic
       ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
       ctx.lineWidth = 1;
       const gridSize = 40;
       
       for (let x = 0; x < canvas.width; x += gridSize) {
         ctx.beginPath();
         ctx.moveTo(x, 0);
         ctx.lineTo(x, canvas.height);
         ctx.stroke();
       }
       for (let y = 0; y < canvas.height; y += gridSize) {
         ctx.beginPath();
         ctx.moveTo(0, y);
         ctx.lineTo(canvas.width, y);
         ctx.stroke();
       }
    };

    const drawNeon3D = () => {
        // Glowing Neon 3D Orbs / Clouds
        const t = timeRef.current * 0.0015;
        
        // Clear with slight transparency for trail effect? No, clean wipe for now.
        // But we want deep black bg.
        ctx.fillStyle = '#000005';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const orbs = [
            { x: 0.2, y: 0.3, color: 'rgba(0, 234, 255, 0.15)', r: 300, speed: 1.0 },
            { x: 0.8, y: 0.7, color: 'rgba(255, 0, 85, 0.15)', r: 350, speed: 0.8 },
            { x: 0.5, y: 0.5, color: 'rgba(189, 0, 255, 0.1)', r: 400, speed: 0.5 }
        ];

        orbs.forEach((orb, i) => {
             const x = canvas.width * orb.x + Math.sin(t * orb.speed + i) * 150;
             const y = canvas.height * orb.y + Math.cos(t * orb.speed * 0.8 + i) * 150;
             
             const g = ctx.createRadialGradient(x, y, 0, x, y, orb.r);
             g.addColorStop(0, orb.color.replace('0.15', '0.4')); // Intense center
             g.addColorStop(0.4, orb.color);
             g.addColorStop(1, 'rgba(0,0,0,0)');
             
             ctx.fillStyle = g;
             ctx.beginPath();
             ctx.arc(x, y, orb.r, 0, Math.PI * 2);
             ctx.fill();
        });
        
        // Wireframe 3D grid effect in background
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i=0; i<canvas.width; i+=100) {
             const offset = Math.sin(t + i*0.01) * 20;
             ctx.moveTo(i, 0);
             ctx.lineTo(i + offset, canvas.height);
        }
        ctx.stroke();
    };

    const drawIridescent = () => {
        const t = timeRef.current * 0.002;
        
        // Moving Waves
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
           const yOffset = (canvas.height / 5) * i + (canvas.height/2);
           const amplitude = 50 + (i * 20);
           
           ctx.beginPath();
           for(let x=0; x < canvas.width; x+=10) {
               const y = yOffset + Math.sin(x * 0.005 + t + i) * amplitude * Math.sin(t * 0.5);
               if(x===0) ctx.moveTo(x, y);
               else ctx.lineTo(x, y);
           }
           
           const hue = (timeRef.current * 0.1 + i * 50) % 360;
           ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.1)`;
           ctx.stroke();
        }
    };

    const drawCrystal = () => {
        const t = timeRef.current * 0.0008;
        
        // Prismatic gradients / Crystal facets
        // Simulate by drawing large angular gradients
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        // Base deep blue
        ctx.fillStyle = '#0f0c29';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        // Moving prismatic beams
        for(let i=0; i<3; i++) {
            const angle = t + (i * (Math.PI * 2 / 3));
            const x = cx + Math.cos(angle) * 300;
            const y = cy + Math.sin(angle) * 300;
            
            const grad = ctx.createLinearGradient(cx, cy, x, y);
            grad.addColorStop(0, 'rgba(166, 255, 203, 0.0)');
            grad.addColorStop(0.5, `hsla(${ (t * 50 + i * 120) % 360 }, 70%, 80%, 0.1)`);
            grad.addColorStop(1, 'rgba(250, 172, 168, 0.0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(canvas.width * (i%2), 0); // Top corners
            ctx.lineTo(x, y);
            ctx.fill();
        }
        
        // Shiny facets
        ctx.globalCompositeOperation = 'overlay';
        const grad2 = ctx.createConicGradient(t * 0.5, cx, cy);
        grad2.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad2.addColorStop(0.25, 'rgba(200,200,255,0.1)');
        grad2.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        grad2.addColorStop(0.75, 'rgba(200,255,255,0.1)');
        grad2.addColorStop(1, 'rgba(255,255,255,0.05)');
        ctx.fillStyle = grad2;
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    };

    const animate = (timestamp: number) => {
      timeRef.current = timestamp;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Theme Background FX
      if (theme === 'cyberpunk') drawCyberpunk();
      else if (theme === 'neon-3d') drawNeon3D();
      else if (theme === 'iridescent') drawIridescent();
      else if (theme === 'crystal') drawCrystal();

      // 2. Draw Ripples (Common interaction)
      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const r = ripples.current[i];
        r.radius += r.speed;
        r.alpha -= 0.01;

        if (r.alpha <= 0) {
          ripples.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        
        ctx.strokeStyle = r.color;
        // Adjust opacity in style for stroke
        ctx.globalAlpha = r.alpha;
        ctx.lineWidth = r.lineWidth;
        ctx.stroke();
        
        // Fill only if large or specific themes
        if (theme !== 'cyberpunk' || r.maxRadius > 100) {
             ctx.fillStyle = r.color;
             ctx.globalAlpha = r.alpha * 0.05;
             ctx.fill();
        }
        
        ctx.globalAlpha = 1.0; // Reset
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(frameRef.current);
    };
  }, [theme]); // Re-run if theme changes

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[-1]" />;
};

export default CyberBackground;