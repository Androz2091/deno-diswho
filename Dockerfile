FROM denoland/deno:1.17.1
EXPOSE 8080
WORKDIR /app
USER deno
COPY . .
RUN mkdir -p /var/tmp/log
CMD ["run", "--allow-all", "mod.js"]
