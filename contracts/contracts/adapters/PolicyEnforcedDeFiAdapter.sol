// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyRegistry} from "../policy/PolicyRegistry.sol";
import {AgentRegistry} from "../identity/AgentRegistry.sol";
import {IVerifierIdentity} from "../verifier/IVerifierIdentity.sol";
import {IVerifierPolicy} from "../verifier/IVerifierPolicy.sol";

interface IYieldPool {
    function deposit(address beneficiary, uint256 amount, uint256 tokenId) external;

    function withdraw(address beneficiary, uint256 amount, uint256 tokenId) external;

    function rebalance(address beneficiary, uint256 amount, uint256 fromTokenId, uint256 toTokenId) external;
}

/// @title Patricon PolicyEnforcedDeFiAdapter
/// @notice Proof-gated wrapper around a DeFi pool for deposit/withdraw/rebalance operations.
/// @dev Public signal layout (identity):
///      [0]=identityCommitment, [1]=replayNullifier, [2]=merkleRoot, [3]=agentPublicKeyHash, [4]=policyHash, [5]=identityNonce
///      Public signal layout (policy):
///      [0]=updatedCumulativeVolume, [1]=updatedNonce, [2]=policyHash,
///      [3]=maxTrade, [4]=dailyVolumeLimit, [5]=minDelay, [6]=allowedTokenIdA, [7]=allowedTokenIdB,
///      [8]=previousCumulativeVolume, [9]=previousTradeTimestamp, [10]=previousNonce,
///      [11]=tokenId, [12]=newTradeTimestamp, [13]=tradeNonce
contract PolicyEnforcedDeFiAdapter {
    error InvalidAddress();
    error UnknownOrInactiveAgent();
    error UnknownOrInactivePolicy();
    error PolicyHashMismatch();
    error IdentitySignalMismatch();
    error PolicySignalMismatch();
    error IdentityProofInvalid();
    error PolicyProofInvalid();
    error ActionNotPolicyCompliant();

    struct Groth16Proof {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
    }

    PolicyRegistry public immutable policyRegistry;
    AgentRegistry public immutable agentRegistry;
    IVerifierIdentity public immutable identityVerifier;
    IVerifierPolicy public immutable policyVerifier;
    IYieldPool public immutable targetPool;

    event DepositExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce);
    event WithdrawExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce);
    event RebalanceExecuted(
        address indexed agent, uint256 amount, uint256 fromTokenId, uint256 toTokenId, uint256 tradeNonce
    );

    constructor(
        address targetPool_,
        address policyRegistry_,
        address agentRegistry_,
        address identityVerifier_,
        address policyVerifier_
    ) {
        if (
            targetPool_ == address(0) || policyRegistry_ == address(0) || agentRegistry_ == address(0)
                || identityVerifier_ == address(0) || policyVerifier_ == address(0)
        ) {
            revert InvalidAddress();
        }

        targetPool = IYieldPool(targetPool_);
        policyRegistry = PolicyRegistry(policyRegistry_);
        agentRegistry = AgentRegistry(agentRegistry_);
        identityVerifier = IVerifierIdentity(identityVerifier_);
        policyVerifier = IVerifierPolicy(policyVerifier_);
    }

    function depositWithProof(
        address agent,
        uint256 amount,
        uint256 tokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata identityProof,
        uint256[6] calldata identitySignals,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals
    ) external {
        _validateProofContext(
            agent,
            amount,
            tokenId,
            executionTimestamp,
            tradeNonce,
            identityProof,
            identitySignals,
            policyProof,
            policySignals
        );

        targetPool.deposit(agent, amount, tokenId);
        emit DepositExecuted(agent, amount, tokenId, tradeNonce);
    }

    function withdrawWithProof(
        address agent,
        uint256 amount,
        uint256 tokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata identityProof,
        uint256[6] calldata identitySignals,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals
    ) external {
        _validateProofContext(
            agent,
            amount,
            tokenId,
            executionTimestamp,
            tradeNonce,
            identityProof,
            identitySignals,
            policyProof,
            policySignals
        );

        targetPool.withdraw(agent, amount, tokenId);
        emit WithdrawExecuted(agent, amount, tokenId, tradeNonce);
    }

    function rebalanceWithProof(
        address agent,
        uint256 amount,
        uint256 fromTokenId,
        uint256 toTokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata identityProof,
        uint256[6] calldata identitySignals,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals
    ) external {
        _validateProofContext(
            agent,
            amount,
            fromTokenId,
            executionTimestamp,
            tradeNonce,
            identityProof,
            identitySignals,
            policyProof,
            policySignals
        );

        targetPool.rebalance(agent, amount, fromTokenId, toTokenId);
        emit RebalanceExecuted(agent, amount, fromTokenId, toTokenId, tradeNonce);
    }

    function _validateProofContext(
        address agent,
        uint256 amount,
        uint256 tokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata identityProof,
        uint256[6] calldata identitySignals,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals
    ) internal view {
        (bytes32 policyHash,,, bool policyActive) = policyRegistry.getPolicyForAgent(agent);
        if (!policyActive || policyHash == bytes32(0)) revert UnknownOrInactivePolicy();

        (, bytes32 agentPublicKeyHash, bytes32 identityCommitment, bool agentActive) =
            agentRegistry.getAgentBinding(agent);
        if (!agentActive || identityCommitment == bytes32(0)) revert UnknownOrInactiveAgent();

        if (identitySignals[0] != uint256(identityCommitment)) revert IdentitySignalMismatch();
        if (identitySignals[2] != uint256(agentRegistry.identityMerkleRoot())) revert IdentitySignalMismatch();
        if (identitySignals[3] != uint256(agentPublicKeyHash)) revert IdentitySignalMismatch();
        if (identitySignals[4] != uint256(policyHash)) revert PolicyHashMismatch();

        // Policy circuit public signals must bind to current policy hash and the user action envelope.
        if (policySignals[2] != uint256(policyHash)) revert PolicyHashMismatch();
        if (policySignals[11] != tokenId || policySignals[12] != executionTimestamp || policySignals[13] != tradeNonce)
        {
            revert PolicySignalMismatch();
        }

        // Since tradeAmount is private in v1 policy circuit, enforce amount <= maxTrade in adapter too.
        if (amount > policySignals[3]) revert ActionNotPolicyCompliant();

        bool identityValid =
            identityVerifier.verifyProof(identityProof.pA, identityProof.pB, identityProof.pC, identitySignals);
        if (!identityValid) revert IdentityProofInvalid();

        bool policyValid = policyVerifier.verifyProof(policyProof.pA, policyProof.pB, policyProof.pC, policySignals);
        if (!policyValid) revert PolicyProofInvalid();
    }
}
