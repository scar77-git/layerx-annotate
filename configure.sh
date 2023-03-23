#!/bin/bash
#Read variables from .env file at the root
. .env

#Base url to frontend
ESCAPED_BASE_URL=$(printf '%s\n' "$BASE_URL" | sed -e 's/[\/&]/\\&/g')
sed -i "s/<BASE_URL>/$ESCAPED_BASE_URL/" layerx-angular-frontend/src/environments/environment.prod.ts

#Google drive credentials to frontend
ESCAPED_GOOGLE_APP_ID=$(printf '%s\n' "$GOOGLE_APP_ID" | sed -e 's/[\/&]/\\&/g')
sed -i "s/<GOOGLE_APP_ID>/$ESCAPED_GOOGLE_APP_ID/" layerx-angular-frontend/src/environments/environment.prod.ts
ESCAPED_GOOGLE_CLIENT_ID=$(printf '%s\n' "$GOOGLE_CLIENT_ID" | sed -e 's/[\/&]/\\&/g')
sed -i "s/<GOOGLE_CLIENT_ID>/$ESCAPED_GOOGLE_CLIENT_ID/" layerx-angular-frontend/src/environments/environment.prod.ts
ESCAPED_GOOGLE_API_KEY=$(printf '%s\n' "$GOOGLE_API_KEY" | sed -e 's/[\/&]/\\&/g')
sed -i "s/<GOOGLE_API_KEY>/$ESCAPED_GOOGLE_API_KEY/" layerx-angular-frontend/src/environments/environment.prod.ts

#Base url to sync-tool
ESCAPED_BASE_URL=$(printf '%s\n' "$BASE_URL" | sed -e 's/[\/&]/\\&/g')
sed -i "s/<BASE_URL>/$ESCAPED_BASE_URL/" layerx-sync-tool/sync-tool/sync.py

