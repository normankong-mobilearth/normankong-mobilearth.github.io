const MAX_CHARS = 256;

export function parseDestination(raw: string): { ok: true; href: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste an http:// or https:// link to plant a park." };
  }
  if (trimmed.length > MAX_CHARS) {
    return { ok: false, error: "That link is too long for a reliable scannable park." };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: "Use a full http:// or https:// address." };
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "Only http and https links can be planted." };
    }
    if (!url.hostname) {
      return { ok: false, error: "That address is missing a host name." };
    }
    return { ok: true, href: url.href };
  } catch {
    return { ok: false, error: "That does not look like a valid URL." };
  }
}

export function hostLabel(href: string): string {
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return href;
  }
}
