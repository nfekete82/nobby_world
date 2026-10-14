FROM nginx:stable-alpine

# Package only the playable game and locally imported art.
# Avoid OrbStack/macOS bind-mount permission and file-sharing issues.
COPY index.html /usr/share/nginx/html/index.html
COPY assets/ /usr/share/nginx/html/assets/

# The nginx worker runs as an unprivileged user.
RUN test -s /usr/share/nginx/html/index.html \
    && chmod -R a+rX /usr/share/nginx/html
