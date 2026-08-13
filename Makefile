.PHONY: dev backend db-only shell-backend shell-frontend rebuild reset reset-seed seed clean logs logs-backend logs-frontend npm-install

dev:  ## Levanta todo (db + backend + frontend) con logs
	docker compose up

backend:  ## Levanta solo db + backend con logs
	docker compose up db backend

db-only:  ## Levanta solo PostgreSQL en background
	docker compose up -d db

shell-backend:  ## Levanta db + backend en background y abre terminal en backend
	docker compose up -d db backend
	docker compose exec backend sh

shell-frontend:  ## Levanta todo en background y abre terminal en frontend
	docker compose up -d
	docker compose exec frontend sh

rebuild:  ## Reconstruye imágenes desde cero (cuando cambian dependencias)
	docker compose build --no-cache
	docker compose up

reset:  ## Borra volúmenes (DB + node_modules) y reconstruye desde cero
	docker compose down -v
	docker compose up --build

seed:  ## Levanta todo forzando el seed (idempotente, no borra datos)
	UBANEX_SEED=true docker compose up

reset-seed:  ## Borra volúmenes y levanta desde cero con el seed completo
	docker compose down -v
	UBANEX_SEED=true docker compose up --build

clean:  ## Libera espacio: elimina contenedores, imágenes y caché no usados
	docker compose down -v 2>/dev/null; docker system prune -af --volumes

logs:  ## Muestra logs de todos los servicios
	docker compose logs -f

logs-backend:  ## Muestra logs solo del backend
	docker compose logs -f backend

logs-frontend:  ## Muestra logs solo del frontend
	docker compose logs -f frontend

npm-install:  ## Ejecuta npm install en backend y frontend (package.json modificado)
	docker compose run --no-deps --rm backend npm install
	docker compose run --no-deps --rm frontend npm install

help:  ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
