// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ---------------------------------------------------------------------------
// ProtocolMarket
// ---------------------------------------------------------------------------
// Facilitates peer-to-peer secondary market trades of IdeaTokens denominated
// in mUSD.  ProtocolMarket must be on each IdeaToken's transfer whitelist
// (this is guaranteed at IdeaToken construction time).
// ---------------------------------------------------------------------------

contract ProtocolMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    uint256 public constant PROTOCOL_FEE_BPS = 200; // 2%

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    struct TradeOffer {
        uint256 offerId;
        address seller;
        uint256 ideaId;
        address ideaToken;
        uint256 tokenAmount;
        uint256 musdAskPrice;
        uint256 expiry;
        bool active;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    address public immutable protocolTreasury;
    address public immutable musd;

    uint256 public offerCount;
    mapping(uint256 => TradeOffer) public offers;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event OfferCreated(
        uint256 indexed offerId,
        address indexed seller,
        uint256 ideaId,
        address ideaToken,
        uint256 tokenAmount,
        uint256 musdAskPrice,
        uint256 expiry
    );
    event OfferAccepted(uint256 indexed offerId, address indexed buyer, uint256 musdAskPrice);
    event OfferCancelled(uint256 indexed offerId, address indexed seller);
    event OfferExpired(uint256 indexed offerId, address indexed seller);

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(address _protocolTreasury, address _musd) {
        require(_protocolTreasury != address(0), "ProtocolMarket: zero treasury");
        require(_musd != address(0), "ProtocolMarket: zero musd");
        protocolTreasury = _protocolTreasury;
        musd = _musd;
    }

    // -----------------------------------------------------------------------
    // Seller actions
    // -----------------------------------------------------------------------

    /// @notice List IdeaTokens for sale.
    /// @param ideaId       The idea the token belongs to (informational).
    /// @param ideaToken    Address of the IdeaToken ERC-20.
    /// @param tokenAmount  Amount of IdeaTokens to list.
    /// @param musdAskPrice Total mUSD price the seller wants.
    /// @param duration     Listing validity window in seconds.
    function createOffer(
        uint256 ideaId,
        address ideaToken,
        uint256 tokenAmount,
        uint256 musdAskPrice,
        uint256 duration
    ) external {
        require(ideaToken != address(0), "ProtocolMarket: zero ideaToken");
        require(tokenAmount > 0, "ProtocolMarket: zero tokenAmount");
        require(musdAskPrice > 0, "ProtocolMarket: zero askPrice");
        require(duration > 0, "ProtocolMarket: zero duration");

        uint256 expiry = block.timestamp + duration;

        // Escrow IdeaTokens — requires ProtocolMarket to be whitelisted on the token
        IERC20(ideaToken).transferFrom(msg.sender, address(this), tokenAmount);

        uint256 offerId = offerCount++;
        offers[offerId] = TradeOffer({
            offerId: offerId,
            seller: msg.sender,
            ideaId: ideaId,
            ideaToken: ideaToken,
            tokenAmount: tokenAmount,
            musdAskPrice: musdAskPrice,
            expiry: expiry,
            active: true
        });

        emit OfferCreated(offerId, msg.sender, ideaId, ideaToken, tokenAmount, musdAskPrice, expiry);
    }

    /// @notice Cancel an active offer and reclaim escrowed tokens.
    function cancelOffer(uint256 offerId) external nonReentrant {
        TradeOffer storage offer = offers[offerId];
        require(offer.active, "ProtocolMarket: offer not active");
        require(msg.sender == offer.seller, "ProtocolMarket: not seller");

        offer.active = false;
        IERC20(offer.ideaToken).transfer(offer.seller, offer.tokenAmount);

        emit OfferCancelled(offerId, offer.seller);
    }

    // -----------------------------------------------------------------------
    // Buyer / public actions
    // -----------------------------------------------------------------------

    /// @notice Accept an active, non-expired offer.
    function acceptOffer(uint256 offerId) external nonReentrant {
        TradeOffer storage offer = offers[offerId];
        require(offer.active, "ProtocolMarket: offer not active");
        require(block.timestamp <= offer.expiry, "ProtocolMarket: offer expired");

        offer.active = false;

        uint256 askPrice = offer.musdAskPrice;
        uint256 fee = (askPrice * PROTOCOL_FEE_BPS) / 10000;
        uint256 net = askPrice - fee;

        address seller = offer.seller;
        address token = offer.ideaToken;
        uint256 tokenAmt = offer.tokenAmount;

        // Pull full ask price from buyer in mUSD
        IERC20(musd).safeTransferFrom(msg.sender, address(this), askPrice);

        // Distribute mUSD: fee to treasury, net to seller
        IERC20(musd).safeTransfer(protocolTreasury, fee);
        IERC20(musd).safeTransfer(seller, net);

        // Deliver IdeaTokens to buyer — ProtocolMarket is whitelisted on IdeaToken
        IERC20(token).transfer(msg.sender, tokenAmt);

        emit OfferAccepted(offerId, msg.sender, askPrice);
    }

    /// @notice Allow anyone to expire an overdue offer and return tokens to seller.
    function expireOffer(uint256 offerId) external {
        TradeOffer storage offer = offers[offerId];
        require(offer.active, "ProtocolMarket: offer not active");
        require(block.timestamp > offer.expiry, "ProtocolMarket: offer not yet expired");

        address seller = offer.seller;
        address token = offer.ideaToken;
        uint256 tokenAmt = offer.tokenAmount;

        offer.active = false;
        IERC20(token).transfer(seller, tokenAmt);

        emit OfferExpired(offerId, seller);
    }
}
