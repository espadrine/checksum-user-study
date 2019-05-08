run:
	node app

web:
	curl -s 'https://thefiletree.com/espadrine/r&d/base32check/user-study?app=data' >web/index.html

.PHONY: run web
