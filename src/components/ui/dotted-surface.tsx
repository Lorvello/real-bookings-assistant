import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    geometry: THREE.BufferGeometry | null;
    points: THREE.Points | null;
    animationId: number;
    count: number;
    amountX: number;
    amountY: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const SEPARATION = 140;

    // Measure and calculate zoom compensation
    const measure = () => {
      const rect = container.getBoundingClientRect();
      const scaleX = rect.width > 0 ? window.innerWidth / rect.width : 1;
      const scaleY = rect.height > 0 ? window.innerHeight / rect.height : 1;
      return { rect, scaleX, scaleY };
    };

    // Scene setup with dark theme (slate-900 fog)
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f172a, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(60, 1, 1, 10000);
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setClearColor(scene.fog.color, 0);

    container.appendChild(renderer.domElement);

    let currentGeometry: THREE.BufferGeometry | null = null;
    let currentPoints: THREE.Points | null = null;
    let currentAmountX = 0;
    let currentAmountY = 0;

    // Build particles function
    const buildParticles = () => {
      const { rect, scaleX, scaleY } = measure();

      // Apply renderer size with zoom compensation
      const dpr = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(rect.width * scaleX, rect.height * scaleY, false);
      
      const canvas = renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      // Update camera
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();

      // Calculate grid size with compensation
      const effectiveW = rect.width * scaleX;
      const effectiveH = rect.height * scaleY;
      const margin = 12;
      const amountX = Math.ceil(effectiveW / SEPARATION) + margin;
      const amountY = Math.ceil(effectiveH / SEPARATION) + margin;

      currentAmountX = amountX;
      currentAmountY = amountY;

      // Dispose old geometry and points if they exist
      if (currentPoints) {
        scene.remove(currentPoints);
        if (currentGeometry) currentGeometry.dispose();
        if (currentPoints.material) {
          if (Array.isArray(currentPoints.material)) {
            currentPoints.material.forEach((m) => m.dispose());
          } else {
            currentPoints.material.dispose();
          }
        }
      }

      // Create particles
      const positions: number[] = [];
      const colors: number[] = [];

      for (let ix = 0; ix < amountX; ix++) {
        for (let iy = 0; iy < amountY; iy++) {
          const x = ix * SEPARATION - (amountX * SEPARATION) / 2;
          const y = 0; // Will be animated
          const z = iy * SEPARATION - (amountY * SEPARATION) / 2;

          positions.push(x, y, z);
          // Emerald-300 color: rgb(110, 231, 183)
          colors.push(110 / 255, 231 / 255, 183 / 255);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: window.innerWidth < 768 ? 4 : 8,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      currentGeometry = geometry;
      currentPoints = points;
    };

    // Initial build
    buildParticles();

    let count = 0;
    let animationId: number;

    // Animation function
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!currentGeometry || !currentPoints) return;

      const positionAttribute = currentGeometry.attributes.position;
      const positions = positionAttribute.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < currentAmountX; ix++) {
        for (let iy = 0; iy < currentAmountY; iy++) {
          const index = i * 3;

          // Animate Y position with sine waves
          positions[index + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;

          i++;
        }
      }

      positionAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.1;
    };

    // Debounce helper
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedRebuild = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        buildParticles();
      }, 150);
    };

    // ResizeObserver for container
    const resizeObserver = new ResizeObserver(debouncedRebuild);
    resizeObserver.observe(container);

    // Window resize handler
    window.addEventListener('resize', debouncedRebuild);

    // Start animation
    animate();

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      geometry: currentGeometry,
      points: currentPoints,
      animationId,
      count,
      amountX: currentAmountX,
      amountY: currentAmountY,
    };

    // Cleanup function
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedRebuild);
      resizeObserver.disconnect();

      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);

        // Clean up Three.js objects
        sceneRef.current.scene.traverse((object) => {
          if (object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });

        sceneRef.current.renderer.dispose();

        if (containerRef.current && sceneRef.current.renderer.domElement) {
          containerRef.current.removeChild(
            sceneRef.current.renderer.domElement,
          );
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{ willChange: 'transform' }}
      {...props}
    />
  );
}
