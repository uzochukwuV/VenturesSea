// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../mezo/IMezo.sol";

/*
 * Lightweight Mezo protocol mocks for SatoshiVentures unit tests.
 * Not safety-checked — they are NOT a substitute for the real MUSD contracts.
 * Their only job is to honour the IMezo* interfaces with deterministic values
 * so we can exercise MezoBorrowConnector, CollateralTracker, and YieldOptimizer.
 */

contract MockMUSDToken is ERC20 {
    constructor() ERC20("Mock MUSD", "MUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract MockPriceFeed is IMezoPriceFeed {
    /// @notice BTC/USD price in 1e18 USD-per-BTC. Default: $100,000.
    uint256 public price = 100_000e18;

    function setPrice(uint256 _price) external {
        price = _price;
    }

    function fetchPrice() external view returns (uint256) {
        return price;
    }
}

contract MockSortedTroves is IMezoSortedTroves {
    uint256 private _size;

    function setSize(uint256 s) external { _size = s; }
    function getSize() external view returns (uint256) { return _size; }
    function getFirst() external pure returns (address) { return address(0); }
    function getLast() external pure returns (address) { return address(0); }
    function contains(address) external pure returns (bool) { return false; }

    function findInsertPosition(uint256, address, address)
        external pure returns (address, address)
    {
        // For the connector tests we don't care about real ordering — any
        // pair of (prev, next) hints is acceptable to BorrowerOperations.
        return (address(0), address(0));
    }

    function validInsertPosition(uint256, address, address)
        external pure returns (bool)
    {
        return true;
    }
}

contract MockHintHelpers is IMezoHintHelpers {
    function getApproxHint(uint256, uint256, uint256 seed)
        external pure
        returns (address, uint256, uint256)
    {
        return (address(0), 0, seed);
    }

    function computeNominalCR(uint256 _coll, uint256 _debt)
        external pure returns (uint256)
    {
        if (_debt == 0) return type(uint256).max;
        return (_coll * 1e20) / _debt;
    }

    function computeCR(uint256 _coll, uint256 _debt, uint256 _price)
        external pure returns (uint256)
    {
        if (_debt == 0) return type(uint256).max;
        return (_coll * _price) / _debt;
    }
}

contract MockBorrowerOperations is IMezoBorrowerOperations {
    uint256 public borrowingFeeBps = 10; // 0.1%
    uint256 public constant MIN_NET_DEBT = 200e18;

    function setBorrowingFeeBps(uint256 bps) external { borrowingFeeBps = bps; }

    function openTrove(uint256, address, address) external payable {}
    function addColl(address, address) external payable {}
    function withdrawColl(uint256, address, address) external {}
    function withdrawMUSD(uint256, address, address) external {}
    function repayMUSD(uint256, address, address) external {}
    function closeTrove() external {}
    function adjustTrove(uint256, uint256, bool, address, address) external payable {}
    function claimCollateral() external {}

    function getBorrowingFee(uint256 _debt) external view returns (uint256) {
        return (_debt * borrowingFeeBps) / 10_000;
    }

    function minNetDebt() external pure returns (uint256) {
        return MIN_NET_DEBT;
    }
}

contract MockTroveManager is IMezoTroveManager {
    struct Trove {
        uint256 coll;
        uint256 debt;
        Status status;
    }

    mapping(address => Trove) public troves;
    /// @dev TCR scaled 1e18 (1e18 == 100%).
    uint256 public tcr18 = 2e18; // 200% by default
    bool public _recoveryMode;

    function setTrove(address user, uint256 coll, uint256 debt, Status status) external {
        troves[user] = Trove(coll, debt, status);
    }

    function setTCR(uint256 _tcr18) external { tcr18 = _tcr18; }
    function setRecoveryMode(bool on) external { _recoveryMode = on; }

    function liquidate(address) external {}
    function batchLiquidateTroves(address[] calldata) external {}
    function redeemCollateral(uint256, address, address, address, uint256, uint256) external {}

    function getTroveStatus(address u) external view returns (Status) {
        return troves[u].status;
    }
    function getTroveDebt(address u) external view returns (uint256) {
        return troves[u].debt;
    }
    function getTroveColl(address u) external view returns (uint256) {
        return troves[u].coll;
    }

    function getNominalICR(address u) external view returns (uint256) {
        Trove storage t = troves[u];
        if (t.debt == 0) return type(uint256).max;
        return (t.coll * 1e20) / t.debt;
    }

    function getCurrentICR(address u, uint256 price) external view returns (uint256) {
        Trove storage t = troves[u];
        if (t.debt == 0) return type(uint256).max;
        return (t.coll * price) / t.debt;
    }

    function getTCR(uint256) external view returns (uint256) { return tcr18; }
    function checkRecoveryMode(uint256) external view returns (bool) { return _recoveryMode; }
    function getTroveOwnersCount() external pure returns (uint256) { return 0; }
}

/**
 * @notice Simple deposit/withdraw vault with explicit yield accrual via
 *         `accrueYield`. Used to exercise YieldOptimizer paths.
 */
contract MockMUSDSavingsVault is IMUSDSavingsVault {
    using SafeERC20 for IERC20;

    IERC20  public immutable musd;
    mapping(address => uint256) public principal;
    mapping(address => uint256) public yieldEarned;

    constructor(IERC20 _musd) { musd = _musd; }

    function deposit(uint256 amount) external {
        musd.safeTransferFrom(msg.sender, address(this), amount);
        principal[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external {
        require(principal[msg.sender] >= amount, "MockVault: too much");
        principal[msg.sender] -= amount;
        musd.safeTransfer(msg.sender, amount);
    }

    /// @notice Simulate yield by crediting MUSD to the vault & yieldEarned mapping.
    function accrueYield(address depositor, uint256 amount) external {
        yieldEarned[depositor] += amount;
        // Caller is expected to have minted MUSD into this contract.
    }

    function balanceOf(address account) external view returns (uint256) {
        return principal[account] + yieldEarned[account];
    }

    function getYieldEarned(address account) external view returns (uint256) {
        return yieldEarned[account];
    }
}
