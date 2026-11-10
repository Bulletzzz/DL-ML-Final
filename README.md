# Reconhecimento de Pokémon em vídeo

Andrew Bertelli, Bernardo Kuster Ragugnetti, Eduardo Sochodolak e Pedro Henrique Moreira

Machine Learning e Deep Learning, 6º período de Engenharia de Software.

Modelo com transfer learning (MobileNetV2) que identifica Pikachu, Psyduck e Charmander em vídeo, vistos de vários ângulos. Partimos do exemplo do PDF da atividade e implementamos as três melhorias pedidas na Parte 4.

Os vídeos foram gerados a partir dos modelos 3D da [Pokemon-3D-api](https://github.com/Pokemon-3D-api), com uso autorizado pela professora. Pikachu e Psyduck são os dois amarelos, como o PDF sugere.

Os comentários no código estão ali porque o PDF pede comentários explicando as partes que o grupo implementou.

## Instalação

```bash
pip install tensorflow numpy matplotlib opencv-python pillow playwright
```

O gerador usa o Microsoft Edge que já vem no Windows, então não é preciso baixar outro navegador.

## Arquivos

| Arquivo | Função |
|---|---|
| `gerador/gerar_videos.py` | Baixa os modelos 3D e grava os vídeos de treino e de teste |
| `gerador/estudio.js` | Monta a cena 3D e move a câmera pelos ângulos da tabela do PDF |
| `utils.py` | Prepara a imagem do mesmo jeito no treino e na detecção |
| `extrair_frames.py` | Transforma os vídeos em fotos |
| `train.py` | Treina o modelo e gera as curvas e o PDF do dataset |
| `detectar.py` | Reconhece os Pokémon em um vídeo ou na webcam |

## Como rodar

```bash
python gerador/gerar_videos.py
```

```bash
python extrair_frames.py
```

```bash
python train.py
```

```bash
python detectar.py videos_teste/video_teste.mp4
```

O gerador cria os vídeos em `videos/`, com uma subpasta por Pokémon e uma chamada `fundo`, e os vídeos de teste em `videos_teste/`.

O treino gera `modelo.keras`, `modelo_fase1.keras`, `class_names.json`, `curvas.png` e `dataset_imagens.pdf`, e imprime a matriz de confusão de cada fase. A detecção gera o vídeo anotado `saida_<nome>.mp4` e imprime a linha do tempo.

Para usar a webcam, rode `python detectar.py 0` e aperte `q` para sair. Para processar sem abrir janela, defina `MOSTRAR=0` antes do comando (`set MOSTRAR=0` no cmd ou `$env:MOSTRAR=0` no PowerShell).

## Melhorias implementadas

- **Suavização e limiar** (`detectar.py`): usa a média das probabilidades dos últimos N frames e mostra `?` quando a maior média fica abaixo do limiar. Ajuste com `--janela` (padrão 8) e `--limiar` (padrão 0.6).
- **Linha do tempo** (`detectar.py`): no fim do vídeo, imprime em que trechos cada Pokémon apareceu e a lista dos encontrados, ignorando trechos com menos de 0,5 s.
- **Fine-tuning** (`train.py`): depois de treinar só a cabeça, libera as últimas 30 camadas da MobileNetV2 e continua com taxa de aprendizado 1e-5. O `curvas.png` mostra as duas fases e marca onde o fine-tuning começa.

## Experimentos da Parte 5

Pergunta 1, split aleatório por foto:

```bash
python train.py --split foto --saida experimentos/split_foto
```

```bash
python detectar.py video_teste.mp4 --modelo experimentos/split_foto
```

Pergunta 2, fine-tuning com taxa 1e-3:

```bash
python train.py --lr-fine 1e-3 --saida experimentos/lr_alta
```

Pergunta 3, sem os frames de costas de um Pokémon: copie `data/` para `experimentos/sem_costas/data`, apague nela esses frames e treine.

```bash
python train.py --dados experimentos/sem_costas/data --saida experimentos/sem_costas
```

```bash
python detectar.py video_costas.mp4 --modelo experimentos/sem_costas
```

Perguntas 4 e 5: rode o `detectar.py` no vídeo com um Pokémon que não está no treino e no vídeo com dois Pokémon no mesmo quadro.
