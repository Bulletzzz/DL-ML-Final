import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const LARGURA = 640;
const ALTURA = 480;
const CHAO = -1.8;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(LARGURA, ALTURA);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const draco = new DRACOLoader().setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/");
const carregador = new GLTFLoader().setDRACOLoader(draco);
const camera = new THREE.PerspectiveCamera(50, LARGURA / ALTURA, 0.05, 50);

let cena, misturadores, ajuste, sorteio;

function gerador(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (a, b) => a + sorteio() * (b - a);
const inteiro = (a, b) => Math.floor(entre(a, b));
const hex = (cor) => `#${cor.getHexString()}`;

function corBase(claro) {
  return new THREE.Color().setHSL(sorteio(), entre(0.05, 0.5), claro ? entre(0.62, 0.88) : entre(0.05, 0.2));
}

function variar(cor, quanto) {
  return cor.clone().offsetHSL(0, 0, entre(-quanto, quanto));
}

function desenharTreino(g, base) {
  const estilo = inteiro(0, 3);
  if (estilo === 0) {
    for (let y = 0; y < 512; y += inteiro(6, 20)) {
      g.fillStyle = hex(variar(base, 0.06));
      g.fillRect(0, y, 512, inteiro(3, 14));
    }
  } else if (estilo === 1) {
    for (let i = 0; i < inteiro(3, 8); i++) {
      g.fillStyle = hex(new THREE.Color().setHSL(sorteio(), entre(0.2, 0.7), entre(0.2, 0.8)));
      g.fillRect(entre(0, 450), entre(0, 450), entre(30, 160), entre(30, 160));
    }
  } else {
    for (let i = 0; i < inteiro(10, 30); i++) {
      g.fillStyle = hex(variar(base, 0.1));
      g.beginPath();
      g.arc(entre(0, 512), entre(0, 512), entre(10, 80), 0, Math.PI * 2);
      g.fill();
    }
  }
}

function desenharXadrez(g, base) {
  const outra = base.clone().offsetHSL(0.5, 0, -0.35);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      g.fillStyle = hex((i + j) % 2 ? base : outra);
      g.fillRect(i * 64, j * 64, 64, 64);
    }
  }
}

function desenharTijolo(g, base) {
  g.fillStyle = hex(base.clone().offsetHSL(0, 0, -0.25));
  g.fillRect(0, 0, 512, 512);
  for (let linha = 0; linha < 16; linha++) {
    const deslocamento = linha % 2 ? 32 : 0;
    for (let x = -64; x < 512; x += 64) {
      g.fillStyle = hex(variar(base, 0.05));
      g.fillRect(x + deslocamento + 2, linha * 32 + 2, 60, 28);
    }
  }
}

