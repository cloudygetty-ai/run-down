FROM nginx:1.25-alpine

# envsubst (part of gettext) substitutes env vars into nginx.conf at startup
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf.template

# Start script: substitute env vars into the config, then start Nginx
RUN printf '#!/bin/sh\n\
envsubst "$$CITRINEOS_CORE_HOST $$HASURA_HOST $$DIRECTUS_HOST $$EXTENSIONS_HOST" \\\n\
  < /etc/nginx/nginx.conf.template \\\n\
  > /etc/nginx/nginx.conf\n\
exec nginx -g "daemon off;"\n' > /docker-entrypoint-init.sh && \
chmod +x /docker-entrypoint-init.sh

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["/docker-entrypoint-init.sh"]
