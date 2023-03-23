#!/bin/bash
#Read variables from .env file at the root
. .env

#Base url to frontend
ESCAPED_BASE_URL=$(printf '%s\n' "$BASE_URL" | sed -e 's/[\/&]/\\&/g')
sed -i "s/<BASE_URL>/$ESCAPED_BASE_URL/" src/environments/environment.prod.ts
