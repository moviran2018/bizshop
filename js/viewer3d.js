window.initModelViewer = function(containerId, modelUrl) {
  const container = document.getElementById(containerId);
  if (!container || typeof THREE === 'undefined') return;
  const img = container.previousElementSibling;
  if (img) img.style.display = 'none';
  container.style.display = 'block';

  const w = container.clientWidth;
  const h = container.clientHeight || 400;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(3, 2, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2;
  controls.target.set(0, 0.5, 0);

  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(5, 10, 7);
  scene.add(light);
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const loader = new THREE.GLTFLoader();
  loader.load(modelUrl, function(gltf) {
    const model = gltf.scene;
    model.scale.set(1, 1, 1);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    model.scale.set(scale, scale, scale);
    scene.add(model);
  }, undefined, function(error) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">❌ ' + (window.__ ? __('product.model3dError') : 'Model load error') + '</div>';
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  const ro = new ResizeObserver(() => {
    const w2 = container.clientWidth;
    const h2 = container.clientHeight || 400;
    camera.aspect = w2 / h2;
    camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  });
  ro.observe(container);
};
