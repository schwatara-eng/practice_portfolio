import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "https://esm.sh/@pixiv/three-vrm@3.4.4?external=three";

let reporterPromise;

async function loadReporter() {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const modelURL = new URL("./models/choi_reporter.vrm", import.meta.url);
  const { userData } = await loader.loadAsync(modelURL.href);
  const vrm = userData.vrm;
  VRMUtils.rotateVRM0(vrm);

  const leftArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
  const rightArm = vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
  leftArm.rotation.z = -1.2;
  rightArm.rotation.z = 1.2;
  vrm.update(0);

  return vrm;
}

export async function startReporter(describeNearbyWork) {
  reporterPromise ??= loadReporter().catch((error) => {
    reporterPromise = undefined;
    throw error;
  });
  const vrm = await reporterPromise;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  const width = 130;
  const height = 190;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  const canvas = renderer.domElement;
  canvas.className = "reporter-walker";
  canvas.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const character = new THREE.Group();
  character.add(vrm.scene);
  scene.add(character, new THREE.HemisphereLight(0xffffff, 0x8294a4, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2);
  keyLight.position.set(1, 2, 3);
  scene.add(keyLight);

  const bounds = new THREE.Box3().setFromObject(vrm.scene);
  const modelHeight = bounds.max.y - bounds.min.y;
  const frameHeight = modelHeight * 1.16;
  const frameWidth = frameHeight * width / height;
  const camera = new THREE.OrthographicCamera(
    -frameWidth / 2, frameWidth / 2, frameHeight / 2, -frameHeight / 2, 0.01, 10
  );
  camera.position.set(0, bounds.min.y + frameHeight * 0.48, 4);
  camera.lookAt(0, camera.position.y, 0);

  const bone = (name) => vrm.humanoid.getNormalizedBoneNode(name);
  const leftLeg = bone("leftUpperLeg");
  const rightLeg = bone("rightUpperLeg");
  const leftKnee = bone("leftLowerLeg");
  const rightKnee = bone("rightLowerLeg");
  const rightForearm = bone("rightLowerArm");
  const leftArm = bone("leftUpperArm");
  const rightArm = bone("rightUpperArm");

  const position = new THREE.Vector2(100, window.innerHeight - 18);
  const destination = position.clone();
  const movement = new THREE.Vector2();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let previousTime = 0;
  let phase = 0;
  let facing = 0;
  let waveStart;
  let arrivalMessage;
  const bubble = document.createElement("p");
  bubble.className = "reporter-bubble";
  bubble.setAttribute("role", "status");
  bubble.hidden = true;

  function clampToScreen(point) {
    point.x = THREE.MathUtils.clamp(point.x, width / 2, window.innerWidth - width / 2);
    point.y = THREE.MathUtils.clamp(point.y, height, window.innerHeight);
  }

  function chooseDestination(event) {
    if (event.defaultPrevented || event.button !== 0 || event.detail === 0) return;
    if (event.target.closest("a, button, input, select, textarea, label, dialog, .card, [role='button']")) return;
    if (document.querySelector("dialog[open]")) return;

    arrivalMessage = describeNearbyWork(event.clientX, event.clientY);
    bubble.hidden = true;
    destination.set(event.clientX, event.clientY);
    clampToScreen(destination);
    if (reduceMotion.matches) position.copy(destination);
  }

  function render(time) {
    waveStart ??= time;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    clampToScreen(position);
    clampToScreen(destination);
    movement.subVectors(destination, position);
    const distance = movement.length();
    const step = Math.min(distance, delta * 145);

    if (distance > 0.5) {
      facing = movement.x < 0 ? -1 : 1;
      position.addScaledVector(movement, step / distance);
      phase += step * 0.065;
    } else {
      position.copy(destination);
      phase = 0;
    }

    const waveTime = (time - waveStart) / 1000;
    const wave = reduceMotion.matches ? 0 : THREE.MathUtils.clamp(
      Math.min(waveTime * 5, (1.65 - waveTime) * 5), 0, 1
    );
    rightArm.rotation.z = THREE.MathUtils.lerp(1.2, -0.85, wave);
    rightForearm.rotation.z = wave * (-0.9 + 0.38 * Math.sin(waveTime * 16));

    if (arrivalMessage && position.distanceTo(destination) <= 0.5) {
      bubble.hidden = false;
      bubble.textContent = arrivalMessage;
      arrivalMessage = undefined;
    }

    const swing = Math.sin(phase);
    leftLeg.rotation.x = swing * 0.48;
    rightLeg.rotation.x = -swing * 0.48;
    leftKnee.rotation.x = Math.max(0, -swing) * 0.32;
    rightKnee.rotation.x = Math.max(0, swing) * 0.32;
    leftArm.rotation.x = -swing * 0.27;
    rightArm.rotation.x = swing * 0.27;
    character.rotation.y = THREE.MathUtils.lerp(
      character.rotation.y, distance > 0.5 ? facing * 0.9 : 0, Math.min(delta * 10, 1)
    );
    character.position.y = Math.abs(swing) * modelHeight * 0.012;
    vrm.update(delta);

    canvas.style.transform = `translate(${position.x - width / 2}px, ${position.y - height}px)`;
    if (!bubble.hidden) {
      const top = position.y - height;
      const x = THREE.MathUtils.clamp(
        position.x - bubble.offsetWidth / 2, 8, window.innerWidth - bubble.offsetWidth - 8
      );
      const y = Math.max(8, top - bubble.offsetHeight - 4);
      bubble.style.transform = `translate(${x}px, ${y}px)`;
    }
    renderer.render(scene, camera);
  }

  document.body.append(canvas, bubble);
  document.addEventListener("click", chooseDestination);
  renderer.setAnimationLoop(render);

  return () => {
    document.removeEventListener("click", chooseDestination);
    renderer.setAnimationLoop(null);
    renderer.dispose();
    canvas.remove();
    bubble.remove();
  };
}
