import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated/contracts.ts",
  plugins: [
    foundry({
      project: "../contracts",
      include: [
        "AgentRegistry.sol/**",
        "PolicyRegistry.sol/**",
        "PolicyEnforcedDeFiAdapter.sol/**",
        "SettlementConnector.sol/**",
        "PatriconIdentityVerifier.sol/**",
        "PatriconPolicyVerifier.sol/**",
        "ERC8004IdentityRegistry.sol/**",
        "ERC8004ReputationRegistry.sol/**",
        "ERC8004ValidationRegistry.sol/**",
        "IYieldPool.sol/**"
      ]
    })
  ]
});
