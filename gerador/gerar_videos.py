"""
Gera os videos de treino e de teste a partir dos modelos 3D da Pokemon-3D-api.
Andrew Bertelli, Bernardo Kuster Ragugnetti, Eduardo Sochodolak e Pedro Henrique Moreira

Uso: python gerador/gerar_videos.py

Saida:
  videos/<classe>/vNN_mix_<claro|escuro>.mp4   -> treino
  videos_teste/*.mp4                           -> teste e experimentos da Parte 5
  gerador/angulos/<classe>/<video>.csv         -> angulo da camera em cada frame
"""
import os
import csv
import base64
import random
import threading
import functools
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import cv2
import numpy as np
from playwright.sync_api import sync_playwright

PASTA = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(PASTA)
URL_MODELO = "https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/{}.glb"

POKEMON = {"pikachu": 25, "psyduck": 54, "charmander": 4}
DESCONHECIDO = 1
VIDEOS_POR_CLASSE = 6
FPS = 12
DURACAO = 20
LARGURA, ALTURA = 640, 480


class ServidorSilencioso(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def baixar_modelos():
    os.makedirs(os.path.join(PASTA, "modelos"), exist_ok=True)
    for numero in [*POKEMON.values(), DESCONHECIDO]:
        destino = os.path.join(PASTA, "modelos", f"{numero}.glb")
        if not os.path.exists(destino):
            urllib.request.urlretrieve(URL_MODELO.format(numero), destino)


def abrir_servidor():
    servidor = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(ServidorSilencioso, directory=PASTA))
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return servidor.server_address[1]


def abrir_estudio(navegador, porta):
    pagina = navegador.new_page(viewport={"width": LARGURA, "height": ALTURA})
    pagina.goto(f"http://127.0.0.1:{porta}/estudio.html")
    pagina.wait_for_function("window.pronto === true")
    return pagina


def renderizar(pagina, t, segundos, caminho):
    quadro = pagina.evaluate("([t, s, c]) => window.quadro(t, s, c)", [t, segundos, caminho])
    dados = base64.b64decode(quadro["imagem"].split(",", 1)[1])
    imagem = cv2.imdecode(np.frombuffer(dados, np.uint8), cv2.IMREAD_COLOR)
    return imagem, quadro


def gravar_trecho(pagina, gravador, cena, caminho, segundos, angulos=None):
    pagina.evaluate("(c) => window.montar(c)", cena)
    total = int(segundos * FPS)
    for i in range(total):
        imagem, quadro = renderizar(pagina, i / total, i / FPS, caminho)
        gravador.write(imagem)
        if angulos is not None:
            angulos.writerow([i, f"{quadro['azimute']:.1f}", f"{quadro['elevacao']:.1f}", f"{quadro['distancia']:.2f}"])


def novo_gravador(caminho):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    return cv2.VideoWriter(caminho, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (LARGURA, ALTURA))


def caminho_completo(sorteio):
    return {"tipo": "completo", "inicio": sorteio.uniform(0, 360), "sentido": sorteio.choice([-1, 1])}


def gerar_treino(pagina):
    sorteio = random.Random(42)
    classes = {**POKEMON, "fundo": None}
    for indice, (classe, numero) in enumerate(classes.items()):
        for v in range(VIDEOS_POR_CLASSE):
            tipo = "claro" if v % 2 == 0 else "escuro"
            nome = f"v{v + 1:02d}_mix_{tipo}"
            saida = os.path.join(RAIZ, "videos", classe, f"{nome}.mp4")
            caminho = caminho_completo(sorteio)
            if os.path.exists(saida):
                continue
            pasta_angulos = os.path.join(PASTA, "angulos", classe)
            os.makedirs(pasta_angulos, exist_ok=True)
            cena = {"semente": 1000 * indice + v, "tipo": tipo, "pokemons": [numero] if numero else []}
            gravador = novo_gravador(saida)
            with open(os.path.join(pasta_angulos, f"{nome}.csv"), "w", newline="") as arquivo:
                angulos = csv.writer(arquivo)
                angulos.writerow(["frame", "azimute", "elevacao", "distancia"])
                gravar_trecho(pagina, gravador, cena, caminho, DURACAO, angulos)
            gravador.release()
            print(f"  {classe}/{nome}.mp4")


def gerar_video(pagina, nome, trechos):
    saida = os.path.join(RAIZ, "videos_teste", nome)
    if os.path.exists(saida):
        return
    sorteio = random.Random(nome)
    gravador = novo_gravador(saida)
    for pokemons, segundos, tipo_caminho in trechos:
        caminho = caminho_completo(sorteio) | {"tipo": tipo_caminho}
        cena = {"semente": 900, "tipo": "teste", "pokemons": pokemons}
        gravar_trecho(pagina, gravador, cena, caminho, segundos)
    gravador.release()
    print(f"  videos_teste/{nome}")


def gerar_testes(pagina):
    pikachu, psyduck, charmander = POKEMON["pikachu"], POKEMON["psyduck"], POKEMON["charmander"]
    gerar_video(pagina, "video_teste.mp4", [
        ([], 2, "completo"), ([pikachu], 12, "completo"), ([], 2, "completo"),
        ([psyduck], 12, "completo"), ([], 2, "completo"), ([charmander], 12, "completo"), ([], 2, "completo"),
    ])
    gerar_video(pagina, "costas_pikachu.mp4", [([pikachu], 10, "costas")])
    gerar_video(pagina, "desconhecido_bulbasaur.mp4", [([DESCONHECIDO], 12, "completo")])
    gerar_video(pagina, "dois_pokemon.mp4", [([pikachu, charmander], 12, "completo")])


if __name__ == "__main__":
    baixar_modelos()
    porta = abrir_servidor()
    with sync_playwright() as p:
        navegador = p.chromium.launch(channel="msedge")
        pagina = abrir_estudio(navegador, porta)
        print("Gerando videos de treino:")
        gerar_treino(pagina)
        print("Gerando videos de teste:")
        gerar_testes(pagina)
        navegador.close()
    print("Pronto! Agora rode: python extrair_frames.py")
