// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

interface IRoleManaged {
    function grantRole(bytes32 role, address account) external;
}

/// @title GrantRoles
/// @notice Operational script for granting registry roles from owner/admin wallets.
contract GrantRoles {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 internal constant AGENT_REGISTRAR_ROLE = keccak256("AGENT_REGISTRAR_ROLE");
    bytes32 internal constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");

    function grantAgentRegistrarRole(address agentRegistry, address grantee) external {
        VM.startBroadcast();
        IRoleManaged(agentRegistry).grantRole(AGENT_REGISTRAR_ROLE, grantee);
        VM.stopBroadcast();
    }

    function grantPolicyAdminRole(address policyRegistry, address grantee) external {
        VM.startBroadcast();
        IRoleManaged(policyRegistry).grantRole(POLICY_ADMIN_ROLE, grantee);
        VM.stopBroadcast();
    }
}
