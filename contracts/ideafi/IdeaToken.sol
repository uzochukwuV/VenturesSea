// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./SimpleOwnable.sol";

// Use ABI encoder v2 for flexible constructor
pragma abicoder v2;

/**
 * @title IdeaToken
 * @notice ERC20 token representing ownership/participation in a single IdeaFi idea.
 *         Modified to support ERC-1167 minimal proxy cloning.
 */
contract IdeaToken is ERC20, Initializable, SimpleOwnable {

    // ── State ────────────────────────────────────────────────────────────────

    address public fundingPool;
    address public protocolMarket;
    bool    private _fundingPoolSet;

    /// @notice Custom name and symbol stored in clone storage to bypass master copy constructor limitations.
    string private _customName;
    string private _customSymbol;

    /// @notice Flag to indicate if contract was initialized via constructor (for direct deployment).
    bool private _initializedViaConstructor;

    /// @notice Addresses that are allowed to send or receive this token.
    mapping(address => bool) public transferWhitelist;

    // ── Snapshot storage ─────────────────────────────────────────────────────

    uint256 public currentSnapshotId;

    /// snapshots[id][account] = balance of account at snapshot `id`
    mapping(uint256 => mapping(address => uint256)) public snapshots;

    /// Whether we have already captured a particular account in the current
    /// snapshot window (so we only record the *pre-change* balance once).
    mapping(uint256 => mapping(address => bool)) private _snapshotted;

    // ── Events ───────────────────────────────────────────────────────────────

    event WhitelistAdded(address indexed account);
    event WhitelistRemoved(address indexed account);
    event Snapshot(uint256 indexed snapshotId);

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyFundingPool() {
        require(msg.sender == fundingPool, "IdeaToken: caller is not the funding pool");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    /**
     * @dev Flexible constructor for both direct deployment and proxy patterns.
     *      For direct deployment (tests): pass (name, symbol, protocolMarket, owner)
     *      For proxy pattern: pass empty values and use initialize() afterwards
     *      Note: Custom name/symbol are stored in storage for overrides regardless of constructor values.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address _protocolMarket,
        address _owner
    ) ERC20(name_, symbol_) {
        // Always store in storage for direct deployment
        _customName = name_;
        _customSymbol = symbol_;
        
        if (bytes(name_).length > 0 && _protocolMarket != address(0)) {
            // Direct deployment (tests): full initialization
            protocolMarket = _protocolMarket;
            _initializedViaConstructor = true;

            // Initialize owner (for direct deployment)
            _initializeOwner(_owner);

            // Whitelist zero address (mints/burns) and protocolMarket
            _addToWhitelist(address(0));
            _addToWhitelist(_protocolMarket);
        }
        // For proxy pattern, constructor does minimal work - use initialize() instead
    }

    // Allow proxy deploys to disable initializer
    function disableInitializers() external {
        _disableInitializers();
    }

    // ── Initializer ──────────────────────────────────────────────────────────

    /**
     * @notice Initialize the clone instance. Can only be called once.
     */
    function initialize(
        string calldata name_,
        string calldata symbol_,
        address _protocolMarket,
        address _fundingPool,
        address _dao
    ) external initializer {
        require(_protocolMarket != address(0), "IdeaToken: zero protocolMarket");
        require(_fundingPool != address(0), "IdeaToken: zero fundingPool");
        require(_dao != address(0), "IdeaToken: zero dao");

        _customName = name_;
        _customSymbol = symbol_;
        protocolMarket = _protocolMarket;
        fundingPool = _fundingPool;
        _fundingPoolSet = true;

        // Initialize SimpleOwnable setting ownership to IdeaDAO
        _initializeOwner(_dao);

        // Whitelist zero address (mints/burns), market, and funding pool
        _addToWhitelist(address(0));
        _addToWhitelist(_protocolMarket);
        _addToWhitelist(_fundingPool);
    }

    /// @notice Initialize fundingPool for direct deployment (test compatibility).
    /// @dev Sets the fundingPool address and adds it to the whitelist.
    function initFundingPool(address _fundingPool) external {
        require(_fundingPool != address(0), "IdeaToken: zero fundingPool");
        require(!_fundingPoolSet, "IdeaToken: fundingPool already set");
        fundingPool = _fundingPool;
        _fundingPoolSet = true;
        _addToWhitelist(_fundingPool);
    }

    // ── Name & Symbol Overrides ──────────────────────────────────────────────

    function name() public view override returns (string memory) {
        return _customName;
    }

    function symbol() public view override returns (string memory) {
        return _customSymbol;
    }

    // ── Whitelist management ─────────────────────────────────────────────────

    function addToWhitelist(address account) external onlyOwner {
        _addToWhitelist(account);
    }

    function removeFromWhitelist(address account) external onlyOwner {
        transferWhitelist[account] = false;
        emit WhitelistRemoved(account);
    }

    function _addToWhitelist(address account) internal {
        transferWhitelist[account] = true;
        emit WhitelistAdded(account);
    }

    // ── Minting & Burning ────────────────────────────────────────────────────

    /// @notice Mint tokens to a contributor — callable only by the FundingPool.
    function mint(address to, uint256 amount) external onlyFundingPool {
        _mint(to, amount);
    }

    /// @notice Burn tokens from a contributor — callable only by the FundingPool (on withdrawal).
    function burn(address from, uint256 amount) external onlyFundingPool {
        _burn(from, amount);
    }

    /// @notice Mint builder allocation — called by IdeaDAO via governance.
    function mintBuilderAllocation(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // ── Snapshot ─────────────────────────────────────────────────────────────

    /**
     * @notice Create a new snapshot of current balances.
     * @return The new snapshot id.
     */
    function snapshot() external onlyOwner returns (uint256) {
        currentSnapshotId += 1;
        emit Snapshot(currentSnapshotId);
        return currentSnapshotId;
    }

    /**
     * @notice Return the balance of `account` at the time snapshot `snapshotId` was taken.
     */
    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256) {
        require(snapshotId > 0 && snapshotId <= currentSnapshotId, "IdeaToken: invalid snapshotId");

        if (_snapshotted[snapshotId][account]) {
            return snapshots[snapshotId][account];
        }
        return balanceOf(account);
    }

    // ── Internal overrides ───────────────────────────────────────────────────

    /**
     * @dev Hook called by ERC20 before any token movement.
     */
    function _update(address from, address to, uint256 amount) internal override {
        // ── Snapshot capture ─────────────────────────────────────────────────
        if (currentSnapshotId > 0) {
            _captureSnapshot(from);
            _captureSnapshot(to);
        }

        // ── Whitelist enforcement ─────────────────────────────────────────────
        if (from != address(0) && to != address(0)) {
            require(
                transferWhitelist[from] || transferWhitelist[to],
                "IdeaToken: transfer not whitelisted"
            );
        }

        super._update(from, to, amount);
    }

    /**
     * @dev Record the current balance of `account` into the active snapshot
     */
    function _captureSnapshot(address account) internal {
        if (account == address(0)) return;
        uint256 id = currentSnapshotId;
        if (!_snapshotted[id][account]) {
            _snapshotted[id][account] = true;
            snapshots[id][account] = balanceOf(account);
        }
    }
}
