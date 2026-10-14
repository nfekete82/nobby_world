FROM nginx:stable-alpine

# Package only the playable game and locally imported art.
# Avoid OrbStack/macOS bind-mount permission and file-sharing issues.
COPY index.html /usr/share/nginx/html/index.html
COPY assets/ /usr/share/nginx/html/assets/

# The nginx worker runs as an unprivileged user.
RUN test -s /usr/share/nginx/html/index.html \
    && test -s /usr/share/nginx/html/assets/3d/world.js \
    && test -s /usr/share/nginx/html/assets/vendor/three.module.js \
    && test -s /usr/share/nginx/html/assets/3d/ui.png \
    && chmod -R a+rX /usr/share/nginx/html
