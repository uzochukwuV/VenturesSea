// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * SatoshiVentures — Mezo MUSD External Interfaces
 * ------------------------------------------------
 * All signatures verified against `mezo-org/musd@HEAD`:
 *   solidity/contracts/interfaces/IBorrowerOperations.sol
 *   solidity/contracts/interfaces/ITroveManager.sol
 *   solidity/contracts/interfaces/IPriceFeed.sol
 *   solidity/contracts/interfaces/ISortedTroves.sol
 *   solidity/contracts/interfaces/IHintHelpers.sol
 *   solidity/contracts/interfaces/IStabilityPool.sol
 *
 * IMPORTANT: MUSD compiles with solc 0.8.24, this project compiles with 0.8.28.
 * Interface ABIs are forward-compatible. We trim to the surface area we use.
 */

// ──────────────────────────────────────────────────────────────────────────────
// BorrowerOperations
// ──────────────────────────────────────────────────────────────────────────────
interface IMezoBorrowerOperations {
    /// @notice Open a trove. Trove is owned by msg.sender. Send BTC as msg.value.
    /// @param _debtAmount     MUSD debt to mint (18 decimals).
    /// @param _upperHint      SortedTroves hint (use SortedTroves.findInsertPosition).
    /// @param _lowerHint      SortedTroves hint (use SortedTroves.findInsertPosition).
    function openTrove(
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;

    /// @notice Add collateral to existing trove.
    function addColl(address _upperHint, address _lowerHint) external payable;

    /// @notice Withdraw collateral from existing trove.
    function withdrawColl(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /// @notice Borrow more MUSD from existing trove.
    function withdrawMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /// @notice Repay MUSD on existing trove.
    function repayMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    /// @notice Close trove (repay all debt, withdraw all collateral).
    function closeTrove() external;

    /// @notice Combined collateral & debt adjustment.
    function adjustTrove(
        uint256 _collWithdrawal,
        uint256 _debtChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable;

    /// @notice Claim collateral surplus after liquidation/redemption.
    function claimCollateral() external;

    /// @notice Current borrowing fee for a given debt amount.
    function getBorrowingFee(uint256 _debt) external view returns (uint256);

    /// @notice Minimum net debt enforced by the system.
    function minNetDebt() external view returns (uint256);
}

// ──────────────────────────────────────────────────────────────────────────────
// TroveManager
// ──────────────────────────────────────────────────────────────────────────────
interface IMezoTroveManager {
    /// @dev Mirrors `TroveManager.Status` in the live contract.
    enum Status {
        nonExistent,
        active,
        closedByOwner,
        closedByLiquidation,
        closedByRedemption
    }

    function liquidate(address _borrower) external;

    function batchLiquidateTroves(address[] calldata _troveArray) external;

    function redeemCollateral(
        uint256 _amount,
        address _firstRedemptionHint,
        address _upperPartialRedemptionHint,
        address _lowerPartialRedemptionHint,
        uint256 _partialRedemptionHintNICR,
        uint256 _maxIterations
    ) external;

    /// @return The trove's lifecycle status. Cast from enum to uint8.
    function getTroveStatus(address _borrower) external view returns (Status);

    function getTroveDebt(address _borrower) external view returns (uint256);

    function getTroveColl(address _borrower) external view returns (uint256);

    function getNominalICR(address _borrower) external view returns (uint256);

    function getCurrentICR(
        address _borrower,
        uint256 _price
    ) external view returns (uint256);

    function getTCR(uint256 _price) external view returns (uint256);

    function checkRecoveryMode(uint256 _price) external view returns (bool);

    function getTroveOwnersCount() external view returns (uint256);
}

// ──────────────────────────────────────────────────────────────────────────────
// PriceFeed
// ──────────────────────────────────────────────────────────────────────────────
interface IMezoPriceFeed {
    /// @notice Returns the latest BTC/USD price scaled to 1e18.
    /// @dev In the live contract this is `view` despite the name "fetchPrice".
    function fetchPrice() external view returns (uint256);
}

// ──────────────────────────────────────────────────────────────────────────────
// SortedTroves
// ──────────────────────────────────────────────────────────────────────────────
interface IMezoSortedTroves {
    function getSize() external view returns (uint256);

    function getFirst() external view returns (address);

    function getLast() external view returns (address);

    function contains(address _id) external view returns (bool);

    function findInsertPosition(
        uint256 _NICR,
        address _prevId,
        address _nextId
    ) external view returns (address, address);

    function validInsertPosition(
        uint256 _NICR,
        address _prevId,
        address _nextId
    ) external view returns (bool);
}

// ──────────────────────────────────────────────────────────────────────────────
// HintHelpers
// ──────────────────────────────────────────────────────────────────────────────
interface IMezoHintHelpers {
    function getApproxHint(
        uint256 _CR,
        uint256 _numTrials,
        uint256 _inputRandomSeed
    ) external view returns (
        address hintAddress,
        uint256 diff,
        uint256 latestRandomSeed
    );

    function computeNominalCR(
        uint256 _coll,
        uint256 _debt
    ) external pure returns (uint256);

    function computeCR(
        uint256 _coll,
        uint256 _debt,
        uint256 _price
    ) external pure returns (uint256);
}

// ──────────────────────────────────────────────────────────────────────────────
// StabilityPool
// ──────────────────────────────────────────────────────────────────────────────
interface IMezoStabilityPool {
    function provideToSP(uint256 _amount) external;

    function withdrawFromSP(uint256 _amount) external;

    function withdrawCollateralGainToTrove(
        address _upperHint,
        address _lowerHint
    ) external;

    function getCompoundedMUSDDeposit(
        address _depositor
    ) external view returns (uint256);

    function getDepositorCollateralGain(
        address _depositor
    ) external view returns (uint256);

    function getTotalMUSDDeposits() external view returns (uint256);
}

// ──────────────────────────────────────────────────────────────────────────────
// Generic MUSD-yield vault interface (used by SatoshiVentures YieldOptimizer)
// ──────────────────────────────────────────────────────────────────────────────
/**
 * @notice Abstraction over any "deposit MUSD → earn yield" surface.
 *         The hackathon adapter wires this to StabilityPool via
 *         StabilityPoolAdapter. Future implementations could target a native
 *         MUSD savings vault, an Aave-style market, or anything else.
 */
interface IMUSDSavingsVault {
    /// @notice Deposit MUSD held by msg.sender into the vault.
    function deposit(uint256 _amount) external;

    /// @notice Withdraw MUSD back to msg.sender.
    function withdraw(uint256 _amount) external;

    /// @notice Vault accounting balance of _account (in MUSD wei).
    function balanceOf(address _account) external view returns (uint256);

    /// @notice Cumulative MUSD-equivalent yield earned by _account.
    /// @dev If the vault has no yield concept it should return 0.
    function getYieldEarned(address _account) external view returns (uint256);
}
