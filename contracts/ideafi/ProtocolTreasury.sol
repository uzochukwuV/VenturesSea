// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ---------------------------------------------------------------------------
// ProtocolTreasury
// ---------------------------------------------------------------------------
// A minimal M-of-N multisig treasury.  All token withdrawals and arbitrary
// calls must go through the submitTransaction -> approveTransaction ->
// executeTransaction workflow.
// ---------------------------------------------------------------------------

contract ProtocolTreasury {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    struct TxRequest {
        uint256 txId;
        address to;
        uint256 value;
        bytes data;
        address token;
        uint256 tokenAmount;
        uint256 approvalCount;
        bool executed;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public required;

    uint256 public txCount;
    mapping(uint256 => TxRequest) public txRequests;
    mapping(uint256 => mapping(address => bool)) public approved;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event TxSubmitted(
        uint256 indexed txId,
        address indexed submitter,
        address to,
        uint256 value,
        address token,
        uint256 tokenAmount
    );
    event TxApproved(uint256 indexed txId, address indexed signer);
    event TxExecuted(uint256 indexed txId, address indexed executor);
    event Deposit(address indexed sender, uint256 amount);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlySigner() {
        require(isSigner[msg.sender], "ProtocolTreasury: not a signer");
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(address[] memory _signers, uint256 _required) {
        require(_signers.length > 0, "ProtocolTreasury: no signers");
        require(_required >= 1, "ProtocolTreasury: required < 1");
        require(_required <= _signers.length, "ProtocolTreasury: required > signers");

        for (uint256 i = 0; i < _signers.length; i++) {
            address s = _signers[i];
            require(s != address(0), "ProtocolTreasury: zero signer address");
            require(!isSigner[s], "ProtocolTreasury: duplicate signer");
            isSigner[s] = true;
            signers.push(s);
        }
        required = _required;
    }

    // -----------------------------------------------------------------------
    // Receive ETH
    // -----------------------------------------------------------------------

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // -----------------------------------------------------------------------
    // Multisig workflow
    // -----------------------------------------------------------------------

    /// @notice Submit a transaction request. Automatically counts the submitter's approval.
    /// @param to          Destination address for ETH or arbitrary call.
    /// @param value       ETH value to forward (may be 0).
    /// @param data        Calldata for arbitrary call (may be empty).
    /// @param token       ERC-20 token to transfer, or address(0) for none.
    /// @param tokenAmount Amount of `token` to transfer (ignored if token == address(0)).
    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        address token,
        uint256 tokenAmount
    ) external onlySigner returns (uint256 txId) {
        txId = txCount++;
        txRequests[txId] = TxRequest({
            txId: txId,
            to: to,
            value: value,
            data: data,
            token: token,
            tokenAmount: tokenAmount,
            approvalCount: 1,
            executed: false
        });
        approved[txId][msg.sender] = true;
        emit TxSubmitted(txId, msg.sender, to, value, token, tokenAmount);
    }

    /// @notice Add an approval to an existing, unexecuted transaction.
    function approveTransaction(uint256 txId) external onlySigner {
        require(txId < txCount, "ProtocolTreasury: invalid txId");
        require(!txRequests[txId].executed, "ProtocolTreasury: already executed");
        require(!approved[txId][msg.sender], "ProtocolTreasury: already approved");

        approved[txId][msg.sender] = true;
        txRequests[txId].approvalCount++;
        emit TxApproved(txId, msg.sender);
    }

    /// @notice Execute a transaction once the approval threshold is met.
    function executeTransaction(uint256 txId) external onlySigner {
        require(txId < txCount, "ProtocolTreasury: invalid txId");
        TxRequest storage tx_ = txRequests[txId];
        require(!tx_.executed, "ProtocolTreasury: already executed");
        require(tx_.approvalCount >= required, "ProtocolTreasury: not enough approvals");

        tx_.executed = true;

        // 1. ERC-20 token transfer (if requested)
        if (tx_.token != address(0) && tx_.tokenAmount > 0) {
            IERC20(tx_.token).safeTransfer(tx_.to, tx_.tokenAmount);
        }

        // 2. ETH + optional calldata
        if (tx_.data.length > 0) {
            // Arbitrary call — forward ETH value (may be 0)
            (bool success, bytes memory returnData) = tx_.to.call{value: tx_.value}(tx_.data);
            if (!success) {
                if (returnData.length > 0) {
                    assembly {
                        revert(add(32, returnData), mload(returnData))
                    }
                }
                revert("ProtocolTreasury: call failed");
            }
        } else if (tx_.value > 0) {
            // Plain ETH transfer
            (bool sent, ) = tx_.to.call{value: tx_.value}("");
            require(sent, "ProtocolTreasury: ETH transfer failed");
        }

        emit TxExecuted(txId, msg.sender);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /// @notice Returns the treasury's ERC-20 balance for a given token.
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /// @notice Convenience: get all signers.
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    // -----------------------------------------------------------------------
    // NOTE on withdrawToken
    // -----------------------------------------------------------------------
    // Token withdrawals MUST go through the multisig:
    //   1. submitTransaction(to, 0, "", tokenAddress, amount)
    //   2. Other signers call approveTransaction(txId)
    //   3. Any signer calls executeTransaction(txId)
    // There is intentionally no direct withdrawToken function; all asset
    // movements require the configured quorum of signers.
    // -----------------------------------------------------------------------
}
