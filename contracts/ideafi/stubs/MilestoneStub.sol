// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MilestoneStub {
    uint256 public ideaId;
    address public owner;

    event Deployed(uint256 indexed ideaId, address indexed owner);

    constructor(uint256 _ideaId, address _owner) {
        ideaId = _ideaId;
        owner = _owner;
        emit Deployed(_ideaId, _owner);
    }
}
