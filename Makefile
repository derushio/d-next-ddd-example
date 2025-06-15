dev:
	docker compose -f docker/compose.yaml --env-file=".env" up -d pg

down:
	docker compose -f docker/compose.yaml --env-file=".env" down

reset:
	docker compose -f docker/compose.yaml --env-file=".env" down -v

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

	# Replace d-next-ddd-example with project name from package.json
	PROJECT_NAME=$$(jq -r '.name' package.json) && \
	command -v fd >/dev/null 2>&1 || { echo "Error: fd command is required but not found." >&2; exit 1; } && \
	fd --hidden --no-ignore -t f \
		-E node_modules -E .next -E dist -E .git \
		-x sed -i "s/d-next-ddd-example/$${PROJECT_NAME}/g" {}

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
