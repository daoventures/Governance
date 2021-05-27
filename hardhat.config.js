const { solidity } = require("ethereum-waffle");

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('dotenv').config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork:"hardhat",

  networks: {
    hardhat: {
      gas: 12500000,  //default:9500000
      blockGasLimit: 12500000,  //default:9500000
      accounts: {
        count: 1000  //default:20
      }
    },
    kovan: {
      url: process.env.KOVAN_URL,
      from: process.env.KOVAN_ACCOUNT,
      accounts: {
        mnemonic: process.env.KOVAN_ACCOUNT_MNEMONIC
      }
    },

    mainnet: {
      url: process.env.MAINNET_URL,
      from: process.env.MAINNET_ACCOUNT,
      accounts: {
        mnemonic: process.env.MAINNET_ACCOUNT_MNEMONIC
      }
    }
  },

  solidity: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    compilers: [
      {
      version: "0.7.6"
      }
    ]
  },

  mocha: {
    timeout: 2000000  // default: 20000
  },

  gasReporter: {
    showTimeSpent: true
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    // apiKey: process.env.BSCSCAN_API_KEY,
  },
};

