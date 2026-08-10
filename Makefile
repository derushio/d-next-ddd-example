# === GNU sed (BSD sed互換性のため gsed を優先) ===
SED := $(shell command -v gsed 2>/dev/null || echo sed)

# === host pg_isready (libpq) 必須 ===
# Traefik TCP route + PostgreSQL backend の race condition を回避するため、
# host 側から PG プロトコルで疎通確認する必要がある。
# host に pg_isready がない場合は明示的にエラーで停止 (fallback 禁止)。

# === Port Allocation Constants ===
# 全ブランチ（main / worktree 共通）で `PROJECT_BASE-WORKTREE_ID` から決定的にポート算出。
# 固定ポート（旧 DB_PORT_MAIN=5465）はテンプレート展開時に複数プロジェクトで衝突するため廃止。
# 範囲はグローバル Traefik が listen している pg-5465〜pg-5664 の 200 ポートに揃える。
# 200 = 並列 worktree 数の永続的余裕値。範囲上限 5664 < 49152 (macOS ephemeral 下限) で安全。
# Traefik の entrypoint 静的定義に依存するため、範囲拡大には Traefik 再起動が必要
# (`make traefik-rebuild-cmd` でコマンド生成、macos-dev-bootstrap skill 参照)。
DB_PORT_RANGE_START := 5465
DB_PORT_RANGE_SIZE := 200

# === worktree動的環境変数 ===
WORKTREE_BRANCH := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
WORKTREE_ID := $(shell echo "$(WORKTREE_BRANCH)" | sed 's/^worktree-//')

# PROJECT_BASE の算出は scripts/resolveProjectBase.mjs に一元化（pkg-name + main repo dir-name）
PROJECT_BASE := $(shell node scripts/resolveProjectBase.mjs)
ifeq ($(PROJECT_BASE),)
  $(error PROJECT_BASE could not be resolved. Check scripts/resolveProjectBase.mjs)
endif

# DB_PORT は scripts/allocateDbPort.sh で動的算出:
#   - 第1優先: PROJECT_BASE + WORKTREE_ID のハッシュで決定的に算出
#   - 衝突時: Traefik 上で使用中のポート（自プロジェクト除く）を避けて linear probing
# これにより、ハッシュ確率衝突（範囲20での誕生日問題）を実行時に回避する。
COMPOSE_PROJECT := $(PROJECT_BASE)-$(WORKTREE_ID)
DB_PORT_DYNAMIC := $(shell scripts/allocateDbPort.sh "$(PROJECT_BASE)" "$(WORKTREE_ID)" $(DB_PORT_RANGE_START) $(DB_PORT_RANGE_SIZE) "$(COMPOSE_PROJECT)")
ifeq ($(DB_PORT_DYNAMIC),)
  $(error DB port allocation failed. Check scripts/allocateDbPort.sh)
endif
# docker/compose.yaml の volumes: `pg-data` に合わせたハイフン付き命名。
# docker compose は `<project>_<volume>` 形式で付与する。
VOLUME_NAME := $(COMPOSE_PROJECT)_pg-data

# --- .env にシークレットを書き込むヘルパー ---
# 指定キーが空なら自動生成して .env に書き込む（冪等）
define ensure_env_secret
	@KEY=$(1); \
	VAL=$$(grep "^$$KEY=" .env 2>/dev/null | sed "s/$$KEY=//;s/^\"//;s/\"$$//"); \
	if [ -z "$$VAL" ]; then \
		VAL=$$(openssl rand -base64 32) && \
		if grep -q "^$$KEY=" .env; then \
			$(SED) -i "s|^$$KEY=.*|$$KEY=\"$$VAL\"|" .env; \
		else \
			echo "$$KEY=\"$$VAL\"" >> .env; \
		fi; \
		echo "⚠️  $$KEY was empty, auto-generated"; \
	fi
endef

# === portless URL自動計算 ===
PORTLESS_PORT := 1355
ifeq ($(WORKTREE_BRANCH),main)
  PORTLESS_URL := https://$(PROJECT_BASE).localhost:$(PORTLESS_PORT)
else ifneq ($(findstring worktree-,$(WORKTREE_BRANCH)),)
  PORTLESS_URL := https://$(WORKTREE_BRANCH).$(PROJECT_BASE).localhost:$(PORTLESS_PORT)
else
  PORTLESS_URL := https://$(PROJECT_BASE).localhost:$(PORTLESS_PORT)
