import { evaluateYieldPolicy } from "./agents/yield-farming-agent.js";
import { env } from "./config/env.js";
import { generateProof } from "./proof/proof-client.js";
import { createSigner } from "./services/tx-service.js";

async function main(): Promise<void> {
  const decision = evaluateYieldPolicy(1200, 900);
  const signer = createSigner();

  if (!decision.execute) {
    console.log("Patricon agent decision: hold position.");
    return;
  }

  const proof = await generateProof({
    policyRegistry: env.POLICY_REGISTRY_ADDRESS,
    strategyId: decision.strategyId
  });

  console.log("Patricon signer address:", await signer.getAddress());
  console.log("Generated proof public signals:", proof.pubSignals.map((s) => s.toString()));
  console.log("Next step: call proof-gated contract method with proof payload.");
}

main().catch((error) => {
  console.error("Patricon agent execution failed", error);
  process.exitCode = 1;
});
