/**
 * eWeLink Cloud API Service — Using Official ewelink-api-next SDK
 * Controls smart switches via eWeLink Cloud (CoolKit Open Platform v2)
 *
 * Uses OAuth2.0 authorization code flow via official SDK:
 *   1. Generate auth URL → user authorizes in browser
 *   2. Callback receives code + region → exchange for access token
 *   3. Use access token to control devices
 */
import eWeLink from "ewelink-api-next";
import db from "./db.js";

export interface EwelinkCredentials {
  appId: string;
  appSecret: string;
  email?: string;
  password?: string;
  region: string;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp ms
  region: string;
}

// In-memory token cache
let cachedToken: TokenData | null = null;
// SDK client instance (reusable)
let sdkClient: any = null;

// ─── SDK Client ───────────────────────────────────────────

function getClient(creds: EwelinkCredentials): any {
  if (!sdkClient || sdkClient?._appId !== creds.appId) {
    sdkClient = new eWeLink.WebAPI({
      appId: creds.appId,
      appSecret: creds.appSecret,
      region: creds.region || "us",
    } as any);
    sdkClient._appId = creds.appId;
  }
  return sdkClient;
}

// ─── Persistent token storage ─────────────────────────────

function saveTokenToDB(token: TokenData): void {
  const upsert = db.prepare(`
    INSERT INTO system_config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    upsert.run("gate_ewelink_access_token", token.accessToken);
    upsert.run("gate_ewelink_refresh_token", token.refreshToken);
    upsert.run("gate_ewelink_token_expires", token.expiresAt.toString());
    upsert.run("gate_ewelink_token_region", token.region);
  });
  tx();
}

function loadTokenFromDB(): TokenData | null {
  try {
    const rows = db
      .prepare(`SELECT key, value FROM system_config WHERE key IN ('gate_ewelink_access_token', 'gate_ewelink_refresh_token', 'gate_ewelink_token_expires', 'gate_ewelink_token_region')`)
      .all() as { key: string; value: string }[];

    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    if (map.gate_ewelink_access_token && map.gate_ewelink_refresh_token) {
      return {
        accessToken: map.gate_ewelink_access_token,
        refreshToken: map.gate_ewelink_refresh_token,
        expiresAt: Number.parseInt(map.gate_ewelink_token_expires || "0"),
        region: map.gate_ewelink_token_region || "us",
      };
    }
  } catch (err) {
    console.error("Error loading eWeLink token from DB:", err);
  }
  return null;
}

// ─── OAuth2.0: Generate Authorization URL ─────────────────

export function generateOAuthUrl(
  creds: EwelinkCredentials,
  redirectUrl: string,
  state: string = "ewelink_auth"
): string {
  const client = getClient(creds);
  const url = client.oauth.createLoginUrl({
    redirectUrl,
    grantType: "authorization_code",
    state,
  });
  return url;
}

// ─── OAuth2.0: Exchange Code for Token ────────────────────

export async function exchangeCodeForToken(
  creds: EwelinkCredentials,
  code: string,
  redirectUrl: string,
  region?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getClient(creds);

    if (region && region !== creds.region) {
      client.region = region;
    }

    const res = await client.oauth.getToken({
      region: region || creds.region,
      redirectUrl,
      code,
    });

    console.log("eWeLink OAuth getToken response:", JSON.stringify(res));

    if (res.error && res.error !== 0) {
      return { success: false, error: `eWeLink OAuth failed: ${res.msg || JSON.stringify(res)}` };
    }

    const token: TokenData = {
      accessToken: res.data?.accessToken || res.accessToken || "",
      refreshToken: res.data?.refreshToken || res.refreshToken || "",
      expiresAt: res.data?.atExpiredTime || res.atExpiredTime || (Date.now() + 30 * 24 * 3600 * 1000),
      region: region || creds.region,
    };

    if (!token.accessToken) {
      return { success: false, error: `Token vazio na resposta: ${JSON.stringify(res)}` };
    }

    cachedToken = token;
    saveTokenToDB(token);

    client.at = token.accessToken;
    if (region) client.region = region;

    return { success: true };
  } catch (err: any) {
    console.error("exchangeCodeForToken error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// ─── Token management ─────────────────────────────────────

async function getAccessToken(creds: EwelinkCredentials): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    const client = getClient(creds);
    client.at = cachedToken.accessToken;
    return cachedToken.accessToken;
  }

  const dbToken = loadTokenFromDB();
  if (dbToken && dbToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    cachedToken = dbToken;
    const client = getClient(creds);
    client.at = dbToken.accessToken;
    return dbToken.accessToken;
  }

  if (dbToken?.refreshToken) {
    try {
      const client = getClient(creds);
      const res = await client.user.refresh({ rt: dbToken.refreshToken });
      if (res.error === 0 && res.data) {
        const newToken: TokenData = {
          accessToken: res.data.at,
          refreshToken: res.data.rt,
          expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
          region: dbToken.region || creds.region,
        };
        cachedToken = newToken;
        saveTokenToDB(newToken);
        return newToken.accessToken;
      }
    } catch (err) {
      console.error("Token refresh error:", err);
    }
  }

  throw new Error("Token eWeLink expirado. Refaça a autorização OAuth na aba Credenciais.");
}

// ─── Check if authorized ─────────────────────────────────

export function isOAuthAuthorized(): boolean {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return true;
  const dbToken = loadTokenFromDB();
  if (dbToken && dbToken.expiresAt > Date.now()) {
    cachedToken = dbToken;
    return true;
  }
  return false;
}

// ─── Device Control ───────────────────────────────────────

export async function toggleDevice(
  condominioId: number,
  creds: EwelinkCredentials,
  deviceId: string,
  state: "on" | "off",
  channel?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await getAccessToken(creds);
    const client = getClient(creds);

    const params: any = channel !== undefined && channel !== null
      ? { switches: [{ switch: state, outlet: channel }] }
      : { switch: state };

    const res = await client.device.setThingStatus({
      type: 1,
      id: deviceId,
      params,
    });

    console.log("toggleDevice response:", JSON.stringify(res));

    if (res.error && res.error !== 0) {
      return { success: false, error: res.msg || `Error: ${res.error}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function pulseDevice(
  condominioId: number,
  creds: EwelinkCredentials,
  deviceId: string,
  durationMs: number = 1000,
  channel?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await getAccessToken(creds);
    const client = getClient(creds);

    const isMultiChannel = channel !== undefined && channel !== null;
    const width = Math.max(500, Math.min(durationMs, 36000000));

    if (isMultiChannel) {
      const pulseRes = await client.device.setThingStatus({
        type: 1,
        id: deviceId,
        params: {
          pulses: [{ pulse: "on", switch: "on", outlet: channel, width }],
        },
      });
      console.log("pulseDevice multi-ch pulse config:", JSON.stringify(pulseRes));

      const pulseSupported = !pulseRes.error || pulseRes.error === 0;

      const onRes = await client.device.setThingStatus({
        type: 1,
        id: deviceId,
        params: { switches: [{ switch: "on", outlet: channel }] },
      });
      console.log("pulseDevice multi-ch ON:", JSON.stringify(onRes));

      if (onRes.error && onRes.error !== 0) {
        return { success: false, error: onRes.msg || `Error: ${onRes.error}` };
      }

      if (!pulseSupported) {
        setTimeout(async () => {
          try {
            await client.device.setThingStatus({
              type: 1,
              id: deviceId,
              params: { switches: [{ switch: "off", outlet: channel }] },
            });
          } catch (err) {
            console.error("pulseDevice manual OFF error:", err);
          }
        }, width);
      }

      return { success: true };
    }

    const pulseRes = await client.device.setThingStatus({
      type: 1,
      id: deviceId,
      params: {
        pulse: "on",
        pulseWidth: width,
      },
    });
    console.log("pulseDevice single-ch pulse config:", JSON.stringify(pulseRes));

    const pulseSupported = !pulseRes.error || pulseRes.error === 0;

    const onRes = await client.device.setThingStatus({
      type: 1,
      id: deviceId,
      params: { switch: "on" },
    });
    console.log("pulseDevice single-ch ON:", JSON.stringify(onRes));

    if (onRes.error && onRes.error !== 0) {
      return { success: false, error: onRes.msg || `Error: ${onRes.error}` };
    }

    if (!pulseSupported) {
      setTimeout(async () => {
        try {
          await client.device.setThingStatus({
            type: 1,
            id: deviceId,
            params: { switch: "off" },
          });
        } catch (err) {
          console.error("pulseDevice manual OFF error:", err);
        }
      }, width);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDeviceStatus(
  condominioId: number,
  creds: EwelinkCredentials,
  deviceId: string
): Promise<{ online: boolean; switch?: string; error?: string }> {
  try {
    await getAccessToken(creds);
    const client = getClient(creds);

    const res = await client.device.getThings({
      thingList: [{ itemType: 1, id: deviceId }],
    });

    console.log("getDeviceStatus response:", JSON.stringify(res).slice(0, 300));

    if (res.error && res.error !== 0) {
      return { online: false, error: res.msg || `Error: ${res.error}` };
    }

    const thing = res.data?.thingList?.[0]?.itemData;
    if (!thing) {
      return { online: false, error: "Dispositivo não encontrado" };
    }

    return {
      online: thing.online || false,
      switch: thing.params?.switch,
    };
  } catch (err: any) {
    return { online: false, error: err.message };
  }
}

export async function listDevices(
  condominioId: number,
  creds: EwelinkCredentials
): Promise<{ devices: any[]; error?: string }> {
  try {
    const token = await getAccessToken(creds);
    const client = getClient(creds);
    client.at = token;

    const res = await client.device.getAllThings({
      lang: "en",
    });

    console.log("listDevices SDK response:", JSON.stringify(res).slice(0, 500));

    if (res.error && res.error !== 0) {
      return { devices: [], error: res.msg || `Error: ${res.error}` };
    }

    const thingList = res.data?.thingList || [];
    const devices = thingList.map((t: any) => {
      const params = t.itemData?.params || {};
      const switches = params.switches as { switch: string; outlet: number }[] | undefined;
      const channelCount = switches ? switches.length : 1;
      return {
        deviceId: t.itemData?.deviceid,
        name: t.itemData?.name,
        brandName: t.itemData?.brandName,
        productModel: t.itemData?.productModel,
        online: t.itemData?.online,
        switchState: params.switch,
        channelCount,
        switches,
      };
    });

    return { devices };
  } catch (err: any) {
    console.error("listDevices error:", err);
    return { devices: [], error: err.message };
  }
}

export function clearTokenCache(condominioId: number): void {
  cachedToken = null;
  sdkClient = null;
}
