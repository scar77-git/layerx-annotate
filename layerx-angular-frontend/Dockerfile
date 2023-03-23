FROM node:14-alpine as build
WORKDIR /app
COPY package*.json /app/
# RUN npm install -g ionic
RUN npm install -g @angular/cli
RUN npm install

COPY ./ /app/

RUN ng build

# RUN rm -r deploy/annotation-tool/
RUN cp -r /app/dist/ deploy/
RUN cp -r /app/dist/annotation-tool deploy/
RUN cp -r /app/dist/annotation-tool/ deploy/

# RUN npm run-script build:prod
# FROM nginx:alpine
# RUN rm -rf /usr/share/nginx/html/*
# COPY --from=build /app/dist/annotation-tool/ /usr/share/nginx/html
# COPY --from=build /app/dist/ /usr/share/nginx/html


# CMD ["nohup", "node", "server.js","&", ">", "nohup.out" ]
CMD ["node", "server.js"]
# RUN bash run.sh
# CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
EXPOSE 8085