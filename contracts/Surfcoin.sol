pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/StandardBurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/CappedToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";

contract Surfcoin is StandardBurnableToken, CappedToken, PausableToken {

  string public name;
  string public symbol;
  uint8 public decimals;

  constructor(uint256 _cap) public CappedToken(_cap) {
    name = "SurfCoin";
    symbol = "SURF";
    decimals = 18;
  }
}
