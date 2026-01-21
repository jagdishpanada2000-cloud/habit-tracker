'use client';

import { useEffect, useState } from 'react';

export const Snowfall = () => {
    const [snowflakes, setSnowflakes] = useState<{ id: number; left: string; delay: string; duration: string; size: string; opacity: number }[]>([]);

    useEffect(() => {
        const count = 50;
        const flakes = Array.from({ length: count }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 10}s`,
            duration: `${10 + Math.random() * 20}s`,
            size: `${2 + Math.random() * 4}px`,
            opacity: 0.2 + Math.random() * 0.5,
        }));
        setSnowflakes(flakes);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute top-[-10px] bg-white rounded-full animate-snowfall"
                    style={{
                        left: flake.left,
                        width: flake.size,
                        height: flake.size,
                        opacity: flake.opacity,
                        animationDuration: flake.duration,
                        animationDelay: flake.delay,
                        filter: 'blur(1px)',
                    }}
                />
            ))}
            <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(25vh) translateX(15px);
          }
          50% {
            transform: translateY(50vh) translateX(-15px);
          }
          75% {
            transform: translateY(75vh) translateX(15px);
          }
          100% {
            transform: translateY(100vh) translateX(0);
          }
        }
        .animate-snowfall {
          animation-name: snowfall;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
      `}</style>
        </div>
    );
};
