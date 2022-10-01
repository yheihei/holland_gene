require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      accounts: {
        count: 100,
        accountsBalance: "10000000000000000000000"
      },
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.GOERLI_PRIVATE_KEY]
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHER_SCAN_API_KEY,
    }
  },
};
