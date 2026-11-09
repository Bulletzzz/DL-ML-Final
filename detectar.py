"""
Passo 3 - Reconhece Pokemon em um video (ou na webcam).
Andrew Bertelli, Bernardo Kuster Ragugnetti, Eduardo Sochodolak e Pedro Henrique Moreira

Uso:
  python detectar.py meu_video.mp4                     -> gera saida_meu_video.mp4
  python detectar.py 0                                 -> usa a webcam (q = sair)
  python detectar.py meu_video.mp4 --janela 15 --limiar 0.7
  python detectar.py meu_video.mp4 --modelo experimentos/split_foto

O rotulo de cada frame vem da MEDIA das probabilidades dos ultimos N frames.
Se a maior media ficar abaixo do limiar, o sistema mostra "?".
No fim do video, imprime a linha do tempo dos Pokemon encontrados.
A preparacao da imagem e a mesma do treino (letterbox do utils.py).
"""
import os
import json
import argparse
from collections import deque
import cv2
import numpy as np
import tensorflow as tf
from utils import letterbox

CLASSE_VAZIA = "fundo"
INCERTO = "?"

parser = argparse.ArgumentParser()
parser.add_argument("fonte", nargs="?", default="0")
parser.add_argument("--modelo", default=".")
parser.add_argument("--janela", type=int, default=8)
parser.add_argument("--limiar", type=float, default=0.6)
parser.add_argument("--minimo", type=float, default=0.5)
parser.add_argument("--saida")
args = parser.parse_args()

model = tf.keras.models.load_model(os.path.join(args.modelo, "modelo.keras"))
class_names = json.load(open(os.path.join(args.modelo, "class_names.json")))

webcam = args.fonte.isdigit()
cap = cv2.VideoCapture(int(args.fonte) if webcam else args.fonte)
if not cap.isOpened():
    raise SystemExit(f"Nao consegui abrir: {args.fonte}")
fps = cap.get(cv2.CAP_PROP_FPS) or 30

writer = None
if not webcam:
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    nome = os.path.splitext(os.path.basename(args.fonte))[0]
    saida = args.saida or os.path.join(args.modelo, f"saida_{nome}.mp4")
    writer = cv2.VideoWriter(saida, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))


# Linha do tempo: agrupa frames iguais, ignora trechos curtos e remove "?" e fundo.
def linha_do_tempo(rotulos, fps, minimo):
    trechos = []
    for i, rotulo in enumerate(rotulos):
        if trechos and trechos[-1][0] == rotulo:
            trechos[-1][2] = i
        else:
            trechos.append([rotulo, i, i])
    longos = [t for t in trechos if (t[2] - t[1] + 1) / fps >= minimo]
    unidos = []
    for rotulo, inicio, fim in longos:
        if unidos and unidos[-1][0] == rotulo:
            unidos[-1][2] = fim
        else:
            unidos.append([rotulo, inicio, fim])
    return [(inicio / fps, (fim + 1) / fps, rotulo) for rotulo, inicio, fim in unidos
            if rotulo not in (INCERTO, CLASSE_VAZIA)]


# Suavizacao: a deque guarda so as probabilidades dos ultimos N frames.
ultimas = deque(maxlen=args.janela)
rotulos = []
n = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    if webcam:
        frame = cv2.flip(frame, 1)

    img = cv2.cvtColor(letterbox(frame), cv2.COLOR_BGR2RGB).astype("float32")
    ultimas.append(model(img[None], training=False).numpy()[0])

    # Media das ultimas N probabilidades; abaixo do limiar mostra "?".
    media = np.mean(ultimas, axis=0)
    i = int(np.argmax(media))
    rotulo = class_names[i] if media[i] >= args.limiar else INCERTO
    rotulos.append(rotulo)

    if rotulo == INCERTO:
        texto, cor = "?", (0, 0, 255)
    elif rotulo == CLASSE_VAZIA:
        texto, cor = "nenhum Pokemon", (0, 200, 255)
    else:
        texto, cor = rotulo, (0, 200, 0)
    cv2.rectangle(frame, (0, 0), (frame.shape[1], 40), (0, 0, 0), -1)
    cv2.putText(frame, f"{texto} ({media[i]:.0%})", (10, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, cor, 2)
    for j, c in enumerate(class_names):
        y = 55 + j * 22
        cv2.rectangle(frame, (10, y), (10 + int(media[j] * 150), y + 14), (0, 200, 255), -1)
        cv2.putText(frame, c, (170, y + 13), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.putText(frame, f"t = {n / fps:5.1f}s | janela {args.janela} | limiar {args.limiar:.0%}",
                (10, frame.shape[0] - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    if writer is not None:
        writer.write(frame)
    if webcam or os.environ.get("MOSTRAR", "1") == "1":
        cv2.imshow("Reconhecimento de Pokemon", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    n += 1

cap.release()
if writer is not None:
    writer.release()
    print(f"Video anotado salvo em: {saida}")
cv2.destroyAllWindows()

trechos = linha_do_tempo(rotulos, fps, args.minimo)
print(f"\nLinha do tempo (Pokemon identificados) | janela {args.janela}, limiar {args.limiar:.0%}:")
for inicio, fim, pokemon in trechos:
    print(f"  {inicio:6.1f}s a {fim:6.1f}s  ->  {pokemon}")
print("Pokemon encontrados no video:", sorted({p for _, _, p in trechos}))
