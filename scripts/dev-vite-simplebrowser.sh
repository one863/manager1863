#!/bin/bash
rm -rf node_modules/.vite
npm run dev &
# Attendre que le serveur soit prêt (ajuster si besoin)
sleep 3
code --command "simpleBrowser.show" "http://localhost:5173"
