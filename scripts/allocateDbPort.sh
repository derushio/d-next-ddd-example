#!/bin/sh
# DB ポートを Traefik listen 範囲内から動的に割当てる。
#
# 設計:
#   1. ハッシュで初期候補を算出（PROJECT_BASE-WORKTREE_ID）
#      → 同一プロジェクト＋同一ブランチ → 通常は常に同じポート（決定的）
#   2. 他プロジェクトが Traefik 上で使用中のポートを集計（自プロジェクトのコンテナは除外）
#   3. 候補が衝突していれば linear probing で範囲内の空きを探す
#   4. 範囲全部埋まっていればエラー終了（Traefik listen 範囲拡大が必要）
#
# 自プロジェクトの既存コンテナは docker compose up -d で recreate されるため、
# 古いラベルは即座に上書きされる → 自プロジェクトは「使用中」から除外すれば衝突しない。
#
# 出力: 標準出力に1行でポート番号
# 引数: PROJECT_BASE WORKTREE_ID RANGE_START RANGE_SIZE COMPOSE_PROJECT
set -eu

PROJECT_BASE=$1
WORKTREE_ID=$2
RANGE_START=$3
RANGE_SIZE=$4
COMPOSE_PROJECT=$5

# 1. ハッシュで初期候補
HASH=$(printf '%s' "${PROJECT_BASE}-${WORKTREE_ID}" | cksum | awk '{print $1}')
HASH_PORT=$((RANGE_START + (HASH % RANGE_SIZE)))

# 2. 他プロジェクトの使用中ポート集計（自プロジェクトは除外）
USED=$(docker ps \
    --filter "label=traefik.enable=true" \
    --format '{{.Label "com.docker.compose.project"}}|{{.Labels}}' 2>/dev/null |
    awk -v self="${COMPOSE_PROJECT}" -F'|' '$1 != self {print $2}' |
    grep -oE 'entrypoints=pg-[0-9]+' | sed 's/.*pg-//' | sort -u || true)

# 3. linear probing で空きポートを探す
i=0
while [ "${i}" -lt "${RANGE_SIZE}" ]; do
    CANDIDATE=$((RANGE_START + ((HASH_PORT - RANGE_START + i) % RANGE_SIZE)))
    if ! printf '%s\n' "${USED}" | grep -qx "${CANDIDATE}"; then
        echo "${CANDIDATE}"
        exit 0
    fi
    i=$((i + 1))
done

# 5. 全埋まり
RANGE_END=$((RANGE_START + RANGE_SIZE - 1))
echo "ERROR: No free DB port in Traefik listen range ${RANGE_START}-${RANGE_END}." >&2
echo "       Increase Traefik entrypoint range (see macos-dev-bootstrap)." >&2
exit 1
