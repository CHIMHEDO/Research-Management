function normalizeKeywords(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const trimmed = value.trim();

  // Support JSON string array
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      // Fall through to comma/semicolon parsing
    }
  }

  return trimmed
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = { normalizeKeywords };