// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyRegistry} from "../policy/PolicyRegistry.sol";
import {IVerifierPolicy} from "../verifier/IVerifierPolicy.sol";

/// @title Patricon SettlementConnector
/// @notice Minimal settlement gateway that requires a valid policy proof prior to settlement intent emission.
contract SettlementConnector {
    error InvalidAddress();
    error InvalidPaymentParty();
    error InvalidAmount();
    error UnknownOrInactivePolicy();
    error PolicyHashMismatch();
    error PolicySignalMismatch();
    error PolicyProofInvalid();

    struct Groth16Proof {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
    }

    PolicyRegistry public immutable policyRegistry;
    IVerifierPolicy public immutable policyVerifier;

    event PaymentRequested(
        bytes32 indexed paymentRef,
        address indexed agent,
        address indexed payer,
        address payee,
        address asset,
        uint256 amount,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        bytes32 policyHash
    );

    event PaymentExecuted(
        bytes32 indexed paymentRef,
        address indexed agent,
        address indexed payer,
        address payee,
        address asset,
        uint256 amount,
        bytes32 policyHash
    );

    constructor(address policyRegistry_, address policyVerifier_) {
        if (policyRegistry_ == address(0) || policyVerifier_ == address(0)) revert InvalidAddress();
        policyRegistry = PolicyRegistry(policyRegistry_);
        policyVerifier = IVerifierPolicy(policyVerifier_);
    }

    function executeSettlementWithProof(
        bytes32 paymentRef,
        address agent,
        address payer,
        address payee,
        address asset,
        uint256 amount,
        uint256 tokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals
    ) external {
        if (payer == address(0) || payee == address(0) || asset == address(0)) {
            revert InvalidPaymentParty();
        }
        if (amount == 0) revert InvalidAmount();

        (bytes32 policyHash,,, bool active) = policyRegistry.getPolicyForAgent(agent);
        if (!active || policyHash == bytes32(0)) revert UnknownOrInactivePolicy();
        if (policySignals[2] != uint256(policyHash)) revert PolicyHashMismatch();
        if (policySignals[11] != tokenId || policySignals[12] != executionTimestamp || policySignals[13] != tradeNonce)
        {
            revert PolicySignalMismatch();
        }
        if (amount > policySignals[3]) revert PolicySignalMismatch();

        bool valid = policyVerifier.verifyProof(policyProof.pA, policyProof.pB, policyProof.pC, policySignals);
        if (!valid) revert PolicyProofInvalid();

        emit PaymentRequested(
            paymentRef, agent, payer, payee, asset, amount, executionTimestamp, tradeNonce, policyHash
        );
        emit PaymentExecuted(paymentRef, agent, payer, payee, asset, amount, policyHash);
    }
}
