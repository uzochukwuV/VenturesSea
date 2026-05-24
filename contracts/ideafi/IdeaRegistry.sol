// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IIdeaFi.sol";

/**
 * @title IdeaRegistry
 * @notice Central registry that stores every idea and coordinates deployment
 *         of per-idea contracts via IdeaFactory.
 */
contract IdeaRegistry is Ownable {

    // ── Enums ────────────────────────────────────────────────────────────────

    enum IdeaType   { ORIGINAL, REQUESTED }
    enum IdeaStatus { OPEN, BUILDER_SELECTION, ACTIVE, MVP_SUBMITTED, LIVE, CANCELLED }

    // ── Structs ──────────────────────────────────────────────────────────────

    struct Idea {
        uint256   ideaId;
        address   creator;
        bytes32   metadataHash;
        IdeaType  ideaType;
        IdeaStatus status;
        address   fundingPool;
        address   ideaToken;
        address   builderAgreement;
        address   milestoneContract;
        address   revenueReport;
        address   ideaDAO;
        uint256   createdAt;
    }

    // ── State ────────────────────────────────────────────────────────────────

    mapping(uint256 => Idea) public ideas;
    uint256 public ideaCount;
    address public factory;

    // ── Events ───────────────────────────────────────────────────────────────

    event IdeaCreated(uint256 indexed ideaId, address indexed creator, IdeaType ideaType);
    event StatusUpdated(uint256 indexed ideaId, IdeaStatus status);
    event ContractsLinked(uint256 indexed ideaId);
    event FactorySet(address indexed factory);

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyFactory() {
        require(msg.sender == factory, "IdeaRegistry: caller is not the factory");
        _;
    }

    modifier ideaExists(uint256 ideaId) {
        require(ideaId > 0 && ideaId <= ideaCount, "IdeaRegistry: idea does not exist");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Set the IdeaFactory address.
     */
    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "IdeaRegistry: zero address");
        factory = _factory;
        emit FactorySet(_factory);
    }

    // ── Idea creation ────────────────────────────────────────────────────────

    /**
     * @notice Submit a new idea and trigger deployment of all per-idea contracts.
     */
    function createIdea(bytes32 metadataHash, IdeaType ideaType) external {
        require(factory != address(0), "IdeaRegistry: factory not set");

        ideaCount += 1;
        uint256 ideaId = ideaCount;

        ideas[ideaId] = Idea({
            ideaId:           ideaId,
            creator:          msg.sender,
            metadataHash:     metadataHash,
            ideaType:         ideaType,
            status:           IdeaStatus.OPEN,
            fundingPool:      address(0),
            ideaToken:        address(0),
            builderAgreement: address(0),
            milestoneContract: address(0),
            revenueReport:    address(0),
            ideaDAO:          address(0),
            createdAt:        block.timestamp
        });

        emit IdeaCreated(ideaId, msg.sender, ideaType);

        IIdeaFactory(factory).deployIdeaContracts(ideaId, msg.sender, address(0));
    }

    // ── Factory callback ─────────────────────────────────────────────────────

    /**
     * @notice Persist per-idea contract addresses. Only callable by the factory.
     */
    function linkContracts(
        uint256 ideaId,
        address pool,
        address token,
        address builderAgreement,
        address milestone,
        address revenueReport,
        address ideaDAO
    )
        external
        onlyFactory
        ideaExists(ideaId)
    {
        Idea storage idea = ideas[ideaId];
        idea.fundingPool       = pool;
        idea.ideaToken         = token;
        idea.builderAgreement  = builderAgreement;
        idea.milestoneContract = milestone;
        idea.revenueReport     = revenueReport;
        idea.ideaDAO           = ideaDAO;

        emit ContractsLinked(ideaId);
    }

    // ── Status updates ───────────────────────────────────────────────────────

    /**
     * @notice Transition an idea's status. Only callable by that idea's IdeaDAO.
     */
    function updateStatus(uint256 ideaId, IdeaStatus status)
        external
        ideaExists(ideaId)
    {
        Idea storage idea = ideas[ideaId];
        require(
            msg.sender == idea.ideaDAO,
            "IdeaRegistry: caller is not the idea's IdeaDAO"
        );
        idea.status = status;
        emit StatusUpdated(ideaId, uint8(status) == 3 ? IdeaStatus.CANCELLED : status);
    }

    // ── View ─────────────────────────────────────────────────────────────────

    function getIdea(uint256 ideaId) external view ideaExists(ideaId) returns (Idea memory) {
        return ideas[ideaId];
    }

    function getIdeaDAO(uint256 ideaId) external view ideaExists(ideaId) returns (address) {
        return ideas[ideaId].ideaDAO;
    }

    function getFundingPool(uint256 ideaId) external view ideaExists(ideaId) returns (address) {
        return ideas[ideaId].fundingPool;
    }

    function getBuilderAgreement(uint256 ideaId) external view ideaExists(ideaId) returns (address) {
        return ideas[ideaId].builderAgreement;
    }

    function getMilestone(uint256 ideaId) external view ideaExists(ideaId) returns (address) {
        return ideas[ideaId].milestoneContract;
    }

    function getRevenueReport(uint256 ideaId) external view ideaExists(ideaId) returns (address) {
        return ideas[ideaId].revenueReport;
    }
}
