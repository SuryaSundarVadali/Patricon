import type { Abi } from "viem";

import agentRegistryArtifact from "../../../contracts/out/AgentRegistry.sol/AgentRegistry.json";
import policyRegistryArtifact from "../../../contracts/out/PolicyRegistry.sol/PolicyRegistry.json";
import policyEnforcedDeFiAdapterArtifact from "../../../contracts/out/PolicyEnforcedDeFiAdapter.sol/PolicyEnforcedDeFiAdapter.json";
import settlementConnectorArtifact from "../../../contracts/out/SettlementConnector.sol/SettlementConnector.json";
import verifierIdentityArtifact from "../../../contracts/out/PatriconIdentityVerifier.sol/VerifierIdentity.json";
import verifierPolicyArtifact from "../../../contracts/out/PatriconPolicyVerifier.sol/VerifierPolicy.json";
import erc8004IdentityRegistryArtifact from "../../../contracts/out/ERC8004IdentityRegistry.sol/ERC8004IdentityRegistry.json";
import erc8004ReputationRegistryArtifact from "../../../contracts/out/ERC8004ReputationRegistry.sol/ERC8004ReputationRegistry.json";
import erc8004ValidationRegistryArtifact from "../../../contracts/out/ERC8004ValidationRegistry.sol/ERC8004ValidationRegistry.json";
import iYieldPoolArtifact from "../../../contracts/out/IYieldPool.sol/IYieldPool.json";

export const AgentRegistryAbi = agentRegistryArtifact.abi as Abi;
export const PolicyRegistryAbi = policyRegistryArtifact.abi as Abi;
export const PolicyEnforcedDeFiAdapterAbi = policyEnforcedDeFiAdapterArtifact.abi as Abi;
export const SettlementConnectorAbi = settlementConnectorArtifact.abi as Abi;
export const VerifierIdentityAbi = verifierIdentityArtifact.abi as Abi;
export const VerifierPolicyAbi = verifierPolicyArtifact.abi as Abi;
export const ERC8004IdentityRegistryAbi = erc8004IdentityRegistryArtifact.abi as Abi;
export const ERC8004ReputationRegistryAbi = erc8004ReputationRegistryArtifact.abi as Abi;
export const ERC8004ValidationRegistryAbi = erc8004ValidationRegistryArtifact.abi as Abi;
export const IYieldPoolAbi = iYieldPoolArtifact.abi as Abi;

export type Groth16Proof = {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
};
