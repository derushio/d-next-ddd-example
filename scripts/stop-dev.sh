#!/bin/bash

# devサーバー・prisma studioを全て停止するスクリプト

echo "devサーバー・prisma studioを停止しています..."

# pnpm dev, next dev プロセスを停止
pkill -9 -f "pnpm dev" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null

# prisma studio プロセスを停止
pkill -9 -f "prisma studio" 2>/dev/null
pkill -9 -f "pnpm db:studio" 2>/dev/null

# npm-run-all プロセスを停止
pkill -9 -f "npm-run-all\|run-p" 2>/dev/null

# ポート停止関数（より堅牢）
kill_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -ti:$port 2>/dev/null | xargs -r kill -9 2>/dev/null
    else
        # lsofがない場合はssを使用（より互換性のある方法）
        local pid
        pid=$(ss -tlnp 2>/dev/null | awk -v port=":$port " '$4 == port {print $NF}' | grep -oE '[0-9]+' | head -1)
        if [ -n "$pid" ]; then
            kill -9 "$pid" 2>/dev/null
        fi
    fi
}

# ポート3000-3020 (Next.js dev server予備ポート) を停止
echo "ポート 3000-3020 を停止中..."
for port in {3000..3020}; do
    kill_port "$port"
done

# ポート5555-5575 (Prisma Studio予備ポート) を停止
echo "ポート 5555-5575 を停止中..."
for port in {5555..5575}; do
    kill_port "$port"
done

# プロセス終了を待つ
sleep 2

# ポート確認関数
check_ports_available() {
    local all_available=true

    if command -v lsof &> /dev/null; then
        # lsof使用時
        for port in {3000..3020} {5555..5575}; do
            if lsof -i :$port 2>/dev/null | grep -q LISTEN; then
                echo "⚠️  ポート $port はまだ使用されています"
                all_available=false
            fi
        done
    else
        # ss使用時
        for port in {3000..3020} {5555..5575}; do
            if ss -tlnp 2>/dev/null | grep -q ":$port "; then
                echo "⚠️  ポート $port はまだ使用されています"
                all_available=false
            fi
        done
    fi

    return $([ "$all_available" = true ] && echo 0 || echo 1)
}

# ポート確認
if check_ports_available; then
    echo "✓ すべてのdevサーバー・prisma studio（ポート3000-3020, 5555-5575）を停止しました"
    exit 0
else
    echo ""
    echo "✗ 一部のポートがまだ使用されています"
    exit 1
fi
