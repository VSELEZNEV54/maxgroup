.PHONY: init build up up-local preview sync refresh-offers test test-local check-urls logs stop
init:
	@python3 deploy/init_env.py
build:
	docker build -t maxgroup-next:local frontend
	docker build --target app -t maxgroup-app:local .
	docker build --target proxy -t maxgroup-nginx:local .
up: init
	@python3 deploy/compose_lock.py write $(MAKE) up-local
up-local: build
	docker compose up --no-build -d chat-model
	docker compose up --no-build -d --wait nginx worker-crm worker-import beat
preview: up
	docker compose logs --follow --tail=0 frontend web
sync: up
refresh-offers:
	docker run --rm --user "$$(id -u):$$(id -g)" -v "$(CURDIR):/project" -w /project node:24-bookworm-slim node tools/refresh-model-offers.mjs
	$(MAKE) up
test: init
	@python3 deploy/compose_lock.py read $(MAKE) test-local
test-local:
	docker compose exec -T web python manage.py check
	docker compose exec -T web python manage.py makemigrations --check --dry-run
	docker compose exec -T web python manage.py test backend --settings=backend.test_settings
	docker compose exec -T web python - http://nginx < deploy/check_frontend.py
check-urls:
	@python3 deploy/compose_lock.py read docker compose exec -T web python - /app/release http://nginx --next < deploy/check_urls.py
logs:
	docker compose logs --tail=100 frontend web worker-crm worker-import beat
stop:
	@python3 deploy/compose_lock.py write docker compose stop
