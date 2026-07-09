import { BadRequestException } from '@nestjs/common';
import { isIP } from 'net';
import { lookup } from 'dns/promises';

function isPrivateAddress(address: string): boolean {
  if (address === '::1' || address.startsWith('fc') || address.startsWith('fd')) {
    return true;
  }
  if (address.startsWith('fe80:')) {
    return true;
  }
  const parts = address.split('.').map(Number);
  if (parts.length !== 4) {
    return false;
  }
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

export async function assertSafeWebhookUrl(
  rawUrl: string,
  options: { allowLocalUrls: boolean },
): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Endpoint URL is invalid');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new BadRequestException('Endpoint URL must be HTTP(S) without credentials');
  }
  if (options.allowLocalUrls) {
    return url.toString();
  }
  if (url.protocol !== 'https:') {
    throw new BadRequestException('Production endpoint URLs must use HTTPS');
  }

  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new BadRequestException('Private or loopback endpoint URLs are forbidden');
  }
  return url.toString();
}
