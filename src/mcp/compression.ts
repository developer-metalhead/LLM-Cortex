import crypto from "crypto";
import { estimateTokens } from "../knowledge/packer.js";

interface CacheEntry {
  hash: string;
  content: string;
  tokens: number;
  lastAccessed: number;
}

export class SessionCache {
  private cache = new Map<string, CacheEntry>();
  private currentTokens = 0;
  
  // Default budget of 256KB equivalent in tokens (rough approximation ~64k tokens)
  constructor(private maxTokens: number = 64000) {}

  public get(hash: string): string | undefined {
    const entry = this.cache.get(hash);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.content;
    }
    return undefined;
  }

  public put(hash: string, content: string): void {
    if (this.cache.has(hash)) return;

    const tokens = estimateTokens(content);
    
    // Evict if over budget
    while (this.currentTokens + tokens > this.maxTokens && this.cache.size > 0) {
      this.evictOldest();
    }

    if (tokens > this.maxTokens) return; // Too large to cache at all

    this.cache.set(hash, {
      hash,
      content,
      tokens,
      lastAccessed: Date.now()
    });
    this.currentTokens += tokens;
  }

  private evictOldest() {
    let oldest: CacheEntry | null = null;
    for (const entry of this.cache.values()) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = entry;
      }
    }
    if (oldest) {
      this.cache.delete(oldest.hash);
      this.currentTokens -= oldest.tokens;
    }
  }
}

const sessionCaches = new Map<string, SessionCache>();

export function getSessionCache(sessionId: string): SessionCache {
  if (!sessionCaches.has(sessionId)) {
    sessionCaches.set(sessionId, new SessionCache());
  }
  return sessionCaches.get(sessionId)!;
}

// Compresses string by finding large blocks (e.g. Markdown sections) and replacing with §ref:hash§
export function compressResponse(text: string, sessionId: string, enableCompression: boolean): string {
  if (!enableCompression) return text;
  const cache = getSessionCache(sessionId);

  // Split by double newline to find substantial blocks
  const blocks = text.split("\n\n");
  const result: string[] = [];
  
  for (const block of blocks) {
    if (block.length < 150) { // Don't cache very small blocks
      result.push(block);
      continue;
    }
    
    const hash = crypto.createHash("sha256").update(block).digest("hex").slice(0, 12);
    
    // If we've seen this exact block before, replace it with a reference
    if (cache.get(hash)) {
      result.push(`§ref:${hash}§`);
    } else {
      // First time seeing it, put in cache and emit original text
      cache.put(hash, block);
      result.push(block);
    }
  }

  return result.join("\n\n");
}

export function resolveRefs(refs: string[], sessionId: string): Record<string, string | null> {
  const cache = getSessionCache(sessionId);
  const result: Record<string, string | null> = {};
  for (const ref of refs) {
    const content = cache.get(ref);
    result[ref] = content ?? null;
  }
  return result;
}
