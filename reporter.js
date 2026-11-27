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

export async function showReporter(dialog) {
  reporterPromise ??= loadReporter().catch((error) => {
    reporterPromise = undefined;
    throw error;
  });
  const vrm = await reporterPromise;
  const stage = dialog.querySelector(".reporter-stage");
  if (!dialog.open || stage.querySelector("canvas")) return;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "최기자 3D 아바타");

  const scene = new THREE.Scene();
  scene.add(vrm.scene, new THREE.HemisphereLight(0xffffff, 0x8294a4, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2);
  keyLight.position.set(1, 2, 3);
  scene.add(keyLight);

  const head = vrm.humanoid.getRawBoneNode("head").getWorldPosition(new THREE.Vector3());
  const target = head.clone();
  target.y -= 0.08;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 10);

  const resize = new ResizeObserver(() => {
    camera.aspect = stage.clientWidth / stage.clientHeight;
    const distance = 1.23 / Math.min(camera.aspect, 1);
    camera.position.set(target.x, target.y, target.z + distance);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.render(scene, camera);
  });

  stage.appendChild(renderer.domElement);
  resize.observe(stage);
  dialog.querySelector("#reporter-status").hidden = true;
  dialog.addEventListener("close", () => {
    resize.disconnect();
    renderer.dispose();
    renderer.domElement.remove();
  }, { once: true });
}
