import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export function parseContent(content: string): string {
  // Convert hashtags to links
  let parsed = content.replace(
    /#(\w+)/g,
    '<a href="/hashtag/$1" class="text-primary hover:underline">#$1</a>'
  );
  
  // Convert mentions to links
  parsed = parsed.replace(
    /@(\w+)/g,
    '<a href="/profile/$1" class="text-primary hover:underline">@$1</a>'
  );
  
  // Convert URLs to links
  parsed = parsed.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
  );
  
  return parsed;
}

export function extractHashtags(content: string): string[] {
  const matches = content.match(/#(\w+)/g);
  return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
}

export function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g);
  return matches ? matches.map(mention => mention.substring(1).toLowerCase()) : [];
}
