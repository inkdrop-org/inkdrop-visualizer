FROM node:20
COPY . inkdrop-visualizer
RUN apt-get update && apt-get install -y $(cat /inkdrop-visualizer/requirements.txt)
RUN git clone --depth=1 https://github.com/tfutils/tfenv.git /.tfenv
ENV TF_VERSION="1.8.0"
WORKDIR /inkdrop-visualizer
RUN npm install
RUN npm run build
RUN chmod +x dist/src/index.js
EXPOSE 3000
WORKDIR /
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]