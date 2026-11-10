import * as THREE from "three";
import { semear, entre, montarSala, colocarPokemons } from "./cena.js";

const LARGURA = 640;
const ALTURA = 480;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(LARGURA, ALTURA);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(50, LARGURA / ALTURA, 0.05, 50);

let cena, misturadores, ajuste;

window.montar = async ({ semente, tipo, pokemons }) => {
  semear(semente);
  cena = new THREE.Scene();
  montarSala(cena, tipo);
  ajuste = {
    cima: entre(35, 55), baixo: -entre(20, 35), perto: entre(1.1, 1.4), longe: entre(3.3, 4.2),
    medio: entre(1.8, 2.4) + (pokemons.length > 1 ? 0.8 : 0), tremor: entre(0.005, 0.03), fase: entre(0, 100),
  };
  camera.fov = entre(45, 60);
  camera.updateProjectionMatrix();
  misturadores = await colocarPokemons(cena, pokemons);
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
