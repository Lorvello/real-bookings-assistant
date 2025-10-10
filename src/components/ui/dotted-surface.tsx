import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createPortal } from 'react-dom';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    points: THREE.Points | null;
    geometry: THREE.BufferGeometry | null;
    material: THREE.PointsMaterial | null;
    animationId: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Use window viewport as source of truth
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    console.log('DottedSurface init:', { viewportWidth, viewportHeight });

    const SEPARATION = 160;
    const cols = Math.ceil(viewportWidth / SEPARATION) + 12; // Extra margin
    const rows = Math.ceil(viewportHeight / SEPARATION) + 12;

    console.log('Initial grid:', { cols, rows, totalParticles: cols * rows });

    // Scene setup with dark theme (slate-900 fog)
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f172a, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(
      80,
      viewportWidth / viewportHeight,
      1,
      10000,
    );
    camera.position.set(0, 355, 1000);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(viewportWidth, viewportHeight);
    renderer.setClearColor(scene.fog.color, 0);

    containerRef.current.appendChild(renderer.domElement);

    // Helper function to build particles
    const buildParticles = (amountX: number, amountY: number) => {
      const positions: number[] = [];
      const colors: number[] = [];
      const geometry = new THREE.BufferGeometry();

      for (let ix = 0; ix < amountX; ix++) {
        for (let iy = 0; iy < amountY; iy++) {
          const x = ix * SEPARATION - (amountX * SEPARATION) / 2;
          const y = 0; // Will be animated
          const z = iy * SEPARATION - (amountY * SEPARATION) / 2;

          positions.push(x, y, z);
          // Emerald-300 color for subtle effect: rgb(110, 231, 183)
          colors.push(110 / 255, 231 / 255, 183 / 255);
        }
      }

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
      return { geometry, material, points };
    };

    // Initial particle creation
    const { geometry, material, points } = buildParticles(cols, rows);
    scene.add(points);

    let count = 0;
    let animationId: number;
    let currentCols = cols;
    let currentRows = rows;

    // Animation function
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!sceneRef.current?.geometry) return;

      const positionAttribute = sceneRef.current.geometry.attributes.position;
      const positions = positionAttribute.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < currentCols; ix++) {
        for (let iy = 0; iy < currentRows; iy++) {
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

    // Function to rebuild particles on resize
    const rebuildParticles = (newWidth: number, newHeight: number) => {
      console.log('Rebuilding particles:', { newWidth, newHeight });
      
      const newCols = Math.ceil(newWidth / SEPARATION) + 12;
      const newRows = Math.ceil(newHeight / SEPARATION) + 12;
      
      console.log('New grid:', { newCols, newRows, totalParticles: newCols * newRows });

      // Remove old points from scene
      if (sceneRef.current?.points) {
        scene.remove(sceneRef.current.points);
      }

      // Dispose old geometry and material
      if (sceneRef.current?.geometry) {
        sceneRef.current.geometry.dispose();
      }
      if (sceneRef.current?.material) {
        sceneRef.current.material.dispose();
      }

      // Create new particles
      const newParticles = buildParticles(newCols, newRows);
      scene.add(newParticles.points);

      // Update refs
      if (sceneRef.current) {
        sceneRef.current.points = newParticles.points;
        sceneRef.current.geometry = newParticles.geometry;
        sceneRef.current.material = newParticles.material;
      }

      // Update animation variables
      currentCols = newCols;
      currentRows = newRows;
    };

    // Debounced resize handler
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth || document.documentElement.clientWidth;
        const newHeight = window.innerHeight || document.documentElement.clientHeight;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        
        rebuildParticles(newWidth, newHeight);
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    // Start animation
    animate();

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      points,
      geometry,
      material,
      animationId,
      count,
    };

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);

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

  return createPortal(
    <div
      ref={containerRef}
      className={cn('pointer-events-none fixed inset-0 w-screen h-screen', className)}
      style={{ willChange: 'transform' }}
      {...props}
    />,
    document.body
  );
}
