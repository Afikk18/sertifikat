// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertificateVerification {
    struct Certificate {
        string candidateName;
        string courseName;
        string issuer;
        string ipfsCID;      // Menampung CID dari IPFS untuk file fisik PDF sertifikat
        uint256 issueDate;
        bool isValid;
    }

    // Mapping dari hash sertifikat (SHA-256) ke data struktur sertifikat
    mapping(bytes32 => Certificate) public certificates;
    
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Hanya pemilik kontrak yang dapat menjalankan ini");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // 1. Fungsi untuk mendaftarkan/menerbitkan sertifikat baru ke Blockchain beserta IPFS CID
    function issueCertificate(
        bytes32 _certHash,
        string memory _name,
        string memory _course,
        string memory _issuer,
        string memory _ipfsCID
    ) public onlyOwner {
        require(!certificates[_certHash].isValid, "Sertifikat sudah terdaftar");
        
        certificates[_certHash] = Certificate({
            candidateName: _name,
            courseName: _course,
            issuer: _issuer,
            ipfsCID: _ipfsCID,
            issueDate: block.timestamp,
            isValid: true
        });
    }

    // 2. Fungsi untuk memverifikasi keaslian sertifikat melalui hash unik (Akses Publik)
    function verifyCertificate(bytes32 _certHash) public view returns (
        bool isValid,
        string memory candidateName,
        string memory courseName,
        string memory issuer,
        string memory ipfsCID,
        uint256 issueDate
    ) {
        Certificate memory cert = certificates[_certHash];
        require(cert.issueDate != 0, "Sertifikat tidak ditemukan");
        return (cert.isValid, cert.candidateName, cert.courseName, cert.issuer, cert.ipfsCID, cert.issueDate);
    }

    // 3. Fungsi untuk mencabut validitas sertifikat yang bermasalah (Hanya Admin/Owner)
    function revokeCertificate(bytes32 _certHash) public onlyOwner {
        require(certificates[_certHash].issueDate != 0, "Sertifikat tidak ditemukan");
        require(certificates[_certHash].isValid, "Sertifikat sudah tidak aktif");
        
        certificates[_certHash].isValid = false;
    }
}