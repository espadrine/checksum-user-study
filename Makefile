SHELL=bash

run: node_modules
	@if [[ ! -f ./.settings.json ]]; then \
	  echo 'The server’s settings file is missing.'; \
	  echo -n 'Please generate one; '; \
	  echo 'you can take .dev-settings.json as inspiration.'; \
	  echo; \
	  echo '   cp  .dev-settings.json .settings.json'; \
	  echo; \
	  exit 1; \
	fi
	env -i `which node` app

node_modules:
	npm install

web:
	curl -s 'https://thefiletree.com/espadrine/r&d/base32check/user-study?app=data' >web/index.html

.PHONY: run web
