// Quick test script to toggle device channel off
const http = require("http");
const jwt = require("jsonwebtoken");
const db = require("better-sqlite3")("data.db");

const secret = "dev-secret-change-in-production-32chars!!";
const token = jwt.sign({ userId: 2 }, secret, { expiresIn: "1h" });

const data = JSON.stringify({ state: "off", channel: 0 });

console.log("Sending toggle OFF channel 0...");
console.log("Token:", token.substring(0, 30) + "...");

const req = http.request(
  {
    hostname: "localhost",
    port: 3001,
    path: "/api/gate/toggle",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "Content-Length": Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", body);
    });
  }
);

req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
