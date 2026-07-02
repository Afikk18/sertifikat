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
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            
            const userAddress = await signer.getAddress();
            console.log("Terhubung ke MetaMask:", userAddress);
            
            document.getElementById("btnConnectWallet").innerText = "Terhubung: " + userAddress.substring(0, 6) + "..." + userAddress.substring(38);
            document.getElementById("btnConnectWallet").classList.replace("bg-blue-600", "bg-green-600");
            document.getElementById("btnConnectWallet").classList.replace("hover:bg-blue-700", "hover:bg-green-700");
            
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

// 4. Fungsi Validasi OCR menggunakan Tesseract.js
async function validasiKontenSertifikat(fileGambar) {
    console.log("Memulai pemindaian OCR...");
    try {
        const hasilOCR = await Tesseract.recognize(
            fileGambar,
            'ind', 
            { logger: info => console.log("Progress OCR:", info.progress) }
        );

        const teksMentah = hasilOCR.data.text.toLowerCase();
        const teksBersih = teksMentah.replace(/\s+/g, '');
        
        console.log("Teks Mentah dari OCR:\n", teksMentah);
        console.log("Teks Bersih (Tanpa Spasi):\n", teksBersih);

        const kataKunci = [
            "sertifi", "certifi", "penghargaan", 
            "diberikan", "kepada", "panitia", "peserta", "lorem"
        ];
        
        const gambarValid = kataKunci.some(kata => teksBersih.includes(kata));
        return gambarValid;

    } catch (error) {
        console.error("Gagal melakukan OCR:", error);
        return false;
    }
}

// 5. Fungsi Penerbitan (Issue) & Simpan ke Galeri (DI-MODIFIKASI)
async function handleIssueCertificate(fileInputId, name, course, issuer, ipfsCID) {
    if (!contract) return alert("Hubungkan MetaMask terlebih dahulu!");
    
    const fileInput = document.getElementById(fileInputId);
    
    try {
        const file = fileInput.files[0];
        const certHash = await generateFileHash(file);

        alert("Mengirim transaksi ke jaringan Sepolia. Harap konfirmasi di MetaMask...");
        const tx = await contract.issueCertificate(certHash, name, course, issuer, ipfsCID);
        
        await tx.wait(); 
        alert("Sukses! Sertifikat resmi terdaftar di Blockchain.");
        
        // Simpan data ke memori browser untuk ditampilkan di Galeri
        let riwayat = JSON.parse(localStorage.getItem("riwayatSertifikatWeb3")) || [];
        riwayat.push({
            nama: name,
            kegiatan: course,
            cid: ipfsCID
        });
        localStorage.setItem("riwayatSertifikatWeb3", JSON.stringify(riwayat));
        
        // Segarkan tampilan galeri
        muatGaleriSertifikat();

        document.getElementById("formPublishCert").reset();
    } catch (error) {
        console.error("Detail Error:", error);
        
        // --- MODIFIKASI PESAN ERROR ---
        // Pengecekan apakah error disebabkan oleh revert di smart contract
        if (error.message && error.message.includes("Sertifikat sudah terdaftar")) {
            alert("GAGAL: Sertifikat ini sudah pernah didaftarkan sebelumnya di blockchain (Hash sudah ada).");
        } else if (error.code === 4001) {
            alert("TRANSAKSI DIBATALKAN: Anda menolak konfirmasi di MetaMask.");
        } else {
            alert("GAGAL MENERBITKAN SERTIFIKAT: Pastikan saldo SepoliaETH Anda cukup atau terjadi kesalahan pada jaringan.");
        }
        // ------------------------------
    }
}