endif

DOCKER_COMPOSE := COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT) DB_PORT=$(DB_PORT_DYNAMIC) docker compose -f docker/compose.yaml --env-file=".env"

check-host-tools:
	@if ! command -v pg_isready > /dev/null 2>&1; then \
		echo "❌ host に pg_isready が見つかりません。"; \
		echo ""; \
		echo "  Traefik TCP route + PostgreSQL backend の race condition 回避のため、"; \
		echo "  host 側 pg_isready (libpq) は必須です。以下を実行してインストールしてください:"; \
		echo ""; \
		echo "    brew install libpq"; \
		echo "    echo 'export PATH=\"$$(brew --prefix libpq)/bin:\$$PATH\"' >> ~/.zshrc"; \
		echo "    source ~/.zshrc"; \
		echo ""; \
		echo "  確認: command -v pg_isready"; \
		exit 1; \
	fi

up: check-host-tools auto-restore-if-fresh
	@echo "🌿 Worktree: $(WORKTREE_ID)"
	@echo "📦 Compose project: $(COMPOSE_PROJECT)"
	@echo "🔌 DB Port: $(DB_PORT_DYNAMIC) (via Traefik TCP)"
	@if [ -f .env ]; then \
		$(SED) -i 's/^DB_PORT=.*/DB_PORT="$(DB_PORT_DYNAMIC)"/' .env; \
		$(SED) -i 's|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL="$(PORTLESS_URL)"|' .env; \
		$(SED) -i 's|^AUTH_URL=.*|AUTH_URL="$(PORTLESS_URL)"|' .env; \
		if ! grep -q 'sslmode=' .env; then \
			$(SED) -i 's|^\(DATABASE_URL=.*\)schema=public"|\1schema=public\&sslmode=disable"|' .env; \
		fi; \
		echo "✅ .env updated: DB_PORT=$(DB_PORT_DYNAMIC), URL=$(PORTLESS_URL)"; \
	fi
	$(call ensure_env_secret,TOKEN_SECRET)
	$(call ensure_env_secret,AUTH_SECRET)
	$(call ensure_env_secret,DB_PASSWORD)
	$(DOCKER_COMPOSE) up -d pg
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@TIMEOUT=30; \
	COUNT=0; \
	while [ $$COUNT -lt $$TIMEOUT ]; do \
		if pg_isready -h 127.0.0.1 -p $(DB_PORT_DYNAMIC) -U postgres > /dev/null 2>&1; then \
			echo "✅ PostgreSQL is ready (via Traefik TCP on port $(DB_PORT_DYNAMIC))!"; \
			break; \
		fi; \
		CONTAINER_STATUS=$$($(DOCKER_COMPOSE) ps pg --format '{{.State}}' 2>/dev/null || echo "unknown"); \
		if [ "$$CONTAINER_STATUS" = "exited" ] || [ "$$CONTAINER_STATUS" = "dead" ]; then \
			echo ""; \
			echo "❌ PostgreSQL container failed to start!"; \
			echo ""; \
			echo "=== Container Logs ==="; \
			$(DOCKER_COMPOSE) logs pg 2>&1 | tail -20; \
			echo ""; \
			echo "💡 Hint: Check if .env file exists and has correct DB_USER, DB_PASSWORD, DB_NAME"; \
			exit 1; \
		fi; \
		echo "  PostgreSQL is not ready yet, waiting... ($$COUNT/$$TIMEOUT)"; \
		sleep 1; \
		COUNT=$$((COUNT + 1)); \
	done; \
	if [ $$COUNT -ge $$TIMEOUT ]; then \
		echo ""; \
		echo "❌ Timeout waiting for PostgreSQL!"; \
		echo ""; \
		echo "=== Container Logs ==="; \
		$(DOCKER_COMPOSE) logs pg 2>&1 | tail -20; \
		exit 1; \
	fi
	@# === Resync DB role password & ensure target DB exists ===
	@# 既存 pg-data ボリュームのロールパスワードと .env の DB_PASSWORD がドリフトする問題を防ぐ。
	@# initdb は初回のみ POSTGRES_USER/PASSWORD/DB を反映 → 以降は .env を書き換えても無視される。
	@# コンテナ内 unix socket は trust 認証なので認証情報なしで管理 SQL を流せる（冪等）。
	@# 安全なエスケープ: psql -v 変数 + :'name' (SQLリテラル) / :"name" (SQL識別子) で自動エスケープ。
	@# 注意: :'name'/:"name" 形式の変数展開は psql の -c では効かない (公式ドキュメント記載)。
	@#       インタラクティブ or -f or stdin 経由 SQL でのみ動作するため stdin 経由で投入する。
	@# これによりパスワードや DB 名にシングルクォート等の特殊文字が含まれても SQL 構文が壊れない。
	@DB_PASSWORD_VAL=$$(grep '^DB_PASSWORD=' .env | sed 's/^DB_PASSWORD=//;s/^"//;s/"$$//'); \
	DB_NAME_VAL=$$(grep '^DB_NAME=' .env | sed 's/^DB_NAME=//;s/^"//;s/"$$//'); \
	echo "ALTER USER postgres WITH PASSWORD :'new_pass';" | \
		$(DOCKER_COMPOSE) exec -T pg psql -U postgres -d postgres \
			-v new_pass="$$DB_PASSWORD_VAL" > /dev/null; \
	DB_EXISTS=$$(echo "SELECT 1 FROM pg_database WHERE datname=:'db_name';" | \
		$(DOCKER_COMPOSE) exec -T pg psql -U postgres -d postgres -tA \
			-v db_name="$$DB_NAME_VAL"); \
	if [ "$$DB_EXISTS" != "1" ]; then \
		echo "CREATE DATABASE :\"db_name\";" | \
			$(DOCKER_COMPOSE) exec -T pg psql -U postgres -d postgres \
				-v db_name="$$DB_NAME_VAL" > /dev/null; \
	fi
	@echo "🔐 DB role password resynced & target DB ensured"
	pnpm db:migrate:deploy
	pnpm db:generate
	pnpm db:seed

