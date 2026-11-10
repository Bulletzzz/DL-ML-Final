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
| `experimentos/sem_costas.py` | Monta o dataset sem as costas de um Pokémon (pergunta 3) |

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

O gerador cria 6 vídeos por classe em `videos/`, metade em fundo claro e metade em escuro. Cada vídeo passa por frente, lados, costas, de cima, de baixo, perto e longe. A classe `fundo` usa as mesmas salas sem Pokémon. O ângulo da câmera em cada frame fica salvo em `gerador/angulos/`. Os vídeos de teste ficam em `videos_teste/`, numa sala com parede de tijolo e chão xadrez que não aparece no treino.

O treino gera `modelo.keras`, `modelo_fase1.keras`, `class_names.json`, `curvas.png` e `dataset_imagens.pdf`, e imprime a matriz de confusão de cada fase. A detecção gera o vídeo anotado `saida_<nome>.mp4` e imprime a linha do tempo.

Para usar a webcam, rode `python detectar.py 0` e aperte `q` para sair. Para processar sem abrir janela, defina `MOSTRAR=0` antes do comando (`set MOSTRAR=0` no cmd ou `$env:MOSTRAR=0` no PowerShell).

## Melhorias implementadas

- **Suavização e limiar** (`detectar.py`): usa a média das probabilidades dos últimos N frames e mostra `?` quando a maior média fica abaixo do limiar. Ajuste com `--janela` (padrão 8) e `--limiar` (padrão 0.6).
- **Linha do tempo** (`detectar.py`): no fim do vídeo, imprime em que trechos cada Pokémon apareceu e a lista dos encontrados, ignorando trechos com menos de 0,5 s.
- **Fine-tuning** (`train.py`): depois de treinar só a cabeça, libera as últimas 30 camadas da MobileNetV2 e continua com taxa de aprendizado 1e-5. O `curvas.png` mostra as duas fases e marca onde o fine-tuning começa.

## Resultados

Foram de 347 a 413 fotos por classe. A validação separa um vídeo inteiro de cada classe. O modelo acertou 91,35% da validação no fim da fase 1 e 94,46% depois do fine-tuning. O Pikachu é o mais difícil (recall de 75,8%), porque às vezes vira Psyduck, o outro amarelo.

```
           charmand    fundo  pikachu  psyduck
charmander       75        0        0        0
     fundo        0       79        0        0
   pikachu        3        6       50        7
   psyduck        0        0        0       69
```

No vídeo de teste, os três Pokémon aparecem de 2 a 14 s, de 16 a 28 s e de 30 a 42 s:

```
Linha do tempo (Pokemon identificados) | janela 8, limiar 60%:
     2.4s a   14.2s  ->  pikachu
    16.3s a   28.0s  ->  psyduck
    30.3s a   42.2s  ->  charmander
Pokemon encontrados no video: ['charmander', 'pikachu', 'psyduck']
```

## Experimentos da Parte 5

Pergunta 1, split aleatório por foto (99,68% na validação, mas não melhora no vídeo de teste):

```bash
python train.py --split foto --saida experimentos/split_foto
```

```bash
python detectar.py videos_teste/video_teste.mp4 --modelo experimentos/split_foto
```

Pergunta 2, fine-tuning com taxa 1e-3 (a loss de validação chega a 26,9):

```bash
python train.py --lr-fine 1e-3 --saida experimentos/lr_alta
```

Pergunta 3, sem as costas do Pikachu (ele ainda é reconhecido de costas, com confiança menor):

```bash
python experimentos/sem_costas.py pikachu
```

```bash
python train.py --dados experimentos/sem_costas/data --saida experimentos/sem_costas
```

```bash
python detectar.py videos_teste/costas_pikachu.mp4 --modelo experimentos/sem_costas
```

Pergunta 4, Pokémon fora do treino (o Bulbasaur vira Psyduck ou `?`):

```bash
python detectar.py videos_teste/desconhecido_bulbasaur.mp4
```

Pergunta 5, dois Pokémon no mesmo quadro (o modelo escolhe um só):

```bash
python detectar.py videos_teste/dois_pokemon.mp4
```

## Entrega

- `dataset_imagens.pdf`: imagens do dataset separadas por classe
- `saida_video_teste.mp4`: vídeo de teste anotado
- `train.py` e `detectar.py`: códigos adaptados
- `curvas.png`: curvas das duas fases do treino
- `Relatorio Parte 5.pdf`: respostas da Parte 5, com a matriz de confusão e a linha do tempo
