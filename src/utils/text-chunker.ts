const MAX_CHARS = 2800;

/**
 * Split text into chunks that stay below MiniMax's non-streaming comfort zone.
 *
 * MiniMax T2A HTTP accepts up to 10,000 characters, but the docs recommend
 * streaming for texts over 3,000 characters. Raycast playback is simpler and
 * more reliable when we synthesize non-streaming chunks sequentially.
 */
export function chunkText(text: string, maxChars: number = MAX_CHARS): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (getCharLength(trimmed) <= maxChars) {
    return [trimmed];
  }

  const sentences = splitBySentence(trimmed);
  return groupChunks(sentences, maxChars);
}

export function getCharLength(text: string): number {
  return Array.from(text).length;
}

function splitBySentence(text: string): string[] {
  const parts = text.match(/[^。！？.!?\n]+[。！？.!?\n]*/g);
  if (!parts) {
    return [text];
  }
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function splitByClause(sentence: string): string[] {
  const parts = sentence.match(/[^，,、；;：:]+[，,、；;：:]*/g);
  if (!parts) {
    return [sentence];
  }
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function forceBreakByChar(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const char of Array.from(text)) {
    const test = current + char;
    if (getCharLength(test) > maxChars) {
      if (current) {
        chunks.push(current);
      }
      current = char;
    } else {
      current = test;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function groupChunks(parts: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const partLength = getCharLength(part);

    if (partLength > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      const clauses = splitByClause(part);
      const subChunks = groupClauseChunks(clauses, maxChars);
      chunks.push(...subChunks);
      continue;
    }

    const combined = current ? current + part : part;
    if (getCharLength(combined) > maxChars) {
      chunks.push(current);
      current = part;
    } else {
      current = combined;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

function groupClauseChunks(clauses: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const clause of clauses) {
    const clauseLength = getCharLength(clause);

    if (clauseLength > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...forceBreakByChar(clause, maxChars));
      continue;
    }

    const combined = current ? current + clause : clause;
    if (getCharLength(combined) > maxChars) {
      chunks.push(current);
      current = clause;
    } else {
      current = combined;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
