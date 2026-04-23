.PHONY: help dev import build clean check

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Start the dev server (Vite + API)
	npm run dev

import: ## Import data from fastrover + org repo → data/baseline.json
	npm run import

build: ## Build for production
	npm run build

check: ## TypeScript type check
	npx tsc --noEmit -p tsconfig.app.json

clean: ## Remove build output and imported data
	rm -rf dist/ data/
