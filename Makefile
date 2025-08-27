dev:
	docker compose -f docker/compose.yaml --env-file=".env" up -d pg

down:
	docker compose -f docker/compose.yaml --env-file=".env" down

reset:
	docker compose -f docker/compose.yaml --env-file=".env" down -v

seed:
	pnpm db:migrate:dev
	pnpm db:seed

setup:
	echo 'DB_USER="postgres"' > .env.example.dev
	echo 'DB_PASSWORD="password"' >> .env.example.dev
	echo 'DB_NAME="app"' >> .env.example.dev
	echo 'DB_HOST="127.0.0.1"' >> .env.example.dev
	echo 'DB_PORT="5465"' >> .env.example.dev
	echo '' >> .env.example.dev
	echo 'DATABASE_URL="postgresql://$${DB_USER}:$${DB_PASSWORD}@$${DB_HOST}:$${DB_PORT}/$${DB_NAME}?schema=public"' >> .env.example.dev
	echo '' >> .env.example.dev
	echo 'NEXT_PUBLIC_BASE_URL="http://localhost:3000"' >> .env.example.dev
	echo 'TOKEN_SALT_ROUNDS="10"' >> .env.example.dev
	echo "TOKEN_SECRET=\"`openssl rand -base64 32`\"" >> .env.example.dev
	echo 'TOKEN_MAX_AGE_MINUTES="60"' >> .env.example.dev
	echo 'TOKEN_UPDATE_AGE_MINUTES="2.5"' >> .env.example.dev
	echo '' >> .env.example.dev
	echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env.example.dev
	echo "NEXTAUTH_SECRET=\"`openssl rand -base64 32`\"" >> .env.example.dev

	cp .env.example.dev .env
	
	pnpm install

	# Install Playwright browsers for E2E testing
	pnpm exec playwright install chromium firefox

	# Replace d-next-resources with project name from package.json
	PROJECT_NAME=$$(jq -r '.name' package.json) && \
	command -v fd >/dev/null 2>&1 || { echo "Error: fd command is required but not found." >&2; exit 1; } && \
	fd --hidden --no-ignore -t f \
		-E node_modules -E .next -E dist -E .git \
		-x sed -i "s/d-next-resources/$${PROJECT_NAME}/g" {}

	# Setup Git hooks
	@echo ""
	@echo "🔧 Setting up Git hooks..."
	$(MAKE) setup-git-hooks

setup-electron: setup
	pnpm add fs-extra @prisma/migrate
	pnpm add -D electron electron-builder locate-path @types/fs-extra

	echo 'node-linker=hoisted' > .npmrc
	echo 'symlink=false' >> .npmrc

	echo 'DATABASE_URL="file:../db/db.db"' > .env.example.dev
	echo '' >> .env.example.dev
	echo 'TOKEN_SALT_ROUNDS="10"' >> .env.example.dev
	echo "TOKEN_SECRET=\"`openssl rand -base64 32`\"" >> .env.example.dev
	echo 'TOKEN_MAX_AGE_MINUTES="60"' >> .env.example.dev
	echo 'TOKEN_UPDATE_AGE_MINUTES="2.5"' >> .env.example.dev

	cp .env.example.dev .env

	cp ./prisma/schema.electron.prisma ./prisma/schema.prisma
	rm -rf ./prisma/migrations

	pnpm dotenvx run -- pnpm tsx ./src/tools/setupPackageJsonElectron.ts

setup-hooks:
	# Git hooks setup for pre-commit and pre-push
	@echo "Setting up Git hooks..."
	@if [ ! -d "./.git" ]; then \
		echo "Error: Git repository not found at ./.git"; \
		echo "Please run this command from a Git repository"; \
		exit 1; \
	fi
	@mkdir -p ./.git/hooks
	@echo "#!/bin/sh" > ./.git/hooks/pre-commit
	@echo "# Auto-format before commit" >> ./.git/hooks/pre-commit
	@echo "cd d-next-resources" >> ./.git/hooks/pre-commit
	@echo "pnpm format" >> ./.git/hooks/pre-commit
	@echo "git add ." >> ./.git/hooks/pre-commit
	@chmod +x ./.git/hooks/pre-commit
	@echo "#!/bin/sh" > ./.git/hooks/pre-push
	@echo "# Run type-check, lint and tests before push" >> ./.git/hooks/pre-push
	@echo "set -e" >> ./.git/hooks/pre-push
	@echo "cd d-next-resources" >> ./.git/hooks/pre-push
	@echo "pnpm type-check" >> ./.git/hooks/pre-push
	@echo "pnpm lint" >> ./.git/hooks/pre-push
	@echo "pnpm test:unit" >> ./.git/hooks/pre-push
	@chmod +x ./.git/hooks/pre-push
	@echo "✅ Git hooks setup completed!"
	@echo "  - pre-commit: auto-format with 'pnpm format'"
	@echo "  - pre-push: run type-check, lint and unit tests with 'pnpm type-check && pnpm lint && pnpm test:unit'"

init-hooks: setup-hooks
	# Initialize husky for current project (after git init)
	@echo "Initializing husky for project..."
	@if [ ! -d ".git" ]; then \
		echo "Error: Git repository not found in current directory"; \
		echo "Please run 'git init' first"; \
		exit 1; \
	fi
	pnpm husky init
	@echo "#!/bin/sh" > .husky/pre-commit
	@echo "pnpm format" >> .husky/pre-commit
	@echo "git add ." >> .husky/pre-commit
	@echo "#!/bin/sh" > .husky/pre-push
	@echo "set -e" >> .husky/pre-push
	@echo "pnpm type-check" >> .husky/pre-push
	@echo "pnpm lint" >> .husky/pre-push
	@echo "pnpm test:unit" >> .husky/pre-push
	@echo "✅ Husky hooks initialized for current project!"

setup-git-hooks:
	# Auto-detect environment and setup appropriate Git hooks
	@echo "🔍 Detecting Git environment..."
	@if [ -d "./.git" ]; then \
		echo "📁 Found parent Git repository (./.git)"; \
		echo "🔧 Setting up hooks for template project..."; \
		$(MAKE) setup-hooks; \
	elif [ -d ".git" ]; then \
		echo "📁 Found local Git repository (.git)"; \
		echo "🔧 Setting up husky for independent project..."; \
		if ! command -v pnpm >/dev/null 2>&1; then \
			echo "❌ Error: pnpm is required but not found"; \
			exit 1; \
		fi; \
		if ! pnpm list husky >/dev/null 2>&1; then \
			echo "📦 Installing husky..."; \
			pnpm add -D husky; \
		fi; \
		$(MAKE) init-hooks; \
	else \
		echo "❌ Error: No Git repository found"; \
		echo "💡 Please run 'git init' first, or ensure you're in a Git repository"; \
		exit 1; \
	fi
	@echo ""
	@echo "✅ Git hooks setup completed!"
	@echo "📝 Configured hooks:"
	@echo "   - pre-commit: Auto-format with 'pnpm format'"
	@echo "   - pre-push: Run type-check, lint and unit tests with 'pnpm type-check && pnpm lint && pnpm test:unit'"