function textura(estilo, claro, repeticao) {
  const tela = document.createElement("canvas");
  tela.width = tela.height = 512;
  const g = tela.getContext("2d");
  const base = corBase(claro);
  g.fillStyle = hex(base);
  g.fillRect(0, 0, 512, 512);
  if (estilo === "xadrez") desenharXadrez(g, base);
  else if (estilo === "tijolo") desenharTijolo(g, base);
  else desenharTreino(g, base);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${sorteio() < 0.5 ? "0,0,0" : "255,255,255"},0.08)`;
    g.fillRect(entre(0, 512), entre(0, 512), 2, 2);
  }
  const mapa = new THREE.CanvasTexture(tela);
  mapa.colorSpace = THREE.SRGBColorSpace;
  mapa.wrapS = mapa.wrapT = THREE.RepeatWrapping;
  mapa.repeat.set(repeticao, repeticao / 2);
  return new THREE.MeshStandardMaterial({ map: mapa, side: THREE.BackSide, roughness: 0.9 });
}

function montarSala(tipo) {
  const claro = tipo !== "escuro";
  const parede = tipo === "teste" ? "tijolo" : "treino";
  const chao = tipo === "teste" ? "xadrez" : "treino";
  const teto = new THREE.MeshStandardMaterial({ color: corBase(true), side: THREE.BackSide });
  const materiais = [textura(parede, claro, 2), textura(parede, claro, 2), teto,
    textura(chao, claro, 4), textura(parede, claro, 2), textura(parede, claro, 2)];
  const sala = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), materiais);
  sala.position.y = CHAO + 3;
  cena.add(sala);

  const formas = [new THREE.BoxGeometry(1, 1, 1), new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
    new THREE.SphereGeometry(0.5, 24, 16), new THREE.ConeGeometry(0.5, 1, 24), new THREE.TorusGeometry(0.35, 0.15, 12, 32)];
  for (let i = 0; i < inteiro(6, 12); i++) {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(sorteio(), entre(0.3, 0.9), entre(0.3, 0.7)), roughness: entre(0.3, 0.9) });
    const objeto = new THREE.Mesh(formas[inteiro(0, formas.length)], material);
    const tamanho = entre(0.3, 1.2);
    const angulo = entre(0, Math.PI * 2);
    const raio = entre(2, 5);
    objeto.scale.setScalar(tamanho);
    objeto.position.set(Math.cos(angulo) * raio, CHAO + tamanho / 2, Math.sin(angulo) * raio);
    objeto.rotation.y = entre(0, Math.PI);
    cena.add(objeto);
  }

  const forca = claro ? entre(1.5, 3) : entre(1, 2);
  cena.add(new THREE.HemisphereLight(0xffffff, corBase(claro), forca * 0.7));
  const sol = new THREE.DirectionalLight(new THREE.Color().setHSL(entre(0.05, 0.15), entre(0, 0.4), 0.9), forca);
  sol.position.set(entre(-5, 5), entre(2, 6), entre(-5, 5));
  cena.add(sol);
}

async function carregarPokemon(id) {
  const gltf = await carregador.loadAsync(`modelos/${id}.glb`);
  const modelo = gltf.scene;
  modelo.traverse((parte) => { parte.frustumCulled = false; });
  const clipe = gltf.animations.find((a) => /idle|wait/i.test(a.name)) || gltf.animations[0];
  const misturador = clipe ? new THREE.AnimationMixer(modelo) : null;
  if (misturador) misturador.clipAction(clipe).play();
  const caixa = () => {
    const total = new THREE.Box3();
    for (let k = 0; k < (misturador ? 8 : 1); k++) {
      if (misturador) misturador.setTime((k / 8) * clipe.duration);
      modelo.updateMatrixWorld(true);
      total.union(new THREE.Box3().setFromObject(modelo, true));
    }
    return total;
  };
  const tamanho = caixa().getSize(new THREE.Vector3());
  modelo.scale.multiplyScalar(1 / Math.max(tamanho.x, tamanho.y, tamanho.z));
  modelo.position.sub(caixa().getCenter(new THREE.Vector3()));
  const grupo = new THREE.Group();
  grupo.add(modelo);
  return { grupo, misturador };
}

window.montar = async ({ semente, tipo, pokemons }) => {
  sorteio = gerador(semente);
  cena = new THREE.Scene();
  montarSala(tipo);
  ajuste = {
    cima: entre(35, 55), baixo: -entre(20, 35), perto: entre(1.1, 1.4), longe: entre(3.3, 4.2),
    medio: entre(1.8, 2.4) + (pokemons.length > 1 ? 0.8 : 0), tremor: entre(0.005, 0.03), fase: entre(0, 100),
  };
  camera.fov = entre(45, 60);
  camera.updateProjectionMatrix();
  misturadores = [];
  for (const [i, id] of pokemons.entries()) {
    const { grupo, misturador } = await carregarPokemon(id);
    grupo.position.x = (i - (pokemons.length - 1) / 2) * 1.2;
    cena.add(grupo);
    if (misturador) misturadores.push(misturador);
  }
  return true;
};

const suave = (a, b, x) => {
  const k = Math.min(1, Math.max(0, x));
  return a + (b - a) * k * k * (3 - 2 * k);
};

function pose(t, caminho) {
  const a = ajuste;
  if (caminho.tipo === "costas") {
    return { az: 180 + 50 * Math.sin(t * Math.PI * 3), el: 5 + 15 * Math.sin(t * Math.PI * 4), dist: a.medio };
  }
  const volta = t < 0.4 ? (t / 0.4) * 360 : 360 + ((t - 0.4) / 0.6) * 300;
  let el = 8;
  if (t >= 0.4 && t < 0.6) el = suave(8, a.cima, (t - 0.4) / 0.08);
  else if (t >= 0.6 && t < 0.8) el = suave(a.cima, a.baixo, (t - 0.6) / 0.1);
  else if (t >= 0.8) el = suave(a.baixo, 10, (t - 0.8) / 0.05);
  let dist = a.medio;
  if (t >= 0.8 && t < 0.9) dist = suave(a.medio, a.perto, (t - 0.8) / 0.05);
  else if (t >= 0.9) dist = suave(a.perto, a.longe, (t - 0.9) / 0.08);
  return { az: caminho.inicio + caminho.sentido * volta, el, dist };
}

window.quadro = (t, segundos, caminho) => {
  const p = pose(t, caminho);
  const az = THREE.MathUtils.degToRad(p.az);
  const el = THREE.MathUtils.degToRad(p.el);
  const f = ajuste.fase + segundos;
  const tremor = new THREE.Vector3(Math.sin(f * 2.1), Math.sin(f * 1.7 + 1), Math.sin(f * 2.9 + 2))
    .multiplyScalar(ajuste.tremor * p.dist);
  camera.position.set(p.dist * Math.cos(el) * Math.sin(az), p.dist * Math.sin(el), p.dist * Math.cos(el) * Math.cos(az)).add(tremor);
  camera.lookAt(tremor.clone().multiplyScalar(0.5));
  for (const misturador of misturadores) misturador.setTime(segundos);
  renderer.render(cena, camera);
  return {
    imagem: renderer.domElement.toDataURL("image/jpeg", 0.92),
    azimute: ((p.az % 360) + 360) % 360, elevacao: p.el, distancia: p.dist,
  };
};

window.pronto = true;
