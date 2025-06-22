#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Mermaidブロック内の問題パターンを検出するスクリプト
 * 
 * 検出パターン:
 * - Result<T> (ダブルクォートで囲む必要)
 * - resolve() (ダブルクォートで囲む必要)
 * - @inject() (ダブルクォートで囲む必要)
 * - その他の HTML タグ形式
 * - 番号付きリスト記法 (1., 2., etc.) ※"Unsupported markdown: list"エラーの原因
 * - 箇条書きリスト記法 (-, *) ※"Unsupported markdown: list"エラーの原因
 * - 重複スタイル定義 (fill:...fill:...)
 * - HTMLエスケープされたコンテンツ (&#40;, &lt;, etc.) ※正しく表示されない
 */

interface MermaidBlock {
  content: string;
  startLine: number;
  endLine: number;
  filePath: string;
}

interface ValidationIssue {
  type: 'unescaped_angle_brackets' | 'unescaped_parentheses' | 'potential_html_tag' | 'unsupported_markdown_list' | 'duplicate_style' | 'html_escaped_content';
  message: string;
  line: number;
  pattern: string;
}

// 問題パターンの定義
const PROBLEMATIC_PATTERNS = [
  {
    pattern: /Result<T>/g,
    type: 'unescaped_angle_brackets' as const,
    suggestion: 'Wrap in quotes: "Result<T>"',
    description: 'Result<T> should be wrapped in double quotes to avoid parsing issues'
  },
  {
    pattern: /resolve\(\)/g,
    type: 'unescaped_parentheses' as const,
    suggestion: 'Wrap in quotes: "resolve()"',
    description: 'resolve() should be wrapped in double quotes to avoid parsing issues'
  },
  {
    pattern: /@inject\(\)/g,
    type: 'unescaped_parentheses' as const,
    suggestion: 'Wrap in quotes: "@inject()"',
    description: '@inject() should be wrapped in double quotes to avoid parsing issues'
  },
  {
    pattern: /<(?!br\/?>|\/br>|-->|--|\d+)[a-zA-Z][^>]*>/g,
    type: 'potential_html_tag' as const,
    suggestion: 'Use HTML entities',
    description: 'Potential problematic HTML tag detected - consider escaping'
  },
  {
    pattern: /\[(\d+\.\s+[^\]]+)\]/g,
    type: 'unsupported_markdown_list' as const,
    suggestion: 'Wrap entire content in double quotes',
    description: 'Numbered list pattern in Mermaid node (causes "Unsupported markdown: list" error)'
  },
  {
    pattern: /\[([-*]\s+[^\]]+)\]/g,
    type: 'unsupported_markdown_list' as const,
    suggestion: 'Wrap entire content in double quotes',
    description: 'Bullet list pattern in Mermaid node (causes "Unsupported markdown: list" error)'
  },
  {
    pattern: /style\s+\w+\s+fill:[^,\s]+[^,\s]*fill:[^,\s]+/g,
    type: 'duplicate_style' as const,
    suggestion: 'Remove duplicate style definitions',
    description: 'Duplicate fill style definition detected'
  },
  {
    pattern: /&#40;|&#41;|&lt;|&gt;|&amp;|&quot;/g,
    type: 'html_escaped_content' as const,
    suggestion: 'Replace HTML entities with normal characters and wrap in quotes',
    description: 'HTML escaped content detected - use normal characters with double quotes instead'
  }
];

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
          endLine: i + 1,
          filePath
        });
      }
    } else if (inMermaidBlock) {
      currentBlock.push(lines[i]);
    }
  }

  return mermaidBlocks;
}

function validateMermaidBlock(block: MermaidBlock): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = block.content.split('\n');

  lines.forEach((line, lineIndex) => {
    PROBLEMATIC_PATTERNS.forEach(({ pattern, type, suggestion, description }) => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let customSuggestion = suggestion;
          
          // 番号付きリストや箇条書きリストの場合、具体的な修正例を提示
          if (type === 'unsupported_markdown_list') {
            if (match.match(/\[(\d+\.\s+[^\]]+)\]/)) {
              customSuggestion = `Change ${match} to ${match.replace(/\[([^\]]+)\]/, '["$1"]')}`;
            } else if (match.match(/\[([-*]\s+[^\]]+)\]/)) {
              customSuggestion = `Change ${match} to ${match.replace(/\[([^\]]+)\]/, '["$1"]')}`;
            }
          }
          
          // HTMLエスケープの場合、具体的な修正例を提示
          if (type === 'html_escaped_content') {
            const decoded = match
              .replace(/&#40;/g, '(')
              .replace(/&#41;/g, ')')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"');
            customSuggestion = `Replace "${match}" with "${decoded}" (and wrap in quotes if needed)`;
          }
          
          issues.push({
            type,
            message: `${description}. Found: "${match}" → Suggest: "${customSuggestion}"`,
            line: block.startLine + lineIndex,
            pattern: match
          });
        });
      }
    });
  });

  return issues;
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
  const shouldFix = args.includes('--fix');
  
  console.log('🔍 Checking Mermaid patterns for potential issues (including "Unsupported markdown" errors and HTML escaping)\n');
  
  try {
    const markdownFiles = await findMarkdownFiles(docsDir);
    console.log(`Found ${markdownFiles.length} markdown files\n`);
    
    let totalIssues = 0;
    let totalBlocks = 0;
    const fileIssues: { [file: string]: ValidationIssue[] } = {};
    
    for (const filePath of markdownFiles) {
      const mermaidBlocks = await extractMermaidBlocks(filePath);
      
      if (mermaidBlocks.length === 0) continue;
      
      totalBlocks += mermaidBlocks.length;
      
      for (const block of mermaidBlocks) {
        const issues = validateMermaidBlock(block);
        if (issues.length > 0) {
          totalIssues += issues.length;
          if (!fileIssues[filePath]) {
            fileIssues[filePath] = [];
          }
          fileIssues[filePath].push(...issues);
        }
      }
    }
    
    // レポート出力
    if (totalIssues === 0) {
      console.log('✅ No issues found in mermaid blocks!');
    } else {
      console.log(`❌ Found ${totalIssues} potential issues in ${Object.keys(fileIssues).length} files:\n`);
      
      Object.entries(fileIssues).forEach(([file, issues]) => {
        console.log(`📄 ${file}:`);
        issues.forEach(issue => {
          console.log(`  Line ${issue.line}: ${issue.message}`);
        });
        console.log('');
      });
    }
    
    console.log(`📊 Summary:`);
    console.log(`   Total mermaid blocks: ${totalBlocks}`);
    console.log(`   Issues found: ${totalIssues}`);
    console.log(`   Files with issues: ${Object.keys(fileIssues).length}`);
    
    if (totalIssues > 0) {
      console.log('\n💡 Run with --fix flag to automatically fix common issues');
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