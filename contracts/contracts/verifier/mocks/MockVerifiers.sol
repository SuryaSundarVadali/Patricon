// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifierIdentity} from "../IVerifierIdentity.sol";
import {IVerifierPolicy} from "../IVerifierPolicy.sol";

contract MockVerifierIdentity is IVerifierIdentity {
    bool public shouldVerify = true;

    function setShouldVerify(bool value) external {
        shouldVerify = value;
    }

    function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[6] calldata)
        external
        view
        override
        returns (bool)
    {
        return shouldVerify;
    }
}

contract MockVerifierPolicy is IVerifierPolicy {
    bool public shouldVerify = true;

    function setShouldVerify(bool value) external {
        shouldVerify = value;
    }

    function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[14] calldata)
        external
        view
        override
        returns (bool)
    {
        return shouldVerify;
    }
}