// 6. Fungsi Verifikasi (Verify) & Tampilkan UI
async function handleVerifyCertificate(fileInputId) {
    if (!contract) return alert("Hubungkan MetaMask terlebih dahulu!");
    
    const fileInput = document.getElementById(fileInputId);
    if (fileInput.files.length === 0) return alert("Unggah file untuk diverifikasi!");

    // Sembunyikan kotak hasil sebelumnya
    document.getElementById("kotakHasilVerifikasi").classList.add("hidden");

    try {
        const file = fileInput.files[0];
        const certHash = await generateFileHash(file);
        
        const result = await contract.verifyCertificate(certHash);

        if (result.isValid) {
            const detailTeks = `
                <p class="mb-1"><strong>Nama Mahasiswa:</strong> ${result.candidateName}</p>
                <p class="mb-1"><strong>Kegiatan:</strong> ${result.courseName}</p>
                <p class="mb-1"><strong>Penerbit:</strong> ${result.issuer}</p>
                <p class="mb-1"><strong>IPFS CID:</strong> <span class="font-mono text-xs text-blue-600 break-all">${result.ipfsCID}</span></p>
            `;
            document.getElementById("teksDetailSertifikat").innerHTML = detailTeks;

            const ipfsUrl = `https://ipfs.io/ipfs/${result.ipfsCID}`;
            document.getElementById("gambarSertifikat").src = ipfsUrl;

            document.getElementById("kotakHasilVerifikasi").classList.remove("hidden");
        } else {
            alert("❌ SERTIFIKAT TIDAK VALID / BELUM TERDAFTAR!\nData tidak ditemukan di jaringan Blockchain.");
        }
    } catch (error) {
        alert("Gagal memverifikasi. Pastikan sertifikat telah terdaftar.");
        console.error(error);
    }
}

// 7. Fungsi untuk Memuat Galeri (Off-Chain Indexer)
function muatGaleriSertifikat() {
    const galeriContainer = document.getElementById("galeriSertifikat");
    galeriContainer.innerHTML = ""; 

    let riwayat = JSON.parse(localStorage.getItem("riwayatSertifikatWeb3")) || [];

    if (riwayat.length === 0) {
        galeriContainer.innerHTML = `<p class="text-sm text-gray-500 col-span-full text-center py-4">Belum ada sertifikat yang didaftarkan melalui perangkat ini.</p>`;
        return;
    }

    // Urutkan dari yang terbaru
    riwayat.reverse().forEach(cert => {
        const ipfsUrl = `https://ipfs.io/ipfs/${cert.cid}`;
        const card = `
            <div class="border rounded-lg p-3 shadow-sm flex flex-col items-center text-center bg-gray-50 hover:bg-gray-100 transition">
                <img src="${ipfsUrl}" alt="Sertifikat" class="w-full h-32 object-cover rounded mb-3 border border-gray-200 shadow-sm cursor-pointer" onclick="window.open('${ipfsUrl}', '_blank')">
                <h3 class="font-bold text-sm text-gray-800 line-clamp-1" title="${cert.nama}">${cert.nama}</h3>
                <p class="text-xs text-gray-500 line-clamp-1" title="${cert.kegiatan}">${cert.kegiatan}</p>
            </div>
        `;
        galeriContainer.innerHTML += card;
    });
}

// 8. Event Listeners & Inisialisasi
document.getElementById("btnConnectWallet").addEventListener("click", connectBlockchain);

document.getElementById("formPublishCert").addEventListener("submit", async (e) => {
    e.preventDefault();

    const cidPinata = document.getElementById("txtCID").value.trim();
    if (!cidPinata.startsWith("Qm") || cidPinata.length !== 46) {
        alert("Gagal: Format IPFS CID tidak valid!\nPastikan diawali dengan 'Qm' dan panjangnya 46 karakter.");
        return;
    }

    const fileInput = document.getElementById("inputFileSertifikat");
    if (fileInput.files.length === 0) {
        alert("Pilih file sertifikat!");
        return;
    }
    const file = fileInput.files[0];

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Memindai Gambar (OCR)...";
    submitBtn.disabled = true;

    const isSertifikatAsli = await validasiKontenSertifikat(file);

    submitBtn.innerText = originalBtnText;
    submitBtn.disabled = false;

    if (!isSertifikatAsli) {
        alert("PENDAFTARAN DITOLAK ❌\nSistem mendeteksi bahwa file yang Anda unggah BUKAN dokumen sertifikat yang valid.");
        return; 
    }

    alert("Validasi Gambar Sukses ✅\nMempersiapkan transaksi Blockchain...");

    const namaMhs = document.getElementById("txtNama").value;
    const namaKegiatan = document.getElementById("txtKegiatan").value;
    const namaPenerbit = document.getElementById("txtPenerbit").value;

    await handleIssueCertificate("inputFileSertifikat", namaMhs, namaKegiatan, namaPenerbit, cidPinata);
});

document.getElementById("btnCheckValidation").addEventListener("click", async () => {
    const btnCheck = document.getElementById("btnCheckValidation");
    const originalText = btnCheck.innerText;
    btnCheck.innerText = "Memverifikasi...";
    
    await handleVerifyCertificate("inputFileCheck");
    
    btnCheck.innerText = originalText;
});

// Panggil fungsi galeri saat website pertama kali dibuka
window.onload = muatGaleriSertifikat;