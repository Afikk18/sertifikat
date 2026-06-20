import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers"; // Kita pakai versi lama yang stabil

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/PI_JszCuDm5Kmng6ZdRAi",
      accounts: ["0xe435af72ea00637ee5943c3ac5af7235f7fce345342c2979bd7d894e4c439e81"]
    }
  }
};

export default config;