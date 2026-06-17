import type { NetworkDevice } from '../types';

// Strings that appear in camera HTTP responses / headers
const CAMERA_SIGNATURES = [
  'hikvision',
  'dahua',
  'axis',
  'foscam',
  'amcrest',
  'reolink',
  'lorex',
  'wisenet',
  'hanwha',
  'bosch',
  'pelco',
  'vivotek',
  'avigilon',
  'ipcam',
  'netcam',
  'ip camera',
  'webcam',
  'ipcamera',
  'cgi-bin/guestimage',
  'videoserver',
  'dvr',
  'nvr',
  'camera',
  'surveillance',
  'mjpg',
  'mjpeg',
  'onvif',
] as const;

// Ports commonly opened by IP cameras / DVRs / NVRs
const CAMERA_PORTS = [80, 554, 8080, 8554, 81, 8081, 8888, 443, 9000, 37777] as const;

interface ProbeResult {
  ip: string;
  port: number;
  status: number;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
}

async function probeHost(ip: string, port: number, timeoutMs = 1200): Promise<ProbeResult | null> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`http://${ip}:${port}/`, {
      signal: controller.signal,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(t);

    const headers: Record<string, string> = {};
    res.headers.forEach((v: string, k: string) => {
      headers[k] = v;
    });

    let body = '';
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }

    return {
      ip,
      port,
      status: res.status,
      headers,
      body: body.slice(0, 3000),
      responseTimeMs: Date.now() - start,
    };
  } catch {
    return null;
  }
}

function fingerprint(r: ProbeResult): {
  isCamera: boolean;
  confidence: number;
  cameraType: NetworkDevice['cameraType'];
} {
  const haystack = [...Object.values(r.headers), r.body].join(' ').toLowerCase();

  let confidence = 0;
  let cameraType: NetworkDevice['cameraType'] = 'unknown';

  for (const sig of CAMERA_SIGNATURES) {
    if (haystack.includes(sig)) {
      confidence += sig === 'dvr' || sig === 'nvr' ? 25 : 18;
      if (sig === 'dvr') cameraType = 'dvr';
      else if (sig === 'nvr') cameraType = 'nvr';
      else if (cameraType === 'unknown') cameraType = 'ip_camera';
    }
  }

  // RTSP port is a strong camera signal
  if (r.port === 554 || r.port === 8554) confidence += 20;
  // Device responded — adds a baseline signal
  if (r.status > 0) confidence += 5;

  return {
    isCamera: confidence >= 22,
    confidence: Math.min(100, confidence),
    cameraType,
  };
}

// NOTE[P1]: Replace with react-native-wifi-reborn to get real local IP
function inferSubnet(): string {
  return '192.168.1';
}

export async function scanNetwork(
  onProgress: (scanned: number, total: number) => void,
  onDevice: (device: NetworkDevice) => void,
  signal?: AbortSignal,
): Promise<NetworkDevice[]> {
  const subnet = inferSubnet();
  const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
  const found: NetworkDevice[] = [];
  const BATCH = 16; // concurrent probes

  for (let i = 0; i < ips.length; i += BATCH) {
    if (signal?.aborted) break;

    const batch = ips.slice(i, i + BATCH);
    const probes = await Promise.all(
      batch.flatMap((ip) => CAMERA_PORTS.map((port) => probeHost(ip, port))),
    );

    for (const result of probes) {
      if (!result) continue;
      const fp = fingerprint(result);
      const existing = found.find((d) => d.ip === result.ip);

      if (existing) {
        if (!existing.openPorts.includes(result.port)) {
          existing.openPorts.push(result.port);
        }
        existing.confidence = Math.max(existing.confidence, fp.confidence);
        if (fp.isCamera) existing.isCamera = true;
        if (fp.cameraType !== 'unknown') existing.cameraType = fp.cameraType;
        existing.lastSeen = Date.now();
      } else {
        const device: NetworkDevice = {
          id: `net-${result.ip}`,
          ip: result.ip,
          openPorts: [result.port],
          isCamera: fp.isCamera,
          cameraType: fp.cameraType,
          responseTimeMs: result.responseTimeMs,
          confidence: fp.confidence,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
        };
        found.push(device);
        onDevice(device);
      }
    }

    onProgress(Math.min(i + BATCH, ips.length), ips.length);
  }

  return found;
}
