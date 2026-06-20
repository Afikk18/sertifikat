// 1. Konfigurasi Kontrak (Alamat Sepolia yang sudah di-deploy)
const contractAddress = "0xe750f9922ebb0eb33ecac10f3fbb006ce6a6d28f";

const contractABI = [
    "function issueCertificate(bytes32 _certHash, string memory _name, string memory _course, string memory _issuer, string memory _ipfsCID) public",
    "function verifyCertificate(bytes32 _certHash) public view returns (bool isValid, string memory candidateName, string memory courseName, string memory issuer, string memory ipfsCID, uint256 issueDate)",
    "function revokeCertificate(bytes32 _certHash) public"
];

let contract;
let signer;

// 2. Fungsi Koneksi Dompet Kripto (MetaMask)
async function connectBlockchain() {
    if (window.ethereum) {
        try {
            // Meminta akses akun
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            
            const userAddress = await signer.getAddress();
            console.log("Terhubung ke MetaMask:", userAddress);
            alert("Koneksi Blockchain Berhasil!\nAlamat: " + userAddress);
        } catch (error) {
            console.error("Koneksi gagal:", error);
            alert("Gagal terhubung ke MetaMask. Pastikan Anda di jaringan Sepolia.");
        }
    } else {
        alert("MetaMask tidak ditemukan. Silakan pasang ekstensi MetaMask!");
    }
}

// 3. Fungsi Utilitas: Mengubah File menjadi Hash SHA-256
function generateFileHash(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            crypto.subtle.digest("SHA-256", arrayBuffer).then((hashBuffer) => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
                resolve(hashHex);
            }).catch(reject);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

// 4. Fungsi Penerbitan (Issue)
async function handleIssueCertificate(fileInputId, name, course, issuer, ipfsCID) {
    if (!contract) return alert("Hubungkan MetaMask terlebih dahulu!");
    
    const fileInput = document.getElementById(fileInputId);
    if (fileInput.files.length === 0) return alert("Pilih file sertifikat!");
    
    try {
        const file = fileInput.files[0];
        const certHash = await generateFileHash(file);

        alert("Mengirim transaksi ke jaringan Sepolia. Harap konfirmasi di MetaMask...");
        const tx = await contract.issueCertificate(certHash, name, course, issuer, ipfsCID);
        
        await tx.wait(); // Menunggu blok dikonfirmasi
        alert("Sukses! Sertifikat resmi terdaftar di Blockchain.");
    } catch (error) {
        console.error(error);
        alert("Gagal menerbitkan sertifikat. Pastikan saldo SepoliaETH Anda cukup.");
    }
}

// 5. Fungsi Verifikasi (Verify)
async function handleVerifyCertificate(fileInputId) {
    if (!contract) return alert("Hubungkan MetaMask terlebih dahulu!");
    
    const fileInput = document.getElementById(fileInputId);
    if (fileInput.files.length === 0) return alert("Unggah file untuk diverifikasi!");

    try {
        const file = fileInput.files[0];
        const certHash = await generateFileHash(file);
        
        const result = await contract.verifyCertificate(certHash);

        if (result.isValid) {
            alert(`✅ SERTIFIKAT ASLI!\n\nNama: ${result.candidateName}\nKegiatan: ${result.courseName}\nPenerbit: ${result.issuer}\nCID: ${result.ipfsCID}`);
        } else {
            alert("❌ SERTIFIKAT TIDAK VALID!");
        }
    } catch (error) {
        alert("Gagal memverifikasi. Pastikan file sesuai.");
    }
}

// 6. Event Listeners
document.getElementById("btnConnectWallet").addEventListener("click", connectBlockchain);

document.getElementById("formPublishCert").addEventListener("submit", async (e) => {
    e.preventDefault();
    const namaMhs = document.getElementById("txtNama").value;
    const namaKegiatan = document.getElementById("txtKegiatan").value;
    const namaPenerbit = document.getElementById("txtPenerbit").value;
    const cidPinata = document.getElementById("txtCID").value; 
    await handleIssueCertificate("inputFileSertifikat", namaMhs, namaKegiatan, namaPenerbit, cidPinata);
});

document.getElementById("btnCheckValidation").addEventListener("click", async () => {
    await handleVerifyCertificate("inputFileCheck");
});