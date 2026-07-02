// // 1. Konfigurasi Kontrak (Ubah baris 2 menjadi seperti di bawah ini)
const contractAddressOld = "0xe750f9922ebb0eb33ecac10f3fbb006ce6a6d28f"; // Kontrak Pertama
const contractAddressNew = "0x1234567890abcdef1234567890abcdef12345678"; // Masukkan alamat kontrak kedua di sini

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
            
            // 1. Ambil alamat wallet user terlebih dahulu
            const userAddress = await signer.getAddress();
            console.log("Terhubung ke MetaMask:", userAddress);
            
            // 2. Tentukan contract address secara dinamis berdasarkan wallet
            let activeContractAddress;
            
            // Cek apakah yang login adalah akun1 (0x81b74...)
            if (userAddress.toLowerCase() === "0x81b744ce342c862e0d188c6d6ddbd6815bb74934".toLowerCase()) {
                activeContractAddress = contractAddressNew;
                console.log("Menggunakan Kontrak Baru (akun1)");
            } else {
                activeContractAddress = contractAddressOld;
                console.log("Menggunakan Kontrak Lama");
            }
            
            // 3. Buat objek kontrak menggunakan alamat yang aktif
            contract = new ethers.Contract(activeContractAddress, contractABI, signer);
            
            // Penyesuaian warna tombol dengan desain modern (Indigo ke Emerald)
            const btnConnect = document.getElementById("btnConnectWallet");
            btnConnect.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Terhubung: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
            btnConnect.classList.replace("bg-indigo-600", "bg-emerald-600");
            btnConnect.classList.replace("hover:bg-indigo-700", "hover:bg-emerald-700");
            
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

        const teksBersih = hasilOCR.data.text.toLowerCase().replace(/\s+/g, '');
        
        const kataKunci = [
            "sertifi", "certifi", "penghargaan", 
            "diberikan", "kepada", "panitia", "peserta", "lorem"
        ];
        
        return kataKunci.some(kata => teksBersih.includes(kata));
    } catch (error) {
        console.error("Gagal melakukan OCR:", error);
        return false;
    }
}

// 5. FITUR BARU: Fungsi Unggah Otomatis ke API IPFS Desktop Lokal (Port 5001)
async function uploadToLocalIPFS(fileGambar) {
    const formData = new FormData();
    formData.append('file', fileGambar);

    try {
        const res = await fetch("http://127.0.0.1:5001/api/v0/add", {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            throw new Error("Gagal terhubung ke API IPFS Desktop Lokal. Pastikan CORS sudah dikonfigurasi.");
        }

        const resData = await res.json();
        return resData.Hash; // Mengembalikan CID (Qm...)

    } catch (error) {
        console.error("Error Upload IPFS Lokal:", error);
        return null;
    }
}

// 6. Fungsi Penerbitan (Issue) & Simpan ke Galeri
async function handleIssueCertificate(fileInputId, name, course, issuer, ipfsCID) {
    if (!contract) return alert("Hubungkan MetaMask terlebih dahulu!");
    
    const fileInput = document.getElementById(fileInputId);
    
    try {
        const file = fileInput.files[0];
        const certHash = await generateFileHash(file);

        console.log("Mengirim transaksi ke Sepolia...");
        const tx = await contract.issueCertificate(certHash, name, course, issuer, ipfsCID);
        
        await tx.wait(); 
        alert("Sukses! Sertifikat resmi terdaftar di Blockchain & IPFS Lokal.");
        
        // Simpan ke localStorage
        let riwayat = JSON.parse(localStorage.getItem("riwayatSertifikatWeb3")) || [];
        riwayat.push({
            nama: name,
            kegiatan: course,
            cid: ipfsCID
        });
        localStorage.setItem("riwayatSertifikatWeb3", JSON.stringify(riwayat));
        
        muatGaleriSertifikat();
        document.getElementById("formPublishCert").reset();
        document.getElementById("txtCID").value = ""; // Kosongkan tampilan CID

    } catch (error) {
        console.error("Detail Error:", error);
        if (error.message && error.message.includes("Sertifikat sudah terdaftar")) {
            alert("GAGAL: Sertifikat ini sudah pernah didaftarkan sebelumnya di blockchain (Hash sudah ada).");
        } else if (error.code === 4001) {
            alert("TRANSAKSI DIBATALKAN: Anda menolak konfirmasi di MetaMask.");
        } else {
            alert("GAGAL MENERBITKAN SERTIFIKAT: Pastikan saldo SepoliaETH cukup.");
        }
    }
}

// 7. Fungsi Verifikasi (Verify) & Tampilkan UI (Optimasi Gateway dweb.link)
async function handleVerifyCertificate(fileInputId) {
    if (!contract) return alert("Hubungkan MetaMask terlebih dahulu!");
    
    const fileInput = document.getElementById(fileInputId);
    if (fileInput.files.length === 0) return alert("Unggah file untuk diverifikasi!");

    document.getElementById("kotakHasilVerifikasi").classList.add("hidden");

    // Timeout 12 detik mencegah infinite loading
    const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: Jaringan Sepolia sedang lambat.")), 12000)
    );

    try {
        const file = fileInput.files[0];
        const certHash = await generateFileHash(file);
        
        const result = await Promise.race([contract.verifyCertificate(certHash), timeout]);

        if (result.isValid) {
            const detailTeks = `
                <p class="mb-1"><strong>Nama Mahasiswa:</strong> ${result.candidateName}</p>
                <p class="mb-1"><strong>Kegiatan:</strong> ${result.courseName}</p>
                <p class="mb-1"><strong>Penerbit:</strong> ${result.issuer}</p>
                <p class="mb-1"><strong>IPFS CID:</strong> <span class="font-mono text-xs text-indigo-600 break-all">${result.ipfsCID}</span></p>
            `;
            document.getElementById("teksDetailSertifikat").innerHTML = detailTeks;

            // Menggunakan Gateway dweb.link agar gambar cepat muncul
            const ipfsUrl = `https://dweb.link/ipfs/${result.ipfsCID}`;
            document.getElementById("gambarSertifikat").src = ipfsUrl;

            document.getElementById("kotakHasilVerifikasi").classList.remove("hidden");
        } else {
            alert("❌ SERTIFIKAT TIDAK VALID / BELUM TERDAFTAR!");
        }
    } catch (error) {
        alert("Gagal memverifikasi: " + error.message);
        console.error(error);
    }
}

