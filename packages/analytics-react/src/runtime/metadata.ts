import type { AnalyticsTrackClientMetadata, AnalyticsTrackMetadataConfig } from '../shared/types';

function detectOs(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android' as const;
  if (/iphone|ipad|ipod/.test(ua)) return 'ios' as const;
  if (/mac os x|macintosh/.test(ua)) return 'macos' as const;
  if (/windows nt/.test(ua)) return 'windows' as const;
  if (/linux/.test(ua)) return 'linux' as const;
  return 'unknown' as const;
}

function normalizeMetadataConfig(
  metadata: boolean | AnalyticsTrackMetadataConfig | undefined,
): AnalyticsTrackMetadataConfig | null {
  if (!metadata) return null;
  if (metadata === true) {
    return {
      enabled: true,
      includeIp: true,
      includeUserAgent: true,
      includeDevice: true,
      includeLanguage: true,
      includeScreen: true,
    };
  }

  return {
    enabled: metadata.enabled ?? true,
    includeIp: metadata.includeIp ?? true,
    includeUserAgent: metadata.includeUserAgent ?? true,
    includeDevice: metadata.includeDevice ?? true,
    includeLanguage: metadata.includeLanguage ?? true,
    includeScreen: metadata.includeScreen ?? true,
    staticIp: metadata.staticIp,
    resolveIp: metadata.resolveIp,
  };
}

export async function collectTrackClientMetadata(
  metadata: boolean | AnalyticsTrackMetadataConfig | undefined,
): Promise<AnalyticsTrackClientMetadata | undefined> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined;

  const config = normalizeMetadataConfig(metadata);
  if (!config || !config.enabled) return undefined;

  const userAgent = navigator.userAgent;
  const os = detectOs(userAgent);
  const isMobile = /iphone|ipad|ipod|android|mobile/.test(userAgent.toLowerCase());

  let ip: string | undefined;
  if (config.includeIp) {
    if (config.staticIp) {
      ip = config.staticIp;
    } else if (config.resolveIp) {
      ip = await config.resolveIp().catch(() => undefined);
    }
  }

  const metadataPayload: AnalyticsTrackClientMetadata = {
    ip,
    userAgent: config.includeUserAgent ? userAgent : undefined,
    isMobile: config.includeDevice ? isMobile : undefined,
    os: config.includeDevice ? os : undefined,
    platform: config.includeDevice ? navigator.platform : undefined,
    language: config.includeLanguage ? navigator.language : undefined,
    screen:
      config.includeScreen && window.screen
        ? {
            width: window.screen.width,
            height: window.screen.height,
          }
        : undefined,
  };

  const hasValue = Object.values(metadataPayload).some((value) => value !== undefined);
  return hasValue ? metadataPayload : undefined;
}
