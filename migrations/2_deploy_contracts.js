const NewBlock = artifacts.require("./NewBlock.sol");

module.exports = function(deployer) {
  deployer.deploy(NewBlock);
};
