import { useEffect, useRef } from "react";
import * as THREE from "three";
import song from "./mp3/limpin.mp3";
import styles from "./style.module.css";

const SoundVisualization = () => {
  const ref = useRef();

  useEffect(() => {
    // Basic THREE.js scene and render setup
    const diemnsion = Math.min(window.innerHeight, window.innerWidth) * 0.95;

    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(
      -diemnsion / 2,
      diemnsion / 2,
      diemnsion / 2,
      -diemnsion / 2,
      0.1,
      1500
    );
    camera.updateProjectionMatrix();

    camera.position.set(0, 1500, -300);
    camera.lookAt(scene.position);
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(diemnsion, diemnsion);

    // THREE.js audio and sound setup
    let listener, sound, audioLoader, analyser;
    const loadMusic = () => {
      listener = new THREE.AudioListener();
      camera.add(listener);
      sound = new THREE.Audio(listener);
      audioLoader = new THREE.AudioLoader();
      audioLoader.load(song, function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(1);
      });
      sound.autoplay = true;
      analyser = new THREE.AudioAnalyser(sound, 512);
    };

    // Line setup
    const circles = new THREE.Group();
    scene.add(circles);

    const addNewCircle = fftValues => {
      const planeGeometry = new THREE.PlaneGeometry(200 - 1, 1, 200 - 1, 1);

      const plane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          wireframe: false,
          transparent: false,
        })
      );
      circles.add(plane);

      const lineGeometry = new THREE.BufferGeometry();
      let lineVertices = [];
      for (let i = 0; i < 200; i++) {
        lineVertices.push(planeGeometry.attributes.position.array[3 * i]); // share the upper points of the plane
        lineVertices.push(planeGeometry.attributes.position.array[3 * i + 1]);
        lineVertices.push(planeGeometry.attributes.position.array[3 * i + 2]);
      }
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(lineVertices), 3)
      );

      const lineMat = new THREE.LineBasicMaterial({
        color: 0xe1e1e1,
        transparent: true,
        opacity: 0.5,
      });
      const line = new THREE.Line(lineGeometry, lineMat);

      plane.add(line);

      for (let i = 0; i < 200; i++) {
        let y = 0;
        if (i >= 39 && i < 100) {
          y += fftValues[102 - i];
        } else if (i >= 100 && i < 161) {
          y += fftValues[i - 97];
        }
        y = Math.pow(y, 1.2);

        plane.geometry.attributes.position.array[i * 3 + 1] = y;
        line.geometry.attributes.position.array[i * 3 + 1] = y;
      }
    };

    const enlargeCircles = () => {
      let planesThatHaveGoneFarEnough = [];
      circles.children.forEach(plane => {
        for (let i = 0; i < 400; i++) {
          plane.geometry.attributes.position.array[i * 3 + 2] -= 1;
          if (i < 200) {
            plane.children[0].geometry.attributes.position.array[
              i * 3 + 2
            ] -= 1;
          }
        }

        if (plane.geometry.attributes.position.array[2] <= -1000) {
          planesThatHaveGoneFarEnough.push(plane);
        } else {
          plane.geometry.attributes.position.needsUpdate = true;
          plane.children[0].geometry.attributes.position.needsUpdate = true;
        }
      });
      planesThatHaveGoneFarEnough.forEach(plane => circles.remove(plane));
    };
    let frameId;
    let isRunning = false;
    const animate = () => {
      if (!isRunning) return;
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
      const data = analyser.getFrequencyData();
      enlargeCircles();
      addNewCircle(data);
    };

    ref.current.appendChild(renderer.domElement);
    const el = ref.current.children[0];
    el.addEventListener("click", () => {
      const start = () => {
        isRunning = true;
        animate();
      };
      if (!sound) {
        loadMusic();
        start();
      } else if (sound.isPlaying) {
        sound.pause();
        isRunning = false;
      } else {
        sound.play();
        start();
      }
    });
    return () => {
      cancelAnimationFrame(frameId);
      if (sound && sound.isPlaying) sound.stop();
      el.removeEventListener("click", () =>
        sound.isPlaying ? sound.pause() : sound.play()
      );
      el.remove();
    };
  }, []);

  return <div ref={ref} className={styles.container}></div>;
};

export default SoundVisualization;
