import { Contract, JsonRpcProvider, JsonRpcSigner } from "ethers";

const policyEnforcedDeFiAdapterAbi = [
  "function depositWithProof(address agent,uint256 amount,uint256 tokenId,uint256 executionTimestamp,uint256 tradeNonce,(uint256[2] pA,uint256[2][2] pB,uint256[2] pC) identityProof,uint256[6] identitySignals,(uint256[2] pA,uint256[2][2] pB,uint256[2] pC) policyProof,uint256[14] policySignals)",
  "function withdrawWithProof(address agent,uint256 amount,uint256 tokenId,uint256 executionTimestamp,uint256 tradeNonce,(uint256[2] pA,uint256[2][2] pB,uint256[2] pC) identityProof,uint256[6] identitySignals,(uint256[2] pA,uint256[2][2] pB,uint256[2] pC) policyProof,uint256[14] policySignals)",
  "function rebalanceWithProof(address agent,uint256 amount,uint256 fromTokenId,uint256 toTokenId,uint256 executionTimestamp,uint256 tradeNonce,(uint256[2] pA,uint256[2][2] pB,uint256[2] pC) identityProof,uint256[6] identitySignals,(uint256[2] pA,uint256[2][2] pB,uint256[2] pC) policyProof,uint256[14] policySignals)"
] as const;

const settlementConnectorAbi = [
  "function executeSettlementWithProof(bytes32 paymentRef,address agent,address payer,address payee,address asset,uint256 amount,uint256 tokenId,uint256 executionTimestamp,uint256 tradeNonce,(uint256[2] pA,uint256[2][2] pB,uint256[2] pC) policyProof,uint256[14] policySignals)"
] as const;

export type HashKeyClientConfig = {
  rpcUrl: string;
  chainId: number;
  walletRpcUrl: string;
  accountAddress: string;
  defiAdapterAddress: string;
  settlementConnectorAddress: string;
};

export type HashKeyClients = {
  provider: JsonRpcProvider;
  signer: JsonRpcSigner;
  defiAdapter: Contract;
  settlementConnector: Contract;
};

/**
 * Creates connected clients for HashKey Chain reads and non-custodial wallet-based signing.
 */
export async function createHashKeyClients(config: HashKeyClientConfig): Promise<HashKeyClients> {
  const provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
  const signerProvider = new JsonRpcProvider(config.walletRpcUrl, config.chainId);
  const signer = await signerProvider.getSigner(config.accountAddress);
  const defiAdapter = new Contract(config.defiAdapterAddress, policyEnforcedDeFiAdapterAbi, signer);
  const settlementConnector = new Contract(
    config.settlementConnectorAddress,
    settlementConnectorAbi,
    signer
  );

  return {
    provider,
    signer,
    defiAdapter,
    settlementConnector
  };
}