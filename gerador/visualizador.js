import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { semear, montarSala, colocarPokemons } from "./cena.js";

const NOMES = { 25: "pikachu", 54: "psyduck", 4: "charmander", 1: "bulbasaur" };
const POSES = {
  frente: { az: 0, el: 8 }, costas: { az: 180, el: 8 }, lado90: { az: 90, el: 8 }, lado270: { az: 270, el: 8 },
  cima: { el: 50 }, baixo: { el: -25 }, perto: { dist: 1.2 }, longe: { dist: 3.8 },
};
const DURACAO_TRANSICAO = 900;

const $ = (id) => document.getElementById(id);
const palco = $("palco");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
palco.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(50, 4 / 3, 0.05, 50);
const controles = new OrbitControls(camera, renderer.domElement);
controles.enableDamping = true;
controles.enablePan = false;
controles.minDistance = 0.6;
controles.maxDistance = 5.5;
controles.maxPolarAngle = THREE.MathUtils.degToRad(125);

const relogio = new THREE.Clock();
let cena = new THREE.Scene();
let misturadores = [];
let transicao = null;
let gravacao = null;

function ajustarTamanho() {
  if (gravacao) return;
  const escala = Math.min(palco.clientWidth / 4, palco.clientHeight / 3);
  renderer.setSize(Math.floor(escala * 4), Math.floor(escala * 3));
}

function lerAngulo() {
  const p = camera.position;
  const dist = p.length();
  const az = (THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z)) + 360) % 360;
  return { az, el: THREE.MathUtils.radToDeg(Math.asin(p.y / dist)), dist };
}

function posicionar({ az, el, dist }) {
  const a = THREE.MathUtils.degToRad(az);
  const e = THREE.MathUtils.degToRad(el);
  camera.position.set(dist * Math.cos(e) * Math.sin(a), dist * Math.sin(e), dist * Math.cos(e) * Math.cos(a));
  camera.lookAt(controles.target);
}

function irPara(parcial) {
  const inicio = lerAngulo();
  const fim = { ...inicio, ...parcial };
  fim.az = inicio.az + ((fim.az - inicio.az + 540) % 360) - 180;
  transicao = { inicio, fim, comeco: performance.now() };
}

function andarTransicao() {
  const k = Math.min(1, (performance.now() - transicao.comeco) / DURACAO_TRANSICAO);
  const s = k * k * (3 - 2 * k);
  const { inicio, fim } = transicao;
  posicionar({
    az: inicio.az + (fim.az - inicio.az) * s,
    el: inicio.el + (fim.el - inicio.el) * s,
    dist: inicio.dist + (fim.dist - inicio.dist) * s,
  });
  if (k === 1) transicao = null;
}

function mostrarAngulo() {
  const { az, el, dist } = lerAngulo();
  if (document.activeElement?.type !== "range") {
    $("az").value = az;
    $("el").value = el;
    $("dist").value = dist;
  }
  $("valores").textContent = `az ${az.toFixed(0)}°  el ${el.toFixed(0)}°  dist ${dist.toFixed(2)}`;
}

function idsEscolhidos() {
  const valor = $("pokemon").value;
  return valor ? valor.split(",").map(Number) : [];
}

async function montar() {
  const ids = idsEscolhidos();
  semear(Number($("semente").value));
  const nova = new THREE.Scene();
  montarSala(nova, $("sala").value);
  const novosMisturadores = await colocarPokemons(nova, ids);
  cena = nova;
  misturadores = novosMisturadores;
}

function formatoGravacao() {
  return ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((tipo) => MediaRecorder.isTypeSupported(tipo));
}

function bloquearCena(bloquear) {
  for (const id of ["pokemon", "sala", "semente", "sortear"]) $(id).disabled = bloquear;
}

function avisar(texto) {
  $("estado").textContent = texto;
}

function iniciarGravacao() {
  const tipo = formatoGravacao();
  const pedacos = [];
  const gravador = new MediaRecorder(renderer.domElement.captureStream(30), { mimeType: tipo, videoBitsPerSecond: 8e6 });
  gravacao = { gravador, comeco: performance.now() };
  gravador.ondataavailable = (evento) => evento.data.size && pedacos.push(evento.data);
  gravador.onstop = () => salvar(new Blob(pedacos, { type: tipo }), tipo, performance.now() - gravacao.comeco);
  gravador.start(500);
  bloquearCena(true);
  $("gravar").classList.add("ativo");
  $("gravar").textContent = "■ Parar";
  $("rec").style.display = "block";
  avisar("Gravando...");
}

async function salvar(video, tipo, duracao) {
  gravacao = null;
  bloquearCena(false);
  $("gravar").classList.remove("ativo");
  $("gravar").textContent = "● Gravar";
  $("rec").style.display = "none";
  ajustarTamanho();
  avisar("Convertendo para mp4...");
  const nome = `${idsEscolhidos().map((id) => NOMES[id]).join("_") || "fundo"}_${$("sala").value}`;
  const formato = tipo.startsWith("video/mp4") ? "mp4" : "webm";
  try {
    const resposta = await fetch(`/salvar?nome=${nome}&formato=${formato}&duracao=${duracao / 1000}`, { method: "POST", body: video });
    const dados = await resposta.json();
    avisar(`Salvo em ${dados.arquivo} (${dados.quadros} quadros, ${dados.fps} fps)`);
  } catch {
    avisar("Falhou ao salvar. O visualizar.py ainda está rodando?");
  }
}

function atualizarRec() {
  const segundos = Math.floor((performance.now() - gravacao.comeco) / 1000);
  $("rec").textContent = `REC ${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
}

function animar() {
  const delta = relogio.getDelta();
  controles.autoRotate = $("girar").checked;
  controles.autoRotateSpeed = Number($("velocidade").value);
  if (transicao) andarTransicao();
  else controles.update(delta);
  if ($("animar").checked) for (const misturador of misturadores) misturador.update(delta);
  if (gravacao) atualizarRec();
  mostrarAngulo();
  renderer.render(cena, camera);
  requestAnimationFrame(animar);
}

for (const botao of document.querySelectorAll("[data-pose]")) {
  botao.addEventListener("click", () => irPara(POSES[botao.dataset.pose]));
}
for (const id of ["az", "el", "dist"]) {
  $(id).addEventListener("input", () => {
    transicao = null;
    posicionar({ az: Number($("az").value), el: Number($("el").value), dist: Number($("dist").value) });
  });
}
for (const id of ["pokemon", "sala", "semente"]) $(id).addEventListener("change", montar);
$("sortear").addEventListener("click", () => {
  $("semente").value = Math.floor(Math.random() * 10000);
  montar();
});
$("gravar").addEventListener("click", () => (gravacao ? gravacao.gravador.stop() : iniciarGravacao()));
window.addEventListener("resize", ajustarTamanho);

ajustarTamanho();
posicionar({ az: 0, el: 8, dist: 2.2 });
await montar();
animar();
