// The Unwired — hero 3D scene.
// Renders the brand's own wire mark in 3D (two bent tubes crossing into an X)
// instead of a generic particle network. Bone/Forest/Signal only, unlit, no
// glow, no gradients. Isolated from site.js/index.html's 2D mark animation so
// it can fail or be skipped without breaking anything else on the page.
(async function(){
  var container = document.getElementById('heroScene');
  if(!container) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if(window.innerWidth < 900) return;
  if(!window.WebGLRenderingContext) return;

  var THREE;
  try{
    THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
  } catch(e){
    return; // offline / blocked CDN — hero still works without the accent
  }

  var width = container.clientWidth || 500;
  var height = container.clientHeight || 500;

  var renderer;
  try{
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch(e){
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 0, 9);

  var BONE = 0xF2F1ED, FOREST = 0x0F5C4A, SIGNAL = 0x2E8B6E;

  // One wire: flat stub in, single bend, crossing, flat stub out — the same
  // shape as the 2D mark's path() formula, extruded into a 3D tube.
  function wireCurve(sign){
    var rest = sign > 0 ? 0.9 : -0.9;
    var bend = sign > 0 ? -1.3 : 1.3;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.2, rest, 0),
      new THREE.Vector3(-1.0, rest, 0),
      new THREE.Vector3(0, (rest + bend) / 2, 0.4),
      new THREE.Vector3(1.0, bend, 0),
      new THREE.Vector3(3.2, bend, 0)
    ]);
  }

  var group = new THREE.Group();

  var tubeA = new THREE.Mesh(
    new THREE.TubeGeometry(wireCurve(1), 40, 0.07, 8, false),
    new THREE.MeshBasicMaterial({ color: BONE })
  );
  var tubeB = new THREE.Mesh(
    new THREE.TubeGeometry(wireCurve(-1), 40, 0.07, 8, false),
    new THREE.MeshBasicMaterial({ color: FOREST })
  );
  group.add(tubeA, tubeB);

  // a few static hairline nodes along the strands, echoing the mark's dots
  [[-2.2, 0.9], [2.2, -0.9], [0, -0.1]].forEach(function(pt, i){
    var node = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: i === 2 ? SIGNAL : BONE })
    );
    node.position.set(pt[0], pt[1], 0.1);
    group.add(node);
  });

  group.rotation.x = 0.15;
  scene.add(group);

  var visible = true;
  var observer = new IntersectionObserver(function(entries){
    visible = entries[0].isIntersecting;
  }, { threshold: 0 });
  observer.observe(container);

  var idle = 0;
  function scrollFactor(){
    var doc = document.documentElement;
    var max = (doc.scrollHeight - window.innerHeight) || 1;
    return Math.min(1, window.scrollY / max);
  }

  function animate(){
    requestAnimationFrame(animate);
    if(!visible) return;
    idle += 0.0035;
    var s = scrollFactor();
    group.rotation.y = idle + s * Math.PI * 0.6;
    group.rotation.z = Math.sin(idle * 0.6) * 0.05;
    camera.position.z = 9 - s * 1.5;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', function(){
    if(window.innerWidth < 900){
      renderer.domElement.style.display = 'none';
      return;
    }
    renderer.domElement.style.display = '';
    width = container.clientWidth || width;
    height = container.clientHeight || height;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
})();
