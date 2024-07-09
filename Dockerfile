FROM node:10-alpine

WORKDIR /home/node/app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm cache clean --force

RUN npm install

COPY  . .

EXPOSE 8080

CMD [ "npm", "start" ]
