import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const paperCount = 50;
      const papers = [];
      const paperGeometry = new THREE.PlaneGeometry(0.5, 0.7);
      const paperMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.08,
      });

      for (let i = 0; i < paperCount; i++) {
        const paper = new THREE.Mesh(paperGeometry, paperMaterial);
        paper.position.x = (Math.random() - 0.5) * 20;
        paper.position.y = (Math.random() - 0.5) * 20;
        paper.position.z = (Math.random() - 0.5) * 10;
        paper.rotation.x = Math.random() * Math.PI;
        paper.rotation.y = Math.random() * Math.PI;
        paper.rotation.z = Math.random() * Math.PI;
        paper.userData.speed = {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01,
          float: 0.01 + Math.random() * 0.02,
        };
        papers.push(paper);
        scene.add(paper);
      }

      camera.position.z = 5;

      const mouse = { x: 0, y: 0 };
      const handleMouseMove = (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      };
      document.addEventListener('mousemove', handleMouseMove);

      let animationId;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        papers.forEach((paper) => {
          paper.position.y += paper.userData.speed.float;
          paper.rotation.x += paper.userData.speed.x;
          paper.rotation.y += paper.userData.speed.y;
          paper.rotation.z += paper.userData.speed.z;
          if (paper.position.y > 10) {
            paper.position.y = -10;
            paper.position.x = (Math.random() - 0.5) * 20;
          }
        });
        camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (-mouse.y * 0.5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      };
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animationId);
        document.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        paperGeometry.dispose();
        paperMaterial.dispose();
      };
    } catch (e) {
      console.error('Three.js animation failed:', e);
    }
  }, []);

  return <canvas ref={canvasRef} id="bg-canvas" />;
}
