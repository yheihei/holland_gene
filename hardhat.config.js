require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      accounts: {
        count: 100,
        accountsBalance: "10000000000000000000000"
      },
      namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
        },
      },
    }
  }
};
