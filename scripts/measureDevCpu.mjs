#!/usr/bin/env node
// dev サーバーのプロセス別 CPU/メモリ推移を計測する。
// 使用例: node scripts/measureDevCpu.mjs --duration=60 --interval=5 --out=.measure/dev-cpu.csv
//
// 出力 CSV カラム:
//   timestamp,elapsed_sec,pid,label,pcpu,pmem,rss_kb,command
//
// 対象プロセス（command 文字列に含むキーワードでフィルタ）:
//   - next-server / next dev / next-router-worker
//   - prisma generate (--sql --watch)
//   - prisma studio
//   - portless (HTTP/WebSocket proxy)
//   - tsserver / TypeScript Server (任意)
//
// macOS BSD ps を前提（-axo 構文）。GNU ps では動作しない。

import { spawnSync } from 'node:child_process';
import { mkdirSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function parseArgs() {
  const args = {
    duration: 60,
    interval: 5,
    out: '.measure/dev-cpu.csv',
    rootPid: null,
  };
  for (const raw of process.argv.slice(2)) {
    const [k, v] = raw.replace(/^--/, '').split('=');
    if (k === 'duration') args.duration = Number(v);
    else if (k === 'interval') args.interval = Number(v);
    else if (k === 'out') args.out = v;
    else if (k === 'root-pid') args.rootPid = Number(v);
  }
  if (!Number.isFinite(args.duration) || args.duration <= 0) {
    throw new Error(`invalid --duration: ${args.duration}`);
  }
  if (!Number.isFinite(args.interval) || args.interval <= 0) {
    throw new Error(`invalid --interval: ${args.interval}`);
  }
  return args;
}

function classifyProcess(command) {
  if (/next-router-worker/.test(command)) return 'next-router-worker';
  if (/next-server/.test(command)) return 'next-server';
  if (/next dev|node .*\bnext\b.*\bdev\b/.test(command)) return 'next-dev-cli';
  if (/prisma generate.*--sql.*--watch|prisma generate.*--watch/.test(command))
    return 'prisma-generate-watch';
  if (/prisma studio/.test(command)) return 'prisma-studio';
  if (/prisma/.test(command) && /generate|migrate/.test(command))
    return 'prisma-other';
  if (/portless/.test(command)) return 'portless';
  if (/tsserver|TypeScript/.test(command)) return 'tsserver';
  return null;
}

function buildPidTree() {
  const result = spawnSync('ps', ['-axo', 'pid=,ppid='], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`ps (ppid) failed: ${result.stderr}`);
  }
  const childrenOf = new Map();
  for (const line of result.stdout.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+)$/);
    if (!m) continue;
    const pid = Number(m[1]);
    const ppid = Number(m[2]);
    if (!childrenOf.has(ppid)) childrenOf.set(ppid, []);
    childrenOf.get(ppid).push(pid);
  }
  return childrenOf;
}

function descendantsOf(rootPid) {
  if (!rootPid) return null;
  const children = buildPidTree();
  const seen = new Set([rootPid]);
  const stack = [rootPid];
  while (stack.length) {
    const cur = stack.pop();
    const kids = children.get(cur);
    if (!kids) continue;
    for (const k of kids) {
      if (!seen.has(k)) {
        seen.add(k);
        stack.push(k);
      }
    }
  }
  return seen;
}

function snapshotPs(scopePidSet) {
  const result = spawnSync(
    'ps',
    ['-axo', 'pid=,pcpu=,pmem=,rss=,command='],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`ps failed: ${result.stderr}`);
  }
  const rows = [];
  for (const line of result.stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(.*)$/);
    if (!match) continue;
    const [, pid, pcpu, pmem, rss, command] = match;
    const pidNum = Number(pid);
    if (scopePidSet && !scopePidSet.has(pidNum)) continue;
    const label = classifyProcess(command);
    if (!label) continue;
    rows.push({
      pid: pidNum,
      pcpu: Number(pcpu),
      pmem: Number(pmem),
      rss: Number(rss),
      label,
      command: command.replace(/"/g, "'").slice(0, 240),
    });
  }
  return rows;
}

