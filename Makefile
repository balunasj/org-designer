.PHONY: help dev import fetch-users build clean check

LDAP_ATTRS := cn rhatJobRole rhatJobTitle manager uid title \
	rhatPreferredLastName displayName rhatLocation rhatOfficeLocation \
	rhatGeo preferredTimeZone rhatHireDate rhatPrimaryMail \
	rhatOriginalHireDate rhatPreferredAlias rhatSocialURL rhatPronouns \
	c co st l

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: data/baseline.json ## Start the dev server (Vite + API)
	npm run dev

import: data/baseline.json ## (Re-)import org data → data/baseline.json
	@echo "baseline.json is up to date"

data/baseline.json: data/all_users.json
	npm run import

data/all_users.json: ## Fetch from LDAP and enrich (requires VPN + ldap-utils)
	@mkdir -p data
	@echo "Fetching from LDAP..."
	ldapsearch -x employeeType=Employee $(LDAP_ATTRS) > data/all_users_ldif
	@echo "Converting LDIF to JSON..."
	uvx --with geonamescache python scripts/ldif_to_json.py data/all_users_ldif > data/all_users_temp.json
	@echo "Enriching with geocoding + report counts..."
	uvx --with geonamescache python scripts/enrich_users.py data/all_users_temp.json > data/all_users.json
	@rm -f data/all_users_ldif data/all_users_temp.json
	@echo "Done — data/all_users.json ready"

fetch-users: ## Fetch LDAP data → data/all_users.json (requires VPN + ldap-utils)
	@rm -f data/all_users.json
	$(MAKE) data/all_users.json

build: data/baseline.json ## Build for production
	npm run build

check: ## TypeScript type check
	npx tsc --noEmit -p tsconfig.app.json

clean: ## Remove build output and all imported data
	rm -rf dist/ data/

clean-baseline: ## Remove only the processed baseline (keep all_users.json)
	rm -f data/baseline.json