// 8. Fungsi untuk Memuat Galeri (Off-Chain Indexer dengan Desain Modern)
function muatGaleriSertifikat() {
    const galeriContainer = document.getElementById("galeriSertifikat");
    if (!galeriContainer) return;
    galeriContainer.innerHTML = ""; 

    let riwayat = JSON.parse(localStorage.getItem("riwayatSertifikatWeb3")) || [];

    if (riwayat.length === 0) {
        galeriContainer.innerHTML = `<p class="text-sm text-slate-500 col-span-full text-center py-4">Belum ada sertifikat yang didaftarkan melalui perangkat ini.</p>`;
        return;
    }

    [...riwayat].reverse().forEach(cert => {
        const ipfsUrl = `https://dweb.link/ipfs/${cert.cid}`;
        const card = `
            <div class="border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center text-center bg-white hover:bg-slate-50 hover:shadow-md transition-all duration-200 group">
                <div class="w-full h-32 mb-3 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 relative cursor-pointer" onclick="window.open('${ipfsUrl}', '_blank')">
                    <img src="${ipfsUrl}" alt="Sertifikat" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300">
                </div>
                <h3 class="font-bold text-sm text-slate-800 line-clamp-1 w-full" title="${cert.nama}">${cert.nama}</h3>
                <p class="text-xs text-slate-500 line-clamp-1 w-full mt-0.5" title="${cert.kegiatan}">${cert.kegiatan}</p>
            </div>
        `;
        galeriContainer.innerHTML += card;
    });
}

// 9. Event Listeners & Inisialisasi
document.getElementById("btnConnectWallet").addEventListener("click", connectBlockchain);

// Alur Baru Pendaftaran Terintegrasi IPFS Lokal
document.getElementById("formPublishCert").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("inputFileSertifikat");
    if (fileInput.files.length === 0) return alert("Pilih file sertifikat!");
    const file = fileInput.files[0];

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    
    // Tahap 1: Validasi OCR
    submitBtn.innerText = "1/3 Memindai Gambar (OCR)...";
    submitBtn.disabled = true;
    
    const isSertifikatAsli = await validasiKontenSertifikat(file);
    if (!isSertifikatAsli) {
        alert("PENDAFTARAN DITOLAK ❌\nSistem mendeteksi bahwa file yang Anda unggah BUKAN dokumen sertifikat yang valid.");
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
        return; 
    }

    // Tahap 2: Upload otomatis ke IPFS Desktop
    submitBtn.innerText = "2/3 Menyimpan ke IPFS Lokal...";
    const cidBaru = await uploadToLocalIPFS(file);
    
    if (!cidBaru) {
        alert("Gagal mengunggah ke IPFS. Pastikan IPFS Desktop sudah berjalan dan CORS sudah dikonfigurasi!");
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
        return;
    }

    // Tampilkan CID yang didapat secara visual di form
    document.getElementById("txtCID").value = cidBaru;

    // Tahap 3: Eksekusi ke Blockchain (MetaMask)
    submitBtn.innerText = "3/3 Konfirmasi Transaksi Blockchain...";
    const namaMhs = document.getElementById("txtNama").value;
    const namaKegiatan = document.getElementById("txtKegiatan").value;
    const namaPenerbit = document.getElementById("txtPenerbit").value;

    await handleIssueCertificate("inputFileSertifikat", namaMhs, namaKegiatan, namaPenerbit, cidBaru);
    
    // Kembalikan tombol ke kondisi semula setelah semua selesai
    submitBtn.innerText = originalBtnText;
    submitBtn.disabled = false;
});

// Listener Verifikasi
document.getElementById("btnCheckValidation").addEventListener("click", async () => {
    const btnCheck = document.getElementById("btnCheckValidation");
    const originalText = btnCheck.innerText;
    
    btnCheck.innerText = "Memverifikasi Jaringan...";
    btnCheck.disabled = true;
    
    await handleVerifyCertificate("inputFileCheck");
    
    btnCheck.innerText = originalText;
    btnCheck.disabled = false;
});

// Panggil fungsi galeri saat website pertama kali dibuka
window.onload = muatGaleriSertifikat;
