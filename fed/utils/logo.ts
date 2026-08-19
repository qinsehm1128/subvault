export function websiteHost(website?: string): string {
  if (!website) return '';
  let raw = website.trim().toLowerCase();
  raw = raw.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const cut = raw.search(/[/?]/);
  if (cut >= 0) raw = raw.slice(0, cut);
  return raw;
}

export function logoUrl(website?: string): string {
  const host = websiteHost(website);
  if (!host) return '';
  return `https://icons.duckduckgo.com/ip3/${host}.ico`;
}