function csvEscape(value) {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const args = parseArgs();
  const outDir = dirname(args.out);
  if (outDir && !existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  const header = 'timestamp,elapsed_sec,pid,label,pcpu,pmem,rss_kb,command\n';
  if (!existsSync(args.out)) {
    writeFileSync(args.out, header);
  } else {
    appendFileSync(args.out, '\n# new run ' + new Date().toISOString() + '\n');
    appendFileSync(args.out, header);
  }

  const startedAt = Date.now();
  const endAt = startedAt + args.duration * 60_000;
  const intervalMs = args.interval * 1000;
  let lastSummaryMin = -1;
  const summaryBuckets = new Map(); // label -> {sumPcpu, samples, lastRssKb}

  console.log(
    `[measureDevCpu] duration=${args.duration}min interval=${args.interval}s out=${args.out} root-pid=${args.rootPid ?? '(none, all processes)'}`,
  );
  if (!args.rootPid) {
    console.warn(
      '[measureDevCpu] WARNING: --root-pid 未指定。他プロジェクトの next-server / prisma も計測対象に含まれます。worktree隔離計測の場合は make dev の PID を渡すこと。',
    );
  }

  while (Date.now() < endAt) {
    const tickStart = Date.now();
    const elapsedSec = Math.round((tickStart - startedAt) / 1000);
    const ts = new Date(tickStart).toISOString();
    let rows = [];
    try {
      const scope = args.rootPid ? descendantsOf(args.rootPid) : null;
      rows = snapshotPs(scope);
    } catch (err) {
      console.error(`[measureDevCpu] ps error: ${err.message}`);
    }
    if (rows.length === 0) {
      appendFileSync(
        args.out,
        `${ts},${elapsedSec},,,,,,no-target-process\n`,
      );
    } else {
      const lines = rows.map((r) =>
        [
          ts,
          elapsedSec,
          r.pid,
          r.label,
          r.pcpu,
          r.pmem,
          r.rss,
          csvEscape(r.command),
        ].join(','),
      );
      appendFileSync(args.out, lines.join('\n') + '\n');
      for (const r of rows) {
        const b = summaryBuckets.get(r.label) ?? {
          sumPcpu: 0,
          samples: 0,
          lastRssKb: 0,
        };
        b.sumPcpu += r.pcpu;
        b.samples += 1;
        b.lastRssKb = r.rss;
        summaryBuckets.set(r.label, b);
      }
    }

    // 1分ごとサマリ標準出力
    const minutes = Math.floor(elapsedSec / 60);
    if (minutes !== lastSummaryMin) {
      lastSummaryMin = minutes;
      const parts = [];
      for (const [label, b] of summaryBuckets.entries()) {
        const avg = b.samples ? (b.sumPcpu / b.samples).toFixed(1) : '0.0';
        const rssMb = (b.lastRssKb / 1024).toFixed(0);
        parts.push(`${label}=${avg}%(rss${rssMb}MB)`);
      }
      console.log(
        `[${new Date().toISOString()}] elapsed=${minutes}m ${parts.join(' ')}`,
      );
    }

    const drift = Date.now() - tickStart;
    const sleepMs = Math.max(0, intervalMs - drift);
    await new Promise((r) => setTimeout(r, sleepMs));
  }

  // 最終サマリ
  console.log('[measureDevCpu] done. final summary:');
  for (const [label, b] of summaryBuckets.entries()) {
    const avg = b.samples ? (b.sumPcpu / b.samples).toFixed(1) : '0.0';
    console.log(
      `  ${label}: avg_pcpu=${avg}% samples=${b.samples} last_rss=${(b.lastRssKb / 1024).toFixed(0)}MB`,
    );
  }
  console.log(`[measureDevCpu] csv saved: ${args.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
