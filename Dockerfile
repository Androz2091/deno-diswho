FROM denoland/deno:2.0.0-rc.0

# The port that your application listens to.
EXPOSE 3050

WORKDIR /app

# Prefer not to run as root.
USER deno

# These steps will be re-run upon each file change in your working directory:
COPY . .

CMD ["run", "--allow-env", "--allow-net", "--allow-read", "mod.js"]
