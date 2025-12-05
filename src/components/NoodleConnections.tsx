import { useEffect, useRef, useState } from "react";

interface Point { x: number; y: number; }

export const NoodleConnections = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: document.documentElement.scrollHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    const generateCurvePath = (start: Point, end: Point, curvature: number = 0.5): string => {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const offsetX = (end.y - start.y) * curvature * (Math.random() > 0.5 ? 1 : -1);
      const offsetY = (end.x - start.x) * curvature * (Math.random() > 0.5 ? 1 : -1);
      
      const cp1x = midX + offsetX * 0.5;
      const cp1y = midY + offsetY * 0.3;
      const cp2x = midX + offsetX * 0.8;
      const cp2y = midY + offsetY * 0.7;

      return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
    };

    const newPaths: string[] = [];
    const sections = [
      { y: dimensions.height * 0.1 },
      { y: dimensions.height * 0.25 },
      { y: dimensions.height * 0.4 },
      { y: dimensions.height * 0.55 },
      { y: dimensions.height * 0.7 },
      { y: dimensions.height * 0.85 },
    ];

    for (let i = 0; i < sections.length - 1; i++) {
      const startX = Math.random() * dimensions.width * 0.3 + (i % 2 === 0 ? 0 : dimensions.width * 0.7);
      const endX = Math.random() * dimensions.width * 0.3 + (i % 2 === 0 ? dimensions.width * 0.7 : 0);
      
      newPaths.push(
        generateCurvePath(
          { x: startX, y: sections[i].y },
          { x: endX, y: sections[i + 1].y },
          0.3 + Math.random() * 0.4
        )
      );
    }

    for (let i = 0; i < 3; i++) {
      const y = dimensions.height * (0.2 + i * 0.3);
      newPaths.push(
        generateCurvePath(
          { x: dimensions.width * 0.1, y: y - 50 },
          { x: dimensions.width * 0.9, y: y + 50 },
          0.15
        )
      );
    }

    setPaths(newPaths);
  }, [dimensions]);

  return (
    <svg
      ref={svgRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ height: dimensions.height }}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="noodleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
          <stop offset="50%" stopColor="#34D399" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {paths.map((path, index) => (
        <g key={index}>
          <path d={path} fill="none" stroke="#10B981" strokeWidth="8" opacity="0.1" filter="url(#glow)" />
          <path d={path} fill="none" stroke="url(#noodleGradient)" strokeWidth="2" strokeLinecap="round"
            className={`noodle-path ${index % 3 === 1 ? 'noodle-path-delayed' : index % 3 === 2 ? 'noodle-path-delayed-2' : ''}`}
            style={{ animationDelay: `${index * 0.5}s` }}
          />
          <path d={path} fill="none" stroke="#34D399" strokeWidth="1" strokeLinecap="round"
            className="noodle-path" style={{ animationDelay: `${index * 0.5 + 0.2}s` }} opacity="0.8"
          />
        </g>
      ))}
    </svg>
  );
};
