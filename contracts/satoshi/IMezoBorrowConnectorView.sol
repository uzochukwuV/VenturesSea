// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IMezoBorrowConnectorView
 * @notice Read surface of {MezoBorrowConnector}. Used by SatoshiVentures
 *         contracts that depend on Mezo state without coupling to the full
 *         connector implementation.
 */
interface IMezoBorrowConnectorView {
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
        );

    function isLiquidationRisk(address _user) external view returns (bool);

    function getLiquidationPrice(address _user) external view returns (uint256);

    function getRequiredCollateral(
        uint256 _debt,
        uint256 _targetIcrBps,
        uint256 _btcPrice18
    ) external view returns (uint256);

    function getBtcPrice() external view returns (uint256);
}
