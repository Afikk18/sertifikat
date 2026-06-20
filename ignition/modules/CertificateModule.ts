import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CertificateModule = buildModule("CertificateModule", (m) => {
  // Menargetkan kontrak utama kelompokmu yang sudah sukses di-compile tadi
  const certificate = m.contract("CertificateVerification");

  return { certificate };
});

export default CertificateModule;