/**
 * Script de diagnóstico - verifica tipo do dispositivo eWeLink e testa acionamento
 */
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data.db"));

// Get eWeLink config
const rows = db.prepare("SELECT key, value FROM system_config WHERE key LIKE 'gate_ewelink_%'").all();
const cfg = {};
for (const r of rows) cfg[r.key] = r.value;

const appId = cfg.gate_ewelink_appid;
const appSecret = cfg.gate_ewelink_appsecret;
const region = cfg.gate_ewelink_token_region || cfg.gate_ewelink_region || "us";
const accessToken = cfg.gate_ewelink_access_token;

console.log("=== Diagnóstico eWeLink ===");
console.log("AppID:", appId);
console.log("Region:", region);
console.log("Token:", accessToken ? accessToken.substring(0, 12) + "..." : "MISSING");

if (!accessToken) {
  console.error("Sem token de acesso! Refaça a autorização OAuth.");
  process.exit(1);
}

const eWeLink = require("ewelink-api-next").default;

async function main() {
  const client = new eWeLink.WebAPI({
    appId,
    appSecret,
    region,
  });
  client.at = accessToken;

  const deviceId = "1002131d30";

  // 1. Get device info
  console.log("\n--- Buscando info do dispositivo", deviceId, "---");
  try {
    const res = await client.device.getThings({
      thingList: [{ itemType: 1, id: deviceId }],
    });

    if (res.error && res.error !== 0) {
      console.error("Erro API:", res.msg || res.error);
      return;
    }

    const thing = res.data?.thingList?.[0]?.itemData;
    if (!thing) {
      console.error("Dispositivo não encontrado!");
      return;
    }

    console.log("Nome:", thing.name);
    console.log("Brand:", thing.brandName);
    console.log("Model:", thing.productModel);
    console.log("Online:", thing.online);
    console.log("UIID:", thing.extra?.uiid);
    
    // Check params to determine channel count
    const params = thing.params;
    if (params) {
      console.log("\n--- Parâmetros do dispositivo ---");
      if (params.switches) {
        console.log("Tipo: MULTI-CANAL");
        console.log("Switches:", JSON.stringify(params.switches));
        console.log("Canais disponíveis:", params.switches.length);
      } else if (params.switch !== undefined) {
        console.log("Tipo: CANAL ÚNICO");
        console.log("Switch:", params.switch);
      }
      if (params.pulse !== undefined) {
        console.log("Pulse mode:", params.pulse);
        console.log("PulseWidth:", params.pulseWidth);
      }
      if (params.pulses) {
        console.log("Pulses (multi-ch):", JSON.stringify(params.pulses));
      }
    }

    // 2. Desligar todos os canais (reset)
    console.log("\n--- Desligando todos canais ---");
    const offRes = await client.device.setThingStatus({
      type: 1,
      id: deviceId,
      params: { switches: [
        { switch: "off", outlet: 0 },
        { switch: "off", outlet: 1 },
        { switch: "off", outlet: 2 },
        { switch: "off", outlet: 3 },
      ] },
    });
    console.log("OFF all response:", JSON.stringify(offRes));

    // 3. Testar pulse manual (ON → delay → OFF) no canal 1 (pedestre)
    console.log("\n--- Teste pulse manual canal 1 (Portão Pedestre) ---");
    const onRes = await client.device.setThingStatus({
      type: 1,
      id: deviceId,
      params: { switches: [{ switch: "on", outlet: 1 }] },
    });
    console.log("ON ch1:", JSON.stringify(onRes));
    console.log("Esperando 1s...");
    await new Promise(r => setTimeout(r, 1000));
    const offRes2 = await client.device.setThingStatus({
      type: 1,
      id: deviceId,
      params: { switches: [{ switch: "off", outlet: 1 }] },
    });
    console.log("OFF ch1:", JSON.stringify(offRes2));
    console.log("\n✅ A lâmpada do canal 1 deve ter PISCADO (ligou e desligou)");

  } catch (err) {
    console.error("Erro:", err.message || err);
  }
}

main();