dev: up
	PROJECT_BASE=$(PROJECT_BASE) pnpm dev

build: up
	PROJECT_BASE=$(PROJECT_BASE) pnpm build

# 自 worktree CWD で動いている dev 関連プロセス(next-server / next dev / portless /
# prisma generate --sql --watch / prisma studio) を確実に停止する。
# `make down` / `make clean` の前段で実行することで、worktree クリーンアップ後に
# next-server が孤児プロセスとして残り続け CPU を食い続ける事故を防ぐ。
# 自 cwd 一致でフィルタするため、他 worktree や他プロジェクトの dev には影響しない。
stop-procs:
	@echo "🛑 Stopping dev server processes scoped to $$(pwd)..."
	@SELF_DIR="$$(pwd)"; \
	for sig in TERM TERM KILL; do \
		PIDS=$$(ps -axo pid,command \
			| grep -E 'next-server|next dev|prisma generate.* --watch|prisma studio --browser none|portless ' \
			| grep -v grep \
			| awk '{print $$1}'); \
		for pid in $$PIDS; do \
			cwd=$$(lsof -p $$pid 2>/dev/null | awk '$$4=="cwd"{print $$NF}' | head -1); \
			if [ "$$cwd" = "$$SELF_DIR" ]; then \
				echo "  kill -$$sig PID=$$pid"; \
				kill -$$sig $$pid 2>/dev/null || true; \
			fi; \
		done; \
		sleep 1; \
	done
	@echo "✅ Dev processes stopped"

down: stop-procs
	$(DOCKER_COMPOSE) down

clean: stop-procs
	$(DOCKER_COMPOSE) down -v
	@# podman-compose down -v が名前付きボリュームを削除しないケースへのフォールバック
	@docker volume rm -f $(VOLUME_NAME) > /dev/null 2>&1 || true
	@echo "🗑️  Volume $(VOLUME_NAME) removed (if existed)"

seed:
	pnpm db:migrate:deploy
	pnpm db:seed

