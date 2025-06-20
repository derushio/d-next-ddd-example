#!/usr/bin/env tsx

import { chromium, type Browser, type Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Mermaid構文の検証
 * Playwrightを使ってmermaidの構文エラーをチェックします
 */

interface MermaidBlock {
  content: string;
  startLine: number;
  endLine: number;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
}

async function extractMermaidBlocks(filePath: string): Promise<MermaidBlock[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const mermaidBlocks: MermaidBlock[] = [];
  let inMermaidBlock = false;
  let currentBlock: string[] = [];
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '```mermaid') {
      inMermaidBlock = true;
      startLine = i + 1;
      currentBlock = [];
    } else if (line === '```' && inMermaidBlock) {
      inMermaidBlock = false;
      if (currentBlock.length > 0) {
        mermaidBlocks.push({
          content: currentBlock.join('\n'),
          startLine: startLine + 1,
          endLine: i + 1
        });
      }
    } else if (inMermaidBlock) {
      currentBlock.push(lines[i]); // 元の行をそのまま保持（インデント含む）
    }
  }

  return mermaidBlocks;
}

async function validateMermaidBlock(
  browser: Browser, 
  mermaidContent: string, 
  filePath: string, 
  blockInfo: MermaidBlock
): Promise<boolean> {
  const page: Page = await browser.newPage();
  
  try {
    // キャッシュ回避用のタイムスタンプを生成
    const cacheBuster = Date.now() + Math.random();
    
    // Mermaidの検証用HTMLページを作成
    const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/mermaid@10.9.1/dist/mermaid.min.js?v=${cacheBuster}"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .mermaid { max-width: 100%; }
  </style>
</head>
<body>
  <!-- Cache buster: ${cacheBuster} -->
  <div class="mermaid" id="mermaid-${cacheBuster}">
${mermaidContent}
  </div>
  <script>
    window.mermaidErrors = [];
    
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      logLevel: 'error',
      securityLevel: 'loose'
    });
    
    // エラーハンドリング
    window.addEventListener('error', (e) => {
      window.mermaidErrors.push(e.message);
    });
    
    // mermaidのレンダリング試行
    async function validateMermaid() {
      try {
        const element = document.getElementById('mermaid-${cacheBuster}');
        if (!element) throw new Error('Mermaid element not found');
        await mermaid.run({ nodes: [element] });
        return { success: true, errors: [] };
      } catch (error) {
        return { success: false, errors: [error.message] };
      }
    }
    
    // 検証実行
    validateMermaid().then(result => {
      window.validationResult = result;
    });
  </script>
</body>
</html>`;
    
    // キャッシュを無効化するヘッダーを設定
    await page.setExtraHTTPHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    await page.setContent(html);
    
    // 少し待ってからvalidationResultを取得
    await page.waitForTimeout(1000);
    
    const result = await page.evaluate((): ValidationResult => {
      return (window as any).validationResult || { success: false, errors: ['Timeout or initialization error'] };
    });
    
    const consoleErrors = await page.evaluate((): string[] => (window as any).mermaidErrors || []);
    
    if (!result.success || consoleErrors.length > 0) {
      const allErrors = [...(result.errors || []), ...consoleErrors];
      console.log(`❌ ERROR in ${filePath} (lines ${blockInfo.startLine}-${blockInfo.endLine}):`);
      allErrors.forEach(error => {
        console.log(`   ${error}`);
      });
      console.log(`   Mermaid content preview:`);
      console.log(`   ${mermaidContent.split('\n').slice(0, 3).join('\n   ')}...`);
      console.log(`   Raw content check (looking for resolve):`);
      console.log(`   Contains "resolve('": ${mermaidContent.includes("resolve('")}`);
      console.log(`   Contains "resolve&#40;&#39;": ${mermaidContent.includes("resolve&#40;&#39;")}`);
      console.log('');
      return false;
    } else {
      console.log(`✅ Valid: ${filePath} (lines ${blockInfo.startLine}-${blockInfo.endLine})`);
      return true;
    }
    
  } catch (error) {
    console.log(`❌ ERROR in ${filePath} (lines ${blockInfo.startLine}-${blockInfo.endLine}): ${(error as Error).message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files;
}

async function main(): Promise<void> {
  const docsDir = path.join(process.cwd(), '_DOCS');
  const args = process.argv.slice(2);
  const maxFiles = args.includes('--all') ? Infinity : 5;
  
  // 特定のファイルを指定する場合
  const specificFile = args.find(arg => arg.startsWith('--file='));
  const targetFile = specificFile ? specificFile.replace('--file=', '') : null;
  
  console.log('🔍 Mermaid Validation with Playwright\n');
  
  try {
    let markdownFiles = await findMarkdownFiles(docsDir);
    
    // 特定のファイルが指定された場合はそのファイルのみ検証
    if (targetFile) {
      markdownFiles = markdownFiles.filter(file => file.includes(targetFile));
      console.log(`Checking specific file pattern: ${targetFile}\n`);
    }
    
    const filesToCheck = targetFile ? markdownFiles : markdownFiles.slice(0, maxFiles);
    
    console.log(`Found ${markdownFiles.length} markdown files, checking first ${filesToCheck.length}...\n`);
    
    const browser = await chromium.launch();
    let totalErrors = 0;
    let totalBlocks = 0;
    
    for (const filePath of filesToCheck) {
      const mermaidBlocks = await extractMermaidBlocks(filePath);
      
      if (mermaidBlocks.length === 0) continue;
      
      console.log(`📄 Checking ${filePath} (${mermaidBlocks.length} mermaid blocks)`);
      
      for (const block of mermaidBlocks) {
        totalBlocks++;
        const isValid = await validateMermaidBlock(browser, block.content, filePath, block);
        if (!isValid) totalErrors++;
      }
    }
    
    await browser.close();
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total blocks checked: ${totalBlocks}`);
    console.log(`   Errors found: ${totalErrors}`);
    console.log(`   Success rate: ${totalBlocks > 0 ? Math.round((totalBlocks - totalErrors) / totalBlocks * 100) : 0}%`);
    
    if (totalErrors > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}