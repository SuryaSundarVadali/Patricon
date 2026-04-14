// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicyRegistry} from "../policy/IPolicyRegistry.sol";
import {IAgentRegistry} from "../identity/IAgentRegistry.sol";
import {IVerifierIdentity} from "../verifier/IVerifierIdentity.sol";
import {IVerifierPolicy} from "../verifier/IVerifierPolicy.sol";
import {IYieldPool} from "./IYieldPool.sol";

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
    error InvalidAmount();
    error Unauthorized();
    error ContractPaused();
    error ReentrancyBlocked();
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

    IPolicyRegistry public immutable POLICY_REGISTRY;
    IAgentRegistry public immutable AGENT_REGISTRY;
    IVerifierIdentity public immutable IDENTITY_VERIFIER;
    IVerifierPolicy public immutable POLICY_VERIFIER;
    IYieldPool public immutable TARGET_POOL;

    address public owner;
    bool public paused;
    bool public permissionlessExecution;
    mapping(address => bool) public executors;

    uint256 private _reentrancyLock;

    event DepositExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce);
    event WithdrawExecuted(address indexed agent, uint256 amount, uint256 tokenId, uint256 tradeNonce);
    event RebalanceExecuted(
        address indexed agent, uint256 amount, uint256 fromTokenId, uint256 toTokenId, uint256 tradeNonce
    );

    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event ExecutorUpdated(address indexed executor, bool allowed);
    event PauseStateUpdated(bool paused);
    event PermissionlessExecutionUpdated(bool enabled);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier onlyExecutor() {
        _onlyExecutor();
        _;
    }

    modifier whenNotPaused() {
        _whenNotPaused();
        _;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert Unauthorized();
    }

    function _onlyExecutor() internal view {
        if (!(permissionlessExecution || msg.sender == owner || executors[msg.sender])) revert Unauthorized();
    }

    function _whenNotPaused() internal view {
        if (paused) revert ContractPaused();
    }

    function _nonReentrantBefore() internal {
        if (_reentrancyLock == 1) revert ReentrancyBlocked();
        _reentrancyLock = 1;
    }

    function _nonReentrantAfter() internal {
        _reentrancyLock = 0;
    }

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

        TARGET_POOL = IYieldPool(targetPool_);
        POLICY_REGISTRY = IPolicyRegistry(policyRegistry_);
        AGENT_REGISTRY = IAgentRegistry(agentRegistry_);
        IDENTITY_VERIFIER = IVerifierIdentity(identityVerifier_);
        POLICY_VERIFIER = IVerifierPolicy(policyVerifier_);

        owner = msg.sender;
        permissionlessExecution = true;
        emit OwnerUpdated(address(0), msg.sender);
        emit PermissionlessExecutionUpdated(true);
    }

    /// @notice Transfers adapter ownership.
    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Enables/disables an executor account.
    function setExecutor(address executor, bool allowed) external onlyOwner {
        if (executor == address(0)) revert InvalidAddress();
        executors[executor] = allowed;
        emit ExecutorUpdated(executor, allowed);
    }

    /// @notice Enables/disables permissionless execution.
    function setPermissionlessExecution(bool enabled) external onlyOwner {
        permissionlessExecution = enabled;
        emit PermissionlessExecutionUpdated(enabled);
    }

    /// @notice Pauses adapter action entrypoints.
    function pause() external onlyOwner {
        paused = true;
        emit PauseStateUpdated(true);
    }

    /// @notice Unpauses adapter action entrypoints.
    function unpause() external onlyOwner {
        paused = false;
        emit PauseStateUpdated(false);
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
    ) external whenNotPaused onlyExecutor nonReentrant {
        if (amount == 0) revert InvalidAmount();
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

        TARGET_POOL.deposit(agent, amount, tokenId);
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
    ) external whenNotPaused onlyExecutor nonReentrant {
        if (amount == 0) revert InvalidAmount();
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

        TARGET_POOL.withdraw(agent, amount, tokenId);
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
    ) external whenNotPaused onlyExecutor nonReentrant {
        if (amount == 0) revert InvalidAmount();
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

        TARGET_POOL.rebalance(agent, amount, fromTokenId, toTokenId);
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
        (bytes32 policyHash,,, bool policyActive) = POLICY_REGISTRY.getPolicyForAgent(agent);
        if (!policyActive || policyHash == bytes32(0)) {
            revert UnknownOrInactivePolicy();
        }

        (, bytes32 agentPublicKeyHash, bytes32 identityCommitment, bool agentActive) =
            AGENT_REGISTRY.getAgentBinding(agent);
        if (!agentActive || identityCommitment == bytes32(0)) {
            revert UnknownOrInactiveAgent();
        }

        if (identitySignals[0] != uint256(identityCommitment)) {
            revert IdentitySignalMismatch();
        }
        if (identitySignals[2] != uint256(AGENT_REGISTRY.identityMerkleRoot())) {
            revert IdentitySignalMismatch();
        }
        if (identitySignals[3] != uint256(agentPublicKeyHash)) {
            revert IdentitySignalMismatch();
        }
        if (identitySignals[4] != uint256(policyHash)) {
            revert PolicyHashMismatch();
        }

        // Policy circuit public signals must bind to current policy hash and the user action envelope.
        if (policySignals[2] != uint256(policyHash)) {
            revert PolicyHashMismatch();
        }
        if (policySignals[11] != tokenId || policySignals[12] != executionTimestamp || policySignals[13] != tradeNonce)
        {
            revert PolicySignalMismatch();
        }

        // Since tradeAmount is private in v1 policy circuit, enforce amount <= maxTrade in adapter too.
        if (amount > policySignals[3]) revert ActionNotPolicyCompliant();

        bool identityValid =
            IDENTITY_VERIFIER.verifyProof(identityProof.pA, identityProof.pB, identityProof.pC, identitySignals);
        if (!identityValid) revert IdentityProofInvalid();

        bool policyValid = POLICY_VERIFIER.verifyProof(policyProof.pA, policyProof.pB, policyProof.pC, policySignals);
        if (!policyValid) revert PolicyProofInvalid();
    }
}
