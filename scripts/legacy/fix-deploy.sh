#!/bin/sh
docker exec portariax rm -rf /app/dist/assets /app/dist/index.html /app/dist/dist /app/dist/logo-appcorrespondencia.png /app/dist/logo-appmanutencao.png /app/dist/logo-gestaoelimpeza.png /app/dist/logo-manutencaox.png /app/dist/logo-portariax.png /app/dist/logo.png /app/dist/manifest.json /app/dist/og-image.svg /app/dist/robots.txt /app/dist/sitemap.xml
docker exec portariax rm -rf /app/dist-server/*
docker cp /opt/portariax/dist/. portariax:/app/dist
docker cp /opt/portariax/dist-server/. portariax:/app/dist-server
docker exec -u 0 portariax chown -R 1001:1001 /app/dist /app/dist-server
docker restart portariax
sleep 5
curl -sf http://localhost:3001/api/health