setup:
	@echo "🚀 Setting up project..."

	# === Phase A: 前提条件チェック ===
	@command -v fd >/dev/null 2>&1 || { echo "❌ Error: fd is required but not found. Install: https://github.com/sharkdp/fd" >&2; exit 1; }
	@command -v jq >/dev/null 2>&1 || { echo "❌ Error: jq is required but not found." >&2; exit 1; }
	@command -v openssl >/dev/null 2>&1 || { echo "❌ Error: openssl is required but not found." >&2; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ Error: pnpm is required but not found." >&2; exit 1; }
	@PROJECT_NAME=$$(jq -r '.name' package.json) && \
	if [ "$$PROJECT_NAME" = "d-next-ddd-example" ]; then \
		echo "❌ Error: 先に package.json の name を変更してください（現在: d-next-ddd-example）" >&2; \
		exit 1; \
	fi
	@echo "✅ Prerequisites OK"

	# === Phase B: .env 生成（冪等） ===
	@if [ -f .env ]; then \
		echo "⚠️  .env already exists, skipping..."; \
	else \
		TOKEN_SECRET=$$(openssl rand -base64 32) && \
		AUTH_SECRET=$$(openssl rand -base64 32) && \
		cp .env.example.dev .env && \
		$(SED) -i "s|TOKEN_SECRET=\"\"|TOKEN_SECRET=\"$$TOKEN_SECRET\"|" .env && \
		$(SED) -i "s|AUTH_SECRET=\"\"|AUTH_SECRET=\"$$AUTH_SECRET\"|" .env && \
		$(SED) -i 's|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL="$(PORTLESS_URL)"|' .env && \
		$(SED) -i 's|^AUTH_URL=.*|AUTH_URL="$(PORTLESS_URL)"|' .env && \
		echo "✅ .env created from .env.example.dev"; \
	fi

	# === Phase C: プロジェクト名一括置換（pnpm install の前） ===
	# トリガーは「リポジトリ内のどこかに 'd-next-ddd-example' 文字列が残っているか」。
	# next.config.ts 単体のチェックでは初期テンプレが該当文字列を含まない場合に
	# 置換スキップ → README/.env.example.dev/k8s/createdb.sql 等に残存する。
	@if fd --hidden --no-ignore -t f \
			-E node_modules -E .next -E dist -E .git \
			-E pnpm-lock.yaml -E '*.ico' -E .env \
			-x grep -l 'd-next-ddd-example' {} 2>/dev/null | grep -q .; then \
		PROJECT_NAME=$$(jq -r '.name' package.json) && \
		echo "🔄 Replacing 'd-next-ddd-example' with '$$PROJECT_NAME'..." && \
		fd --hidden --no-ignore -t f \
			-E node_modules -E .next -E dist -E .git \
			-E pnpm-lock.yaml -E '*.ico' -E .env \
			-x $(SED) -i "s/d-next-ddd-example/$$PROJECT_NAME/g" {} && \
		echo "✅ Project name replaced"; \
	else \
		echo "ℹ️  Project name already replaced, skipping..."; \
	fi

	# === Phase D: 依存インストール ===
	pnpm install

	# Install Playwright browsers for E2E testing
	pnpm exec playwright install chromium firefox

	# === Phase E: Git hooks + 完了メッセージ ===
	@echo ""
	@echo "🔧 Setting up Git hooks..."
	$(MAKE) setup-git-hooks
	@echo ""
	@echo "✅ Setup complete!"
	@echo "⚠️  次のステップ:"
	@echo "   1. portless proxy start  (初回のみ)"
	@echo "   2. make dev              (開発環境起動)"
	@echo "   3. portless list         (URL確認)"


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
	@echo "pnpm format" >> ./.git/hooks/pre-commit
	@chmod +x ./.git/hooks/pre-commit
	@echo "#!/bin/sh" > ./.git/hooks/pre-push
	@echo "# Run check before push" >> ./.git/hooks/pre-push
	@echo "set -e" >> ./.git/hooks/pre-push
	@echo "pnpm check" >> ./.git/hooks/pre-push
	@chmod +x ./.git/hooks/pre-push
	@echo "✅ Git hooks setup completed!"
	@echo "  - pre-commit: auto-format with 'pnpm format'"
	@echo "  - pre-push: run check with 'pnpm check'"

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
	@echo "#!/bin/sh" > .husky/pre-push
	@echo "set -e" >> .husky/pre-push
	@echo "pnpm check" >> .husky/pre-push
	@echo "✅ Husky hooks initialized for current project!"

# === DB Backup/Restore ===
BACKUP_BASE_DIR := $(HOME)/Documents/db-backups
BACKUP_ROOT := $(BACKUP_BASE_DIR)/$(PROJECT_BASE)
# main ブランチの auto バックアップは常に main/auto に集約（= auto-restore の親ソース）
# worktree ブランチの auto バックアップは worktrees/<id>/auto に隔離
ifeq ($(WORKTREE_ID),main)
  BRANCH_AUTO_DIR := $(BACKUP_ROOT)/main/auto
else
  BRANCH_AUTO_DIR := $(BACKUP_ROOT)/worktrees/$(WORKTREE_ID)/auto
endif
# 全ブランチ共有のネームドバックアップ置き場（ローテーション対象外）
NAMED_DIR := $(BACKUP_ROOT)/named
# auto-restore が参照する親バックアップディレクトリ（= main の auto）
PARENT_AUTO_DIR := $(BACKUP_ROOT)/main/auto
# auto バックアップ保持件数。db-backup 実行時に超過分を FIFO 削除
BACKUP_KEEP ?= 20

# --- DB snapshot 作成ヘルパー ---
# 第1引数: 保存先ディレクトリ, 第2引数: tar ファイル basename (拡張子なし)
define create_db_snapshot
	@if ! pg_isready -h 127.0.0.1 -p $(DB_PORT_DYNAMIC) -U postgres > /dev/null 2>&1; then \
		echo "❌ PostgreSQL is not running on port $(DB_PORT_DYNAMIC)"; \
		echo "💡 Run 'make up' first"; \
		exit 1; \
	fi; \
	DEST_DIR="$(1)"; \
	BASENAME="$(2)"; \
	mkdir -p "$$DEST_DIR"; \
	BACKUP_FILE="$$DEST_DIR/$$BASENAME.tar.gz"; \
	echo "📦 Creating volume snapshot..."; \
	$(DOCKER_COMPOSE) stop pg; \
	docker run --rm \
		-v $(VOLUME_NAME):/data:ro \
		-v "$$DEST_DIR":/backup \
		docker.io/library/alpine:latest \
		tar czf "/backup/$$BASENAME.tar.gz" -C /data .; \
	TAR_EXIT=$$?; \
	$(DOCKER_COMPOSE) start pg; \
	if [ $$TAR_EXIT -ne 0 ]; then \
		echo "❌ Backup failed!"; \
		rm -f "$$BACKUP_FILE"; \
		exit 1; \
	fi; \
	TIMEOUT=30; COUNT=0; \
	while [ $$COUNT -lt $$TIMEOUT ]; do \
		if pg_isready -h 127.0.0.1 -p $(DB_PORT_DYNAMIC) -U postgres > /dev/null 2>&1; then \
			echo "✅ PostgreSQL is ready!"; \
			break; \
		fi; \
		sleep 1; COUNT=$$((COUNT + 1)); \
	done; \
	SIZE=$$(du -h "$$BACKUP_FILE" | cut -f1); \
	echo "✅ Backup complete!"; \
	echo "   File : $$BACKUP_FILE"; \
	echo "   Size : $$SIZE"
endef

db-backup:
	$(call create_db_snapshot,$(BRANCH_AUTO_DIR),$$(date +%Y-%m-%d_%H%M%S))
	@# auto バックアップのローテーション（20件超過分を FIFO 削除）
	@TOTAL=$$(ls $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null | wc -l); \
	EXCESS=$$((TOTAL - $(BACKUP_KEEP))); \
	if [ $$EXCESS -gt 0 ]; then \
		DELETE_LIST=$$(ls -1t $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null | tail -n $$EXCESS); \
		for F in $$DELETE_LIST; do rm -f "$$F"; done; \
		echo "🗑️  Rotated $$EXCESS old auto backup(s) (keep=$(BACKUP_KEEP))"; \
	fi; \
	TOTAL_AFTER=$$(ls $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null | wc -l); \
	echo "   Total: $$TOTAL_AFTER auto backup(s) in $(BRANCH_AUTO_DIR)"

db-backup-named:
	@if [ -z "$(NAME)" ]; then \
		echo "❌ NAME is required (usage: make db-backup-named NAME=<slug>)"; \
		exit 1; \
	fi
	@# NAME バリデーション（英数字・アンダースコア・ハイフンのみ許可）
	@echo "$(NAME)" | grep -qE '^[a-zA-Z0-9_-]+$$' || { \
		echo "❌ NAME must match [a-zA-Z0-9_-]+ (got: $(NAME))"; \
		exit 1; \
	}
	$(call create_db_snapshot,$(NAMED_DIR),$(NAME)__$$(date +%Y-%m-%d_%H%M%S))
	@echo "   Named: $(NAME) (永続保存、ローテーション対象外)"

db-backup-list:
	@# auto (自ブランチ) と named (共有) を統合表示
	@AUTO_FILES=$$(ls -1t $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null); \
	NAMED_FILES=$$(ls -1t $(NAMED_DIR)/*.tar.gz 2>/dev/null); \
	if [ -z "$$AUTO_FILES" ] && [ -z "$$NAMED_FILES" ]; then \
		echo "No backups found."; \
		echo "  AUTO : $(BRANCH_AUTO_DIR)"; \
		echo "  NAMED: $(NAMED_DIR)"; \
		exit 0; \
	fi; \
	echo "Available backups:"; \
	echo ""; \
	if [ -n "$$AUTO_FILES" ]; then \
		echo "  [AUTO] $(BRANCH_AUTO_DIR)/"; \
		echo "$$AUTO_FILES" | awk -v dir="$(BRANCH_AUTO_DIR)/" 'BEGIN{i=1} { \
			f=$$0; sub(dir,"",f); sub(/\.tar\.gz$$/,"",f); \
			cmd="du -h " $$0 " | cut -f1"; cmd | getline sz; close(cmd); \
			printf "    %d) %-40s [%s]\n", i++, f, sz \
		}'; \
		echo ""; \
	fi; \
	if [ -n "$$NAMED_FILES" ]; then \
		echo "  [NAMED] $(NAMED_DIR)/"; \
		echo "$$NAMED_FILES" | awk -v dir="$(NAMED_DIR)/" 'BEGIN{i=1} { \
			f=$$0; sub(dir,"",f); sub(/\.tar\.gz$$/,"",f); \
			cmd="du -h " $$0 " | cut -f1"; cmd | getline sz; close(cmd); \
			printf "    N%d) %-40s [%s]\n", i++, f, sz \
		}'; \
		echo ""; \
	fi; \
	AUTO_COUNT=$$(echo "$$AUTO_FILES" | grep -c .); \
	NAMED_COUNT=$$(echo "$$NAMED_FILES" | grep -c .); \
	echo "Total: $$AUTO_COUNT auto + $$NAMED_COUNT named"

db-restore:
	@if [ -n "$(BACKUP)" ]; then \
		FILE="$(BACKUP)"; \
		if [ ! -f "$$FILE" ]; then \
			echo "❌ File not found: $$FILE"; \
			exit 1; \
		fi; \
		BASENAME=$$(basename "$$FILE"); \
		FILEDIR=$$(dirname "$$FILE"); \
		echo "📦 Restoring from: $$BASENAME"; \
		printf "⚠️  This will REPLACE the current database volume. Continue? (y/N): "; \
		read CONFIRM; \
		if [ "$$CONFIRM" != "y" ] && [ "$$CONFIRM" != "Y" ]; then \
			echo "🔄 Cancelled."; \
			exit 0; \
		fi; \
	else \
		AUTO_FILES=$$(ls -1t $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null); \
		NAMED_FILES=$$(ls -1t $(NAMED_DIR)/*.tar.gz 2>/dev/null); \
		if [ -z "$$AUTO_FILES" ] && [ -z "$$NAMED_FILES" ]; then \
			echo "❌ No backups found."; \
			echo "  AUTO : $(BRANCH_AUTO_DIR)"; \
			echo "  NAMED: $(NAMED_DIR)"; \
			exit 1; \
		fi; \
		echo "Available backups:"; \
		echo ""; \
		if [ -n "$$AUTO_FILES" ]; then \
			echo "  [AUTO]"; \
			echo "$$AUTO_FILES" | awk -v dir="$(BRANCH_AUTO_DIR)/" 'BEGIN{i=1} { \
				f=$$0; sub(dir,"",f); sub(/\.tar\.gz$$/,"",f); \
				cmd="du -h " $$0 " | cut -f1"; cmd | getline sz; close(cmd); \
				printf "    %d) %-40s [%s]\n", i++, f, sz \
			}'; \
			echo ""; \
		fi; \
		if [ -n "$$NAMED_FILES" ]; then \
			echo "  [NAMED]"; \
			echo "$$NAMED_FILES" | awk -v dir="$(NAMED_DIR)/" 'BEGIN{i=1} { \
				f=$$0; sub(dir,"",f); sub(/\.tar\.gz$$/,"",f); \
				cmd="du -h " $$0 " | cut -f1"; cmd | getline sz; close(cmd); \
				printf "    N%d) %-40s [%s]\n", i++, f, sz \
			}'; \
			echo ""; \
		fi; \
		echo "  AUTO 選択 → 数字 (例: 1)"; \
		echo "  NAMED 選択 → N+数字 (例: N1)"; \
		printf "Select backup (q to cancel): "; \
		read SEL; \
		if [ "$$SEL" = "q" ] || [ "$$SEL" = "Q" ]; then \
			echo "🔄 Cancelled."; \
			exit 0; \
		fi; \
		case "$$SEL" in \
			N[0-9]*) \
				IDX=$$(echo "$$SEL" | sed 's/^N//'); \
				FILE=$$(echo "$$NAMED_FILES" | sed -n "$${IDX}p"); \
				;; \
			[0-9]*) \
				FILE=$$(echo "$$AUTO_FILES" | sed -n "$${SEL}p"); \
				;; \
			*) \
				echo "❌ Invalid selection: $$SEL"; \
				exit 1; \
				;; \
		esac; \
		if [ -z "$$FILE" ]; then \
			echo "❌ Invalid selection: $$SEL"; \
			exit 1; \
		fi; \
		BASENAME=$$(basename "$$FILE"); \
		FILEDIR=$$(dirname "$$FILE"); \
		echo ""; \
		echo "Selected: $$BASENAME"; \
		printf "⚠️  This will REPLACE the current database volume. Continue? (y/N): "; \
		read CONFIRM; \
		if [ "$$CONFIRM" != "y" ] && [ "$$CONFIRM" != "Y" ]; then \
			echo "🔄 Cancelled."; \
			exit 0; \
		fi; \
	fi; \
	echo "🔄 Stopping PostgreSQL..."; \
	$(DOCKER_COMPOSE) stop pg; \
	echo "🔄 Restoring volume snapshot..."; \
	docker run --rm \
		-v $(VOLUME_NAME):/data \
		-v "$$FILEDIR":/backup \
		docker.io/library/alpine:latest \
		sh -c "rm -rf /data/* && tar xzf \"/backup/$$BASENAME\" -C /data"; \
	RESTORE_EXIT=$$?; \
	echo "🔄 Starting PostgreSQL..."; \
	$(DOCKER_COMPOSE) start pg; \
	if [ $$RESTORE_EXIT -ne 0 ]; then \
		echo "❌ Restore failed!"; \
		exit 1; \
	fi; \
	TIMEOUT=30; COUNT=0; \
	while [ $$COUNT -lt $$TIMEOUT ]; do \
		if pg_isready -h 127.0.0.1 -p $(DB_PORT_DYNAMIC) -U postgres > /dev/null 2>&1; then \
			echo "✅ PostgreSQL is ready!"; \
			break; \
		fi; \
		sleep 1; COUNT=$$((COUNT + 1)); \
	done; \
	echo "✅ Database restored from: $$BASENAME"

db-backup-clean:
	@# auto のみ対象、named は削除しない
	@if ! ls $(BRANCH_AUTO_DIR)/*.tar.gz > /dev/null 2>&1; then \
		echo "No auto backups found in $(BRANCH_AUTO_DIR)"; \
		exit 0; \
	fi; \
	TOTAL=$$(ls $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null | wc -l); \
	EXCESS=$$((TOTAL - $(BACKUP_KEEP))); \
	if [ $$EXCESS -le 0 ]; then \
		echo "No old backups to clean ($$TOTAL auto backup(s), keep=$(BACKUP_KEEP))"; \
		echo "ℹ️  named backups are never cleaned"; \
		exit 0; \
	fi; \
	echo "🔄 Found $$TOTAL auto backup(s), keeping $(BACKUP_KEEP), will delete $$EXCESS old backup(s):"; \
	echo ""; \
	DELETE_LIST=$$(ls -1t $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null | tail -n $$EXCESS); \
	for F in $$DELETE_LIST; do \
		SIZE=$$(du -h "$$F" | cut -f1); \
		echo "   ❌ $$(basename $$F)  [$$SIZE]"; \
	done; \
	echo ""; \
	printf "Delete $$EXCESS old auto backup(s)? (y/N): "; \
	read CONFIRM; \
	if [ "$$CONFIRM" != "y" ] && [ "$$CONFIRM" != "Y" ]; then \
		echo "🔄 Cancelled."; \
		exit 0; \
	fi; \
	for F in $$DELETE_LIST; do \
		rm -f "$$F"; \
		echo "🗑️  Deleted: $$(basename $$F)"; \
	done; \
	echo "✅ Cleaned $$EXCESS old auto backup(s). Remaining: $$(ls $(BRANCH_AUTO_DIR)/*.tar.gz 2>/dev/null | wc -l) auto backup(s)"

# === worktree 作成時の自動復元 ===
# 条件: worktree != main && SKIP_AUTO_RESTORE != 1 && volume 未作成 && parent backup あり
auto-restore-if-fresh:
	@set -e; \
	if [ "$(WORKTREE_ID)" = "main" ]; then \
		exit 0; \
	fi; \
	if [ "$(SKIP_AUTO_RESTORE)" = "1" ]; then \
		echo "ℹ️  SKIP_AUTO_RESTORE=1 set, skip parent restore"; \
		exit 0; \
	fi; \
	if docker volume inspect $(VOLUME_NAME) > /dev/null 2>&1; then \
		echo "ℹ️  Volume $(VOLUME_NAME) exists, skip parent restore"; \
		exit 0; \
	fi; \
	if [ ! -d "$(PARENT_AUTO_DIR)" ] || ! ls $(PARENT_AUTO_DIR)/*.tar.gz > /dev/null 2>&1; then \
		echo "ℹ️  No parent backup found in $(PARENT_AUTO_DIR), skip parent restore"; \
		exit 0; \
	fi; \
	LATEST=$$(ls -1t $(PARENT_AUTO_DIR)/*.tar.gz | head -1); \
	BASENAME=$$(basename "$$LATEST"); \
	SIZE=$$(du -h "$$LATEST" | cut -f1); \
	echo "📦 Restoring parent snapshot: $$BASENAME [$$SIZE]"; \
	docker volume create $(VOLUME_NAME) > /dev/null; \
	if ! docker run --rm \
		-v $(VOLUME_NAME):/data \
		-v $(PARENT_AUTO_DIR):/backup:ro \
		docker.io/library/alpine:latest \
		sh -c "tar xzf \"/backup/$$BASENAME\" -C /data"; then \
		echo "❌ Parent restore failed!"; \
		docker volume rm $(VOLUME_NAME) > /dev/null 2>&1 || true; \
		exit 1; \
	fi; \
	echo "✅ Parent snapshot restored into $(VOLUME_NAME)"

up-fresh:
	@# auto-restore をスキップして空 DB から起動（SKIP_AUTO_RESTORE=1 make up と等価）
	@SKIP_AUTO_RESTORE=1 $(MAKE) up

traefik-rebuild-cmd:
	@# DB_PORT_RANGE_SIZE 変更時に Traefik コンテナを再作成するコマンドを生成。
	@# 既存 traefik コンテナを停止・削除して新 entrypoint 範囲で起動し直す必要がある。
	@# 実行中の全 worktree が 2-3 秒中断する点に注意。
	@RANGE_END=$$(($(DB_PORT_RANGE_START) + $(DB_PORT_RANGE_SIZE) - 1)); \
	echo "# Traefik 再作成コマンド (range: $(DB_PORT_RANGE_START)-$$RANGE_END / size $(DB_PORT_RANGE_SIZE))"; \
	echo "# ⚠️ 実行中: docker rm hook ブロックのためユーザー手動実行必須"; \
	echo "# ⚠️ 影響: 他 worktree の HTTP/TCP routing が 2-3 秒中断"; \
	echo ""; \
	echo "docker rm -f traefik"; \
	echo ""; \
	echo "PG_ARGS=\"\""; \
	echo "for p in \$$(seq $(DB_PORT_RANGE_START) $$RANGE_END); do"; \
	echo "  PG_ARGS=\"\$$PG_ARGS --entrypoints.pg-\$$p.address=:\$$p\""; \
	echo "done"; \
	echo ""; \
	echo "docker run -d --name traefik --network traefik --restart always \\"; \
	echo "  -p 80:80 -p 8080:8080 \\"; \
	echo "  -p $(DB_PORT_RANGE_START)-$$RANGE_END:$(DB_PORT_RANGE_START)-$$RANGE_END \\"; \
	echo "  -v /var/run/docker.sock:/var/run/docker.sock \\"; \
	echo "  traefik:v3.6.10 \\"; \
	echo "  --api.dashboard=true --api.insecure=true \\"; \
	echo "  --entrypoints.web.address=:80 \\"; \
	echo "  \$$PG_ARGS \\"; \
	echo "  --providers.docker=true --providers.docker.exposedByDefault=false"

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
	@echo "   - pre-push: Run check with 'pnpm check'"
