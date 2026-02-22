/**
 * Key generation utility for lightshell-server setup.
 * Run: bun run src/crypto/keygen.ts
 */

import { generateKeypair } from "./ed25519.js";
import { sha256String } from "./sha256.js";

async function main() {
  console.log("LightShell Server — Key Generation\n");

  // Generate Ed25519 signing keypair
  const keypair = await generateKeypair();
  console.log("Ed25519 Signing Keypair:");
  console.log(`  Private Key: ${keypair.privateKey}`);
  console.log(`  Public Key:  ${keypair.publicKey}`);
  console.log();

  // Generate API key
  const apiKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(apiKeyBytes);
  const apiKey = Array.from(apiKeyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const apiKeyHash = await sha256String(apiKey);

  console.log("API Key:");
  console.log(`  Key:  ${apiKey}`);
  console.log(`  Hash: ${apiKeyHash}`);
  console.log();

  console.log("Environment Variables:");
  console.log(`  API_KEY=${apiKey}`);
  console.log(`  ED25519_PUBLIC_KEY=${keypair.publicKey}`);
  console.log();

  console.log("For lightshell.json (client app):");
  console.log(`  "updater": {`);
  console.log(`    "enabled": true,`);
  console.log(`    "server": "https://your-server.com",`);
  console.log(`    "publicKey": "${keypair.publicKey}"`);
  console.log(`  }`);
}

main().catch(console.error);
