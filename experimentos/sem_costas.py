"""
Pergunta 3 - copia data/ para experimentos/sem_costas/data sem os frames de costas de um Pokemon.
Andrew Bertelli, Bernardo Kuster Ragugnetti, Eduardo Sochodolak e Pedro Henrique Moreira

Uso: python experimentos/sem_costas.py pikachu

Usa o angulo da camera salvo pelo gerador (gerador/angulos) para saber
em quais frames o Pokemon estava de costas (azimute entre 120 e 240 graus).
"""
import os
import sys
import csv
import shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COSTAS = (120, 240)

pokemon = sys.argv[1] if len(sys.argv) > 1 else "pikachu"
origem = os.path.join(RAIZ, "data")
destino = os.path.join(RAIZ, "experimentos", "sem_costas", "data")
shutil.rmtree(destino, ignore_errors=True)
shutil.copytree(origem, destino)


def azimutes(video):
    with open(os.path.join(RAIZ, "gerador", "angulos", pokemon, f"{video}.csv")) as arquivo:
        return {int(linha["frame"]): float(linha["azimute"]) for linha in csv.DictReader(arquivo)}


pasta = os.path.join(destino, pokemon)
por_video = {}
removidos = 0
for foto in sorted(os.listdir(pasta)):
    video, frame = os.path.splitext(foto)[0].split("__")
    angulo = por_video.setdefault(video, azimutes(video))[int(frame)]
    if COSTAS[0] <= angulo <= COSTAS[1]:
        os.remove(os.path.join(pasta, foto))
        removidos += 1

print(f"{pokemon}: {removidos} frames de costas removidos, sobraram {len(os.listdir(pasta))}")
print("Agora rode: python train.py --dados experimentos/sem_costas/data --saida experimentos/sem_costas")
