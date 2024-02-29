FROM ghcr.io/runatlantis/atlantis:latest-debian
USER root

RUN curl --output inkdrop-linux-x64.tar.gz -L https://github.com/inkdrop-org/inkdrop-visualizer/releases/latest/download/inkdrop-linux-x64.tar.gz
RUN apt update

COPY deb-dependencies.txt /home/atlantis
RUN apt install -y $(cat /home/atlantis/deb-dependencies.txt)

RUN tar -xvf inkdrop-linux-x64.tar.gz
RUN chmod +x inkdrop
RUN mv inkdrop /usr/local/bin
COPY atlantis.yaml /home/atlantis
COPY comment-pr.sh /home/atlantis
USER atlantis