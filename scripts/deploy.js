const hre = require("hardhat");

async function main() {
  const Contract = await hre.ethers.getContractFactory("CertificateVerification");
  const deployed = await Contract.deploy();
  
  // Menunggu kontrak benar-benar ter-deploy di jaringan
  await deployed.deployed();
  
  console.log("Kontrak berhasil di-deploy ke alamat:", deployed.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});