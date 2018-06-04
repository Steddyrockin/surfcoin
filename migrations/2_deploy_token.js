var Surfcoin = artifacts.require("./Surfcoin.sol");

module.exports = function(deployer, network, accounts) {
    var hardCap = web3.toWei(663345000, "ether");
    deployer.deploy(Surfcoin, hardCap, {gas: 3000000});
};
