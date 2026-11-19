.PHONY: init build up preview sync refresh-offers test check-urls logs stop
init:
	@python3 deploy/init_env.py
build:
	docker build --target app -t maxgroup-app:local .
	docker build --target proxy -t maxgroup-nginx:local .
up: init build
	docker compose up --no-build -d --wait nginx worker-crm worker-import beat
preview: up
	docker compose logs --follow --tail=0 web
sync: up
refresh-offers:
	docker run --rm --user "$$(id -u):$$(id -g)" -v "$(CURDIR):/project" -w /project node:24-bookworm-slim node tools/refresh-model-offers.mjs
	$(MAKE) up
test: init
	docker compose exec -T web python manage.py check
	docker compose exec -T web python manage.py makemigrations --check --dry-run
	docker compose exec -T web python manage.py test backend --settings=backend.test_settings
check-urls:
	docker compose exec -T web python - /app/release http://localhost:8000 < deploy/check_urls.py
logs:
	docker compose logs --tail=100 web worker-crm worker-import beat
stop:
	docker compose stop
