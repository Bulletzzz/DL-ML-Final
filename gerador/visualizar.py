"""
Abre o visualizador 3D para ver cada Pokemon e gravar videos com a camera escolhida.
Andrew Bertelli, Bernardo Kuster Ragugnetti, Eduardo Sochodolak e Pedro Henrique Moreira

Uso: python gerador/visualizar.py
Saida: videos_gravados/<pokemon>_<sala>_<hora>.mp4
"""
import os
import json
import time
import tempfile
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import cv2
from gerar_videos import PASTA, RAIZ, baixar_modelos

PORTA = 8000
SAIDA = os.path.join(RAIZ, "videos_gravados")


def contar_quadros(arquivo):
    leitor = cv2.VideoCapture(arquivo)
    total = 0
    while leitor.grab():
        total += 1
    leitor.release()
    return total


def converter(bruto, formato, destino, duracao):
    with tempfile.NamedTemporaryFile(suffix=f".{formato}", delete=False) as temporario:
        temporario.write(bruto)
    total = contar_quadros(temporario.name)
    fps = round(total / duracao, 2) if total else 0
    leitor = cv2.VideoCapture(temporario.name)
    gravador = None
    while True:
        ok, quadro = leitor.read()
        if not ok:
            break
        if gravador is None:
            altura, largura = quadro.shape[:2]
            gravador = cv2.VideoWriter(destino, cv2.VideoWriter_fourcc(*"mp4v"), fps, (largura, altura))
        gravador.write(quadro)
    leitor.release()
    if gravador:
        gravador.release()
    os.remove(temporario.name)
    return total, fps


class Visualizador(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PASTA, **kwargs)

    def log_message(self, *args):
        pass

    def responder(self, codigo, dados):
        corpo = json.dumps(dados).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_POST(self):
        pedido = urlparse(self.path)
        if pedido.path != "/salvar":
            return self.responder(404, {"erro": "rota inexistente"})
        campos = parse_qs(pedido.query)
        nome = "".join(c for c in campos["nome"][0] if c.isalnum() or c in "_-")
        formato = "mp4" if campos["formato"][0] == "mp4" else "webm"
        bruto = self.rfile.read(int(self.headers["Content-Length"]))
        os.makedirs(SAIDA, exist_ok=True)
        destino = os.path.join(SAIDA, f"{nome}_{time.strftime('%H%M%S')}.mp4")
        quadros, fps = converter(bruto, formato, destino, float(campos["duracao"][0]))
        print(f"  {os.path.relpath(destino, RAIZ)} ({quadros} quadros, {fps} fps)")
        self.responder(200, {"arquivo": os.path.relpath(destino, RAIZ), "quadros": quadros, "fps": fps})


if __name__ == "__main__":
    baixar_modelos()
    servidor = ThreadingHTTPServer(("127.0.0.1", PORTA), Visualizador)
    endereco = f"http://127.0.0.1:{PORTA}/visualizador.html"
    print(f"Visualizador em {endereco} (Ctrl+C para sair)")
    webbrowser.open(endereco)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
