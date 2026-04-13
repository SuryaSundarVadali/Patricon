// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Patricon MockYieldPool
/// @notice Mock pool used for adapter tests and simple testnet deployments.
contract MockYieldPool {
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;

    event Deposited(address indexed beneficiary, uint256 amount, uint256 tokenId);
    event Withdrawn(address indexed beneficiary, uint256 amount, uint256 tokenId);
    event Rebalanced(address indexed beneficiary, uint256 amount, uint256 fromTokenId, uint256 toTokenId);

    function deposit(address beneficiary, uint256 amount, uint256 tokenId) external {
        totalDeposits += amount;
        emit Deposited(beneficiary, amount, tokenId);
    }

    function withdraw(address beneficiary, uint256 amount, uint256 tokenId) external {
        totalWithdrawals += amount;
        emit Withdrawn(beneficiary, amount, tokenId);
    }

    function rebalance(address beneficiary, uint256 amount, uint256 fromTokenId, uint256 toTokenId) external {
        emit Rebalanced(beneficiary, amount, fromTokenId, toTokenId);
    }
}
