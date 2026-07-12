'use client';

import {App} from 'antd';
import {useLocale} from 'next-intl';
import {useCallback} from 'react';

export interface GeneratedCopyContent {
  title: string;
  content: string;
  tags: string[];
  coverText?: string | null;
}

interface UseCopyGeneratedContentOptions {
  successMessage?: string;
  errorMessage?: string;
}

export function useCopyGeneratedContent(options: UseCopyGeneratedContentOptions = {}) {
  const {message} = App.useApp();
  const locale = useLocale();
  const isEn = locale === 'en';

  return useCallback(async (content: GeneratedCopyContent) => {
    const coverLabel = isEn ? 'Cover text' : '封面文字';
    const plainText = formatGeneratedContentPlainText(content, coverLabel);

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([formatGeneratedContentHtml(content, coverLabel)], {type: 'text/html'}),
              'text/plain': new Blob([plainText], {type: 'text/plain'}),
            }),
          ]);
          message.success(options.successMessage ?? (isEn ? 'Copied to clipboard!' : '已复制文案！'));
          return;
        } catch {
          // Some browsers expose ClipboardItem but reject rich clipboard writes.
        }
      }

      await copyPlainText(plainText);
      message.success(options.successMessage ?? (isEn ? 'Copied to clipboard!' : '已复制文案！'));
    } catch {
      message.error(options.errorMessage ?? (isEn ? 'Failed to copy' : '复制失败'));
    }
  }, [isEn, message, options.errorMessage, options.successMessage]);
}

export function formatTagText(tag: string) {
  const value = tag.trim();
  if (!value) {
    return '';
  }

  return value.startsWith('#') ? value : `#${value}`;
}

function formatGeneratedContentPlainText(content: GeneratedCopyContent, coverLabel: string) {
  return [
    content.coverText ? `${coverLabel}：${content.coverText}` : null,
    content.title,
    content.content,
    content.tags.length > 0 ? content.tags.map(formatTagText).join(' ') : null,
  ].filter(Boolean).join('\n\n');
}

function formatGeneratedContentHtml(content: GeneratedCopyContent, coverLabel: string) {
  const tags = content.tags.map((tag) => {
    const text = escapeHtml(formatTagText(tag));
    return `<span style="display:inline-block;margin:0 8px 8px 0;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;font-size:14px;font-weight:600;">${text}</span>`;
  }).join('');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#0f172a;line-height:1.8;">
      ${content.coverText ? `<p style="margin:0 0 12px;color:#2563eb;font-size:16px;font-weight:700;">${escapeHtml(coverLabel)}：${escapeHtml(content.coverText)}</p>` : ''}
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:800;line-height:1.35;">${escapeHtml(content.title)}</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:15px;white-space:pre-wrap;">${escapeHtml(content.content)}</p>
      <p style="margin:0;">${tags}</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function copyPlainText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Continue to the legacy fallback for browsers without clipboard permission.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Clipboard copy failed');
  }
}
