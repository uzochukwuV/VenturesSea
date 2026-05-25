// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./mezo/IMezo.sol";

/**
 * @title MezoBorrowConnector
 * @notice Stateless, custody-less read & hint-computation layer over Mezo MUSD.
 *
 *         Why stateless?
 *           In MUSD, `BorrowerOperations.openTrove` opens a trove owned by
 *           `msg.sender`. If a connector contract were to forward the call,
 *           the trove would be owned by the contract — defeating per-user
 *           collateralization. So users call `BorrowerOperations` directly;
 *           this contract precomputes the SortedTroves hints they pass in
 *           and centralizes health/queries so the frontend has a single API.
 *
 *         The original development plan sketched a `openTroveOptimized`
 *         function that internally called `openTrove(...)` with `msg.sender`
 *         as a borrower argument — but the live MUSD interface has no such
 *         argument (see contracts/satoshi/mezo/IMezo.sol). This contract
 *         exposes `computeOpenTroveHints` instead so the frontend can build
 *         the correct calldata and submit it from the user's wallet.
 */
contract MezoBorrowConnector {
    // ── Immutables ───────────────────────────────────────────────────────────
    address public immutable borrowerOperations;
    address public immutable troveManager;
    address public immutable priceFeed;
    address public immutable sortedTroves;
    address public immutable hintHelpers;
    address public immutable musdToken;

    // ── Constants (BPS == 1/10_000) ─────────────────────────────────────────
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_ICR_BPS = 11_000;             // 110%
    uint256 public constant RECOVERY_MODE_TCR_BPS = 15_000;   // 150%
    /// @dev MUSD's `MUSD_GAS_COMPENSATION` is 200 MUSD; minted on trove open
    ///      and returned on close. See TroveManager constants in mezo-org/musd.
    uint256 public constant GAS_COMPENSATION = 200e18;
    /// @dev Default seed for getApproxHint sampling. 15 trials is the
    ///      Liquity-recommended value for sub-100ms hint convergence at
    ///      production trove counts.
    uint256 public constant DEFAULT_HINT_TRIALS = 15;
    uint256 public constant DEFAULT_HINT_SEED = 42;

    // ── Events ───────────────────────────────────────────────────────────────
    event ConnectorWired(
        address borrowerOperations,
        address troveManager,
        address priceFeed,
        address sortedTroves,
        address hintHelpers,
        address musdToken
    );

    // ── Errors ───────────────────────────────────────────────────────────────
    error ZeroAddress(string what);
    error ZeroDebt();
    error ZeroCollateral();

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _borrowerOperations,
        address _troveManager,
        address _priceFeed,
        address _sortedTroves,
        address _hintHelpers,
        address _musdToken
    ) {
        if (_borrowerOperations == address(0)) revert ZeroAddress("borrowerOperations");
        if (_troveManager == address(0))       revert ZeroAddress("troveManager");
        if (_priceFeed == address(0))          revert ZeroAddress("priceFeed");
        if (_sortedTroves == address(0))       revert ZeroAddress("sortedTroves");
        if (_hintHelpers == address(0))        revert ZeroAddress("hintHelpers");
        if (_musdToken == address(0))          revert ZeroAddress("musdToken");

        borrowerOperations = _borrowerOperations;
        troveManager       = _troveManager;
        priceFeed          = _priceFeed;
        sortedTroves       = _sortedTroves;
        hintHelpers        = _hintHelpers;
        musdToken          = _musdToken;

        emit ConnectorWired(
            _borrowerOperations,
            _troveManager,
            _priceFeed,
            _sortedTroves,
            _hintHelpers,
            _musdToken
        );
    }

    // ── Hint computation (the only on-chain "active" surface) ───────────────

    /**
     * @notice Compute SortedTroves hints for opening a trove at the given
     *         collateral/debt sizing.
     * @param  _collateralAmount  BTC collateral (wei).
     * @param  _musdDebt          MUSD principal to borrow (excluding borrowing fee
     *                            and gas compensation). The function computes the
     *                            expected total debt internally.
     * @return upperHint          Pass as `_upperHint` in BorrowerOperations.openTrove.
     * @return lowerHint          Pass as `_lowerHint` in BorrowerOperations.openTrove.
     * @return expectedTotalDebt  Principal + borrowing fee + gas compensation.
     * @return nicr               The nominal ICR used for ordering.
     */
    function computeOpenTroveHints(
        uint256 _collateralAmount,
        uint256 _musdDebt
    )
        external
        view
        returns (
            address upperHint,
            address lowerHint,
            uint256 expectedTotalDebt,
            uint256 nicr
        )
    {
        if (_collateralAmount == 0) revert ZeroCollateral();
        if (_musdDebt == 0)         revert ZeroDebt();

        uint256 borrowingFee = IMezoBorrowerOperations(borrowerOperations).getBorrowingFee(_musdDebt);
        expectedTotalDebt = _musdDebt + borrowingFee + GAS_COMPENSATION;

        nicr = IMezoHintHelpers(hintHelpers).computeNominalCR(_collateralAmount, expectedTotalDebt);

        (address approxHint, , ) = IMezoHintHelpers(hintHelpers).getApproxHint(
            nicr,
            DEFAULT_HINT_TRIALS,
            DEFAULT_HINT_SEED
        );

        (upperHint, lowerHint) = IMezoSortedTroves(sortedTroves).findInsertPosition(
            nicr,
            approxHint,
            approxHint
        );
    }

    /**
     * @notice Hints for re-inserting an existing trove after collateral/debt
     *         adjustment. The caller passes the *post-adjustment* coll & debt.
     */
    function computeAdjustHints(
        uint256 _newCollateral,
        uint256 _newDebt
    )
        external
        view
        returns (address upperHint, address lowerHint, uint256 nicr)
    {
        if (_newCollateral == 0) revert ZeroCollateral();
        if (_newDebt == 0)       revert ZeroDebt();

        nicr = IMezoHintHelpers(hintHelpers).computeNominalCR(_newCollateral, _newDebt);

        (address approxHint, , ) = IMezoHintHelpers(hintHelpers).getApproxHint(
            nicr,
            DEFAULT_HINT_TRIALS,
            DEFAULT_HINT_SEED
        );

        (upperHint, lowerHint) = IMezoSortedTroves(sortedTroves).findInsertPosition(
            nicr,
            approxHint,
            approxHint
        );
    }

    // ── State queries ────────────────────────────────────────────────────────

    /**
     * @notice Single-call portfolio health for a trove owner.
     * @return collateral       BTC collateral (wei).
     * @return debt             Total MUSD debt (principal + accrued interest + fees).
     * @return icrBps           Individual Collateralization Ratio in BPS (11_000 == 110%).
     *                          Zero if the trove has no debt.
     * @return tcrBps           System-wide Total Collateralization Ratio (BPS).
     * @return status           TroveManager.Status cast to uint8.
     * @return btcPrice         Current BTC/USD price (1e18).
     * @return inRecoveryMode   true ⇔ TCR < 150%.
     */
    function getTroveHealth(address _user)
        external
        view
        returns (
            uint256 collateral,
            uint256 debt,
            uint256 icrBps,
            uint256 tcrBps,
            uint8 status,
            uint256 btcPrice,
            bool inRecoveryMode
        )
    {
        IMezoTroveManager tm = IMezoTroveManager(troveManager);

        collateral = tm.getTroveColl(_user);
        debt       = tm.getTroveDebt(_user);
        status     = uint8(tm.getTroveStatus(_user));

        btcPrice = IMezoPriceFeed(priceFeed).fetchPrice();

        if (debt > 0) {
            icrBps = _toBps(tm.getCurrentICR(_user, btcPrice));
        }

        tcrBps = _toBps(tm.getTCR(btcPrice));
        inRecoveryMode = tm.checkRecoveryMode(btcPrice);
    }

    /// @notice True iff the trove is currently below the 110% liquidation threshold.
    function isLiquidationRisk(address _user) external view returns (bool) {
        IMezoTroveManager tm = IMezoTroveManager(troveManager);
        if (tm.getTroveStatus(_user) != IMezoTroveManager.Status.active) return false;

        uint256 btcPrice = IMezoPriceFeed(priceFeed).fetchPrice();
        uint256 icrBps = _toBps(tm.getCurrentICR(_user, btcPrice));
        return icrBps < MIN_ICR_BPS;
    }

    /**
     * @notice BTC/USD price at which the user's ICR would fall to exactly 110%.
     *         Below this price the trove is liquidatable.
     * @dev    price = debt * MIN_ICR / coll, scaled to keep 1e18 USD units.
     * @return liqPrice18  BTC/USD price (1e18). Zero if no trove or zero collateral.
     */
    function getLiquidationPrice(address _user) external view returns (uint256 liqPrice18) {
        IMezoTroveManager tm = IMezoTroveManager(troveManager);
        uint256 collateral = tm.getTroveColl(_user);
        if (collateral == 0) return 0;
        uint256 debt = tm.getTroveDebt(_user);
        if (debt == 0) return 0;

        // ICR (in 1e18) = coll * price / debt. Solve for price at ICR = 1.1e18 (110%):
        //   price = (MIN_ICR_BPS * 1e14) * debt / coll
        //         = (MIN_ICR_BPS * 1e18 * debt) / (coll * BPS_DENOMINATOR)
        liqPrice18 = (debt * MIN_ICR_BPS * 1e18) / (collateral * BPS_DENOMINATOR);
    }

    /**
     * @notice Required BTC collateral to reach a target ICR for a given debt.
     * @param _debt        MUSD debt (wei).
     * @param _targetIcrBps Desired ICR in BPS (e.g. 15_000 == 150%).
     * @param _btcPrice18  BTC price in USD (1e18). Pass 0 to use the live oracle.
     */
    function getRequiredCollateral(
        uint256 _debt,
        uint256 _targetIcrBps,
        uint256 _btcPrice18
    )
        external
        view
        returns (uint256 requiredCollateral)
    {
        if (_debt == 0) return 0;
        uint256 price = _btcPrice18 == 0
            ? IMezoPriceFeed(priceFeed).fetchPrice()
            : _btcPrice18;
        require(price > 0, "MezoBorrowConnector: zero price");

        // coll = debt * targetIcrBps / (BPS * price / 1e18)
        //      = (debt * targetIcrBps * 1e18) / (price * BPS)
        requiredCollateral = (_debt * _targetIcrBps * 1e18) / (price * BPS_DENOMINATOR);
    }

    /// @notice Current BTC/USD price from MUSD oracle (1e18).
    function getBtcPrice() external view returns (uint256) {
        return IMezoPriceFeed(priceFeed).fetchPrice();
    }

    // ── Liquidation pass-through ────────────────────────────────────────────
    // Anyone (including a 3rd-party liquidator bot) can call these. We expose
    // them so a frontend or keeper can route liquidations through one address.

    function liquidateTrove(address _borrower) external {
        IMezoTroveManager(troveManager).liquidate(_borrower);
    }

    function batchLiquidate(address[] calldata _borrowers) external {
        IMezoTroveManager(troveManager).batchLiquidateTroves(_borrowers);
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    /// @dev MUSD returns ICR/TCR in 1e18 (where 1e18 == 100%); convert to BPS.
    function _toBps(uint256 ratio18) internal pure returns (uint256) {
        return ratio18 / 1e14; // 1e18 / 1e14 = 10_000 BPS = 100%
    }
}
