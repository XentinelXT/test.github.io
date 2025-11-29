/* ======= Simple client-only system using localStorage =======
               - Users: {username, displayName, passwordHash}
               - Books: {id,title,author,description,copies}
               - Borrows: {id,username,bookId,borrowDate,dueDate,returned}
               Note: For real app, implement proper backend, hashed passwords, and auth tokens.
            */

// Utilities
const $ = q => document.querySelector(q)
const nowISO = () => new Date().toISOString()
const daysToMs = d => d * 24 * 60 * 60 * 1000

// Storage helpers dengan caching
const cache = new Map();
const load = (k, fallback) => {
    if (cache.has(k)) return cache.get(k);

    try {
        const v = localStorage.getItem(k);
        const result = v ? JSON.parse(v) : fallback;
        cache.set(k, result);
        return result;
    } catch (e) {
        return fallback;
    }
}

const save = (k, v) => {
    localStorage.setItem(k, JSON.stringify(v));
    cache.set(k, v);
}

// Keys
const K_USERS = 'lib_users'
const K_CURRENT = 'lib_currentUser'
const K_BOOKS = 'lib_books'
const K_BORROWS = 'lib_borrows'

// Genre List
const GENRES = [
    // Fiksi
    "Novel Umum", "Fiksi Ilmiah", "Fantasi", "Misteri", "Thriller", "Horor",
    "Romansa", "Drama", "Petualangan", "Historical Fiction", "Dystopian",
    "Young Adult", "Children's Fiction", "Satire", "Cyberpunk / Steampunk",

    // Non-Fiksi
    "Biografi & Autobiografi", "Sejarah", "Politik", "Sosial & Budaya", "Psikologi",
    "Sains & Teknologi", "Matematika", "Ekonomi", "Bisnis & Manajemen", "Hukum",
    "Pendidikan", "Kesehatan & Kedokteran", "Filsafat", "Agama & Spiritual",
    "Lingkungan & Alam", "Kumpulan Esai", "Motivasi & Pengembangan Diri",
    "Parenting", "Jurnalistik / Reportase",

    // Referensi
    "Kamus", "Ensiklopedia", "Atlas", "Buku Pegangan", "Buku Statistik",
    "Buku Panduan Akademik",

    // Buku Teknik & Profesi
    "Teknik Informatika / IT", "Teknik Mesin", "Teknik Elektro", "Arsitektur",
    "Pertanian", "Kedokteran", "Keperawatan", "Farmasi", "Akuntansi",

    // Sastra
    "Puisi", "Kumpulan Cerita Pendek", "Drama / Naskah Teater", "Klasik Dunia",
    "Karya Sastra Nusantara",

    // Hobi & Hiburan
    "Komik / Manga", "Buku Seni & Desain", "Fotografi", "Musik", "Film",
    "Crafting & DIY", "Masak / Resep", "Travel", "Olahraga",

    // Anak & Remaja
    "Buku Bergambar", "Dongeng & Fabel", "Edukasi Anak", "Cerita Remaja",
    "Komik Anak",

    // Pendidikan
    "Buku Pelajaran", "Modul Praktikum", "Buku Latihan Soal", "Penelitian & Tugas Akhir"
];

// Tambahan variabel global
let currentReadingBookId = null;
let selectedDuration = 1;
let renderTimeout = null;
let isRendering = false;

// Cache untuk buku yang sudah dirender
const renderedBooksCache = new Map();

// Default data (if no books yet)
function ensureDefaults() {
    if (!load(K_BOOKS, null)) {
        const sample = [
            // Buku Trending dan Recommended - DATA SUDAH DIUBAH
            {
                id: 1,
                title: 'The Adventures of Sherlock Holmes',
                author: 'Arthur Conan Doyle',
                description: 'The Adventures of Sherlock Holmes adalah kumpulan 12 cerita pendek detektif klasik di mana sang detektif legendaris, Sherlock Holmes, dengan sahabatnya Dr. John Watson, menyelesaikan berbagai misteri — dari kasus kejahatan di kota London hingga teka-teki di pedesaan Inggris. Kisah-kisah ini termasuk beberapa cerita paling ikonik seperti "A Scandal in Bohemia", "The Speckled Band", "The Red-Headed League", "The Blue Carbuncle", "The Five Orange Pips", dan banyak lagi. Pembaca diajak melihat kejeniusan Holmes dalam deduksi, pengamatan detail, serta metode investigasinya yang logis dan cerdas.',
                copies: 5,
                image: 'https://perpustakaan.jakarta.go.id/catalog-dispusip/uploaded_files/sampul_koleksi/original/Monograf/219023.png',
                pages: 307,
                year: 1892,
                isbn: '978-0140439083',
                genre: "Misteri",
                publisher: 'George Newnes',
                publicationDate: '1892-10-14',
                edition: 'First Edition',
                language: 'English',
                maxBorrowTime: '14 days',
                renewalAvailability: 'Yes',
                borrowQuota: '3 books per user',
                popularity: 98,
                isTrending: true,
                isRecommended: true,
                pdfUrl: 'https://sherlock-holm.es/stories/pdf/letter/1-sided/advs.pdf'
            },
            {
                id: 2,
                title: 'Bumi Manusia',
                author: 'Pramoedya Ananta Toer',
                description: 'Karya sastra klasik Indonesia yang mengisahkan perjuangan Minke melawan penjajahan Belanda. Sebuah masterpiece sastra Nusantara.',
                copies: 4,
                image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
                pages: 535,
                year: 1980,
                isbn: '978-0140256356',
                genre: "Klasik Dunia",
                publisher: 'Hasta Mitra',
                publicationDate: '1980-08-01',
                edition: 'Reprint Edition',
                language: 'Indonesian',
                maxBorrowTime: '21 days',
                renewalAvailability: 'Yes',
                borrowQuota: '2 books per user',
                popularity: 92,
                isTrending: true,
                isRecommended: true,
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            },
            {
                id: 3,
                title: 'Filosofi Teras',
                author: 'Henry Manampiring',
                description: 'Buku yang mengajarkan filosofi Stoa untuk mengatasi emosi negatif dan hidup lebih tenang di zaman modern.',
                copies: 6,
                image: 'https://images.unsplash.com/photo-1558901357-ca41e027e43a?w=300&h=400&fit=crop',
                pages: 346,
                year: 2019,
                isbn: '978-6020643101',
                genre: "Filsafat",
                publisher: 'Kompas',
                publicationDate: '2019-02-01',
                edition: 'First Edition',
                language: 'Indonesian',
                maxBorrowTime: '14 days',
                renewalAvailability: 'Yes',
                borrowQuota: '3 books per user',
                popularity: 98,
                isTrending: true,
                isRecommended: true,
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            },
            {
                id: 4,
                title: 'Atomic Habits',
                author: 'James Clear',
                description: 'Buku tentang membangun kebiasaan baik dan menghilangkan kebiasaan buruk dengan metode yang terbukti efektif.',
                copies: 4,
                image: 'https://images.unsplash.com/photo-1558901357-ca41e027e43a?w=300&h=400&fit=crop',
                pages: 320,
                year: 2018,
                isbn: '978-0735211292',
                genre: "Motivasi & Pengembangan Diri",
                publisher: 'Avery',
                publicationDate: '2018-10-16',
                edition: 'First Edition',
                language: 'English',
                maxBorrowTime: '14 days',
                renewalAvailability: 'Yes',
                borrowQuota: '2 books per user',
                popularity: 96,
                isTrending: true,
                isRecommended: true,
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            },
            {
                id: 5,
                title: 'Dunia Sophie',
                author: 'Jostein Gaarder',
                description: 'Novel tentang sejarah filsafat yang disajikan melalui petualangan seorang gadis remaja bernama Sophie.',
                copies: 3,
                image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=400&fit=crop',
                pages: 518,
                year: 1991,
                isbn: '978-0425152256',
                genre: "Filsafat",
                publisher: 'Farrar, Straus and Giroux',
                publicationDate: '1991-12-05',
                edition: 'Reprint Edition',
                language: 'Indonesian',
                maxBorrowTime: '21 days',
                renewalAvailability: 'Yes',
                borrowQuota: '2 books per user',
                popularity: 88,
                isTrending: false,
                isRecommended: true,
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
            }
        ];
        save(K_BOOKS, sample);
    }
    if (!load(K_USERS, null)) save(K_USERS, []);
    if (!load(K_BORROWS, null)) save(K_BORROWS, []);
}

ensureDefaults();

// Basic (not cryptographically secure) hash for demo
function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return String(h);
}

// Auth
function registerUser(username, displayName, password) {
    const users = load(K_USERS, []);
    if (users.find(u => u.username === username)) return {
        ok: false,
        msg: 'Username sudah dipakai'
    };
    if (password.length < 6) return {
        ok: false,
        msg: 'Password minimal 6 karakter'
    };
    users.push({
        username,
        displayName,
        passwordHash: simpleHash(password)
    });
    save(K_USERS, users);
    return {
        ok: true
    };
}

function loginUser(username, password) {
    const users = load(K_USERS, []);
    const u = users.find(x => x.username === username && x.passwordHash === simpleHash(password));
    if (!u) return {
        ok: false,
        msg: 'Username atau password salah'
    };
    save(K_CURRENT, {
        username: u.username,
        displayName: u.displayName
    });
    return {
        ok: true,
        user: {
            username: u.username,
            displayName: u.displayName
        }
    };
}

function logout() {
    localStorage.removeItem(K_CURRENT);
    cache.delete(K_CURRENT);
    debouncedRenderAll();
}

function getCurrent() {
    return load(K_CURRENT, null);
}

// Books
function getBooks() {
    return load(K_BOOKS, []);
}

// Borrows
function getBorrows() {
    return load(K_BORROWS, []);
}

function userActiveBorrowsCount(username) {
    return getBorrows().filter(b => b.username === username && !b.returned).length;
}

function borrowBook(username, bookId, durationDays) {
    const books = getBooks();
    const b = books.find(x => x.id === bookId);
    if (!b) return {
        ok: false,
        msg: 'Buku tidak ditemukan'
    };
    // available copies count = copies - borrowedCount(not returned)
    const borrowedCount = getBorrows().filter(x => x.bookId === bookId && !x.returned).length;
    if (borrowedCount >= b.copies) return {
        ok: false,
        msg: 'Tidak ada salinan tersedia saat ini'
    };
    if (userActiveBorrowsCount(username) >= 5) return {
        ok: false,
        msg: 'Mencapai batas pinjaman (5 buku)'
    };
    // check if user already borrowed same book
    if (getBorrows().some(x => x.username === username && x.bookId === bookId && !x.returned)) return {
        ok: false,
        msg: 'Anda sudah meminjam buku ini'
    };
    const borrowDate = new Date();
    const dueDate = new Date(borrowDate.getTime() + daysToMs(durationDays));
    const borrows = getBorrows();
    borrows.push({
        id: Date.now(),
        username,
        bookId,
        borrowDate: borrowDate.toISOString(),
        dueDate: dueDate.toISOString(),
        returned: false
    });
    save(K_BORROWS, borrows);
    return {
        ok: true
    };
}

function returnBorrow(borrowId) {
    const borrows = getBorrows();
    const rec = borrows.find(x => x.id === borrowId);
    if (!rec) return {
        ok: false
    };
    rec.returned = true;
    save(K_BORROWS, borrows);
    return {
        ok: true
    };
}

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show the selected page
    $(`#${pageId}`).classList.add('active');
}

// Book utilities
function getRecommendedBooks() {
    const books = getBooks();
    return books.filter(book => book.isRecommended);
}

function getTrendingBooks() {
    const books = getBooks();
    return books.filter(book => book.isTrending);
}

function getRandomBooks(count = 4) {
    const books = getBooks();
    const shuffled = [...books].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function getGenres() {
    return GENRES;
}

// Fungsi untuk membaca buku
function readBook(bookId) {
    const currentUser = getCurrent();
    if (!currentUser) {
        showLoginModal('Silakan login untuk membaca buku');
        return;
    }

    // Cek apakah buku sedang dipinjam
    const activeBorrows = getBorrows().filter(b =>
        b.username === currentUser.username &&
        b.bookId === bookId &&
        !b.returned
    );

    if (activeBorrows.length === 0) {
        alert('Anda harus meminjam buku ini terlebih dahulu sebelum dapat membacanya.');
        return;
    }

    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;

    currentReadingBookId = bookId;
    showReadPage(bookId);
}

// Fungsi untuk menampilkan halaman baca
function showReadPage(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;

    const currentUser = getCurrent();
    const borrow = getBorrows().find(b =>
        b.username === currentUser.username &&
        b.bookId === bookId &&
        !b.returned
    );

    // Set book info
    $('#readBookTitle').textContent = book.title;
    $('#readBookAuthor').textContent = book.author;

    // Calculate time left
    if (borrow) {
        const dueDate = new Date(borrow.dueDate);
        const now = new Date();
        const timeLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        const borrowDuration = Math.ceil((new Date(borrow.dueDate) - new Date(borrow.borrowDate)) / (1000 * 60 * 60 * 24));

        $('#readBorrowDuration').textContent = borrowDuration;
        $('#readTimeLeft').textContent = timeLeft > 0 ? `${timeLeft} hari` : 'Telat';
    }

    // Set PDF viewer
    const pdfViewer = $('#pdfViewer');
    pdfViewer.src = book.pdfUrl || `https://sherlock-holm.es/stories/pdf/letter/1-sided/advs.pdf`;

    showPage('readPage');
}

// Fungsi untuk download PDF
function downloadPdf(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;

    const pdfUrl = book.pdfUrl || `https://sherlock-holm.es/stories/pdf/letter/1-sided/advs.pdf`;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${book.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fungsi untuk update buku
function updateBook(bookId, newData) {
    const books = getBooks();
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return false;

    books[bookIndex] = {...books[bookIndex], ...newData };
    save(K_BOOKS, books);
    cache.delete(K_BOOKS); // Clear cache
    renderedBooksCache.clear(); // Clear render cache
    return true;
}

function renderBookCard(book, container, showBadge = false) {
    const bookKey = `book-${book.id}-${showBadge}`;

    // Cek cache dulu
    if (renderedBooksCache.has(bookKey)) {
        container.appendChild(renderedBooksCache.get(bookKey).cloneNode(true));
        return;
    }

    const borrowedCount = getBorrows().filter(x => x.bookId === book.id && !x.returned).length;
    const available = Math.max(0, book.copies - borrowedCount);
    const currentUser = getCurrent();
    const userHasBorrowed = currentUser ? getBorrows().some(b =>
        b.username === currentUser.username &&
        b.bookId === book.id &&
        !b.returned
    ) : false;

    const el = document.createElement('div');
    el.className = 'book';

    // Determine which badge to show
    let badgeHTML = '';
    if (showBadge) {
        if (book.isTrending && book.isRecommended) {
            badgeHTML = '<div class="trending-badge">🔥 Trending</div><div class="recommended-badge">⭐ Recommended</div>';
        } else if (book.isTrending) {
            badgeHTML = '<div class="trending-badge">🔥 Trending</div>';
        } else if (book.isRecommended) {
            badgeHTML = '<div class="recommended-badge">⭐ Recommended</div>';
        }
    }

    el.innerHTML = `
        <div class="book-cover-container">
            <img src="${book.image}" alt="${escapeHtml(book.title)}" class="book-cover" loading="lazy">
            ${badgeHTML}
        </div>
        <div class="genre-tag">${escapeHtml(book.genre)}</div>
        <h4>${escapeHtml(book.title)}</h4>
        <div class="muted small">${escapeHtml(book.author)}</div>
        <div style="margin-top:8px" class="small">${escapeHtml(book.description.substring(0, 100))}...</div>
        <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
            <div class="muted small">Tersedia: <strong>${available}</strong></div>
            <div>
                <button class="detail-btn" data-id="${book.id}">Lihat Detail</button>
                ${userHasBorrowed ? `<button class="read-btn" data-id="${book.id}" style="margin-left:5px">Baca</button>` : ''}
            </div>
        </div>
    `;
    
    // Simpan ke cache
    renderedBooksCache.set(bookKey, el.cloneNode(true));
    container.appendChild(el);
}

function showBookDetail(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;

    const borrowedCount = getBorrows().filter(x => x.bookId === bookId && !x.returned).length;
    const available = Math.max(0, book.copies - borrowedCount);
    const currentUser = getCurrent();
    const userHasBorrowed = currentUser ? getBorrows().some(b => 
        b.username === currentUser.username && 
        b.bookId === bookId && 
        !b.returned
    ) : false;

    const detailContent = $('#bookDetailContent');

    detailContent.innerHTML = `
        <div class="book-detail-new">
            <div class="book-header">
                <div class="book-title-section">
                    <h1>${escapeHtml(book.title)}</h1>
                    <div class="book-author">${escapeHtml(book.author)}</div>
                </div>
                <img src="${book.image}" alt="${escapeHtml(book.title)}" class="book-cover-large" loading="lazy">
            </div>
            
            <div class="synopsis-section">
                <div class="section-title">SYNOPSIS</div>
                <div class="synopsis-text">${escapeHtml(book.description)}</div>
                <div class="muted small" style="margin-top: 8px; text-align: right;">www.luodecap.com</div>
            </div>
            
            <div class="details-section">
                <div class="section-title">DETAILS</div>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">ISBN</div>
                        <div class="detail-value">${escapeHtml(book.isbn)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Genre</div>
                        <div class="detail-value">${escapeHtml(book.genre)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Publisher</div>
                        <div class="detail-value">${escapeHtml(book.publisher)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Publication date</div>
                        <div class="detail-value">${escapeHtml(book.publicationDate)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Edition</div>
                        <div class="detail-value">${escapeHtml(book.edition)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Language</div>
                        <div class="detail-value">${escapeHtml(book.language)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Number of pages</div>
                        <div class="detail-value">${escapeHtml(book.pages)}</div>
                    </div>
                </div>
            </div>
            
            <div class="divider"></div>
            
            <div class="rules-section">
                <div class="section-title">RULES & LIMITS</div>
                <div class="rules-grid">
                    <div class="rule-item">
                        <div class="rule-label">Maximum borrow time</div>
                        <div class="rule-value">${escapeHtml(book.maxBorrowTime)}</div>
                    </div>
                    <div class="rule-item">
                        <div class="rule-label">Renewal availability</div>
                        <div class="rule-value">${escapeHtml(book.renewalAvailability)}</div>
                    </div>
                    <div class="rule-item">
                        <div class="rule-label">Borrow quota status</div>
                        <div class="rule-value">${available} of ${book.copies} available</div>
                    </div>
                </div>
            </div>
            
            <div class="divider"></div>
            
            <div class="borrow-section-new">
                <div class="borrow-section-title">${userHasBorrowed ? 'AKSES BUKU' : 'SET TIME'}</div>
                
                ${userHasBorrowed ? 
                    `<div style="text-align: center; padding: 20px;">
                        <p style="margin-bottom: 20px;">Anda sedang meminjam buku ini. Anda dapat membaca atau mengunduhnya.</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button id="readFromDetail" class="read-button-large">📖 Baca Buku</button>
                            <button id="downloadFromDetail" class="download-button">📥 Download PDF</button>
                        </div>
                    </div>` 
                    : 
                    `<div class="duration-selector">
                        <div class="detail-label">Pilih durasi pinjam (hari):</div>
                        <div class="duration-options">
                            <div class="duration-option selected" data-days="1">1 Hari</div>
                            <div class="duration-option" data-days="2">2 Hari</div>
                            <div class="duration-option" data-days="3">3 Hari</div>
                            <div class="duration-option" data-days="4">4 Hari</div>
                            <div class="duration-option" data-days="5">5 Hari</div>
                            <div class="duration-option" data-days="6">6 Hari</div>
                            <div class="duration-option" data-days="7">7 Hari</div>
                        </div>
                    </div>
                    <div class="countdown-display">
                        Countdown: <strong>${selectedDuration} hari</strong>
                    </div>
                    <button id="borrowFromDetail" class="borrow-button-large">BORROW</button>`
                }
            </div>
        </div>
    `;

    if (userHasBorrowed) {
        // Add event listeners for read and download buttons
        $('#readFromDetail').addEventListener('click', () => readBook(bookId));
        $('#downloadFromDetail').addEventListener('click', () => downloadPdf(bookId));
    } else {
        // Original borrow functionality
        selectedDuration = 1;

        document.querySelectorAll('.duration-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.duration-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                selectedDuration = parseInt(option.getAttribute('data-days'));
                $('.countdown-display strong').textContent = `${selectedDuration} hari`;
            });
        });

        $('#borrowFromDetail').addEventListener('click', () => {
            const cur = getCurrent();
            if (!cur) {
                showLoginModal('Silakan login atau daftar untuk meminjam');
                return;
            }
            showTermsModal(bookId, selectedDuration, book);
        });
    }

    showPage('detailPage');
}

// Fungsi untuk menampilkan editor buku
function showBookEditor() {
    const books = getBooks();
    let editorHTML = `
        <h3>Edit Buku</h3>
        <div class="muted small" style="margin-bottom: 20px;">
            Ubah gambar dan PDF untuk setiap buku. Perubahan akan langsung tersimpan.
        </div>
    `;
    
    books.forEach(book => {
        editorHTML += `
            <div class="book-editor-item">
                <h4>${book.title} - ${book.author}</h4>
                <div class="form-row">
                    <label>Gambar URL:</label>
                    <input type="text" id="edit-image-${book.id}" value="${book.image}" style="width: 100%;" placeholder="https://example.com/gambar-buku.jpg">
                    <div style="margin-top: 8px;">
                        <strong>Preview:</strong>
                        <img src="${book.image}" class="image-preview" id="preview-image-${book.id}" onerror="this.style.display='none'">
                    </div>
                </div>
                <div class="form-row">
                    <label>PDF URL:</label>
                    <input type="text" id="edit-pdf-${book.id}" value="${book.pdfUrl}" style="width: 100%;" placeholder="https://example.com/buku.pdf">
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="saveBookChanges(${book.id})" class="primary">💾 Simpan Perubahan</button>
                    <button onclick="testBookImage(${book.id})">👁️ Test Gambar</button>
                    <button onclick="testBookPdf(${book.id})">📄 Test PDF</button>
                </div>
            </div>
        `;
    });
    
    $('#editBooksContent').innerHTML = editorHTML;
    $('#editBooksModal').style.display = 'flex';
    
    // Add real-time preview for image URLs
    books.forEach(book => {
        $(`#edit-image-${book.id}`).addEventListener('input', function() {
            const preview = $(`#preview-image-${book.id}`);
            preview.src = this.value;
            preview.style.display = 'block';
        });
    });
}

function saveBookChanges(bookId) {
    const newImage = $(`#edit-image-${bookId}`).value;
    const newPdf = $(`#edit-pdf-${bookId}`).value;
    
    if (updateBook(bookId, { image: newImage, pdfUrl: newPdf })) {
        alert('✅ Buku berhasil diupdate!');
        debouncedRenderAll();
    } else {
        alert('❌ Gagal mengupdate buku');
    }
}

function testBookImage(bookId) {
    const imageUrl = $(`#edit-image-${bookId}`).value;
    if (!imageUrl) {
        alert('❌ URL gambar kosong');
        return;
    }
    
    const testWindow = window.open('', '_blank');
    testWindow.document.write(`
        <html>
            <head><title>Test Gambar</title></head>
            <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <img src="${imageUrl}" style="max-width: 90%; max-height: 90%;" onerror="alert('Gagal memuat gambar')">
                <br>
                <button onclick="window.close()" style="position: fixed; top: 10px; right: 10px;">Tutup</button>
            </body>
        </html>
    `);
}

function testBookPdf(bookId) {
    const pdfUrl = $(`#edit-pdf-${bookId}`).value;
    if (!pdfUrl) {
        alert('❌ URL PDF kosong');
        return;
    }
    
    window.open(pdfUrl, '_blank');
}

function showTermsModal(bookId, duration, book) {
    const currentUser = getCurrent();
    if (!currentUser) return;

    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + daysToMs(duration));
    const activeBorrows = userActiveBorrowsCount(currentUser.username);
    const maxBorrows = 5;

    const termsContent = $('#termsContent');
    termsContent.innerHTML = `
        <div class="terms-header">
            <h1>BOOKS</h1>
            <h2>${escapeHtml(book.title)} by ${escapeHtml(book.author)}</h2>
        </div>
        
        <div class="book-info-terms">
            <div class="terms-section">
                <h3>Borrow Duration:</h3>
                <p><strong>${duration} hari</strong></p>
            </div>
            
            <div class="book-dates">
                <div class="date-item">
                    <strong>Borrow start date:</strong><br>
                    ${borrowDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div class="date-item">
                    <strong>Expected Return:</strong><br>
                    ${returnDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            </div>
            
            <div class="quota-info">
                <strong>Your quota:</strong><br>
                ${activeBorrows}/${maxBorrows} books
            </div>
            
            <div class="reminder-checkbox">
                <label class="checkbox-label">
                    <input type="checkbox" id="reminderEmails">
                    Send me reminder emails
                </label>
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="signature-box">
            <p>Signature box</p>
        </div>
        
        <div class="terms-section">
            <h3>TERMS & CONDITION</h3>
            <div class="terms-text">
                <p>1. Ketentuan Akun Pengguna

Pengguna wajib memiliki akun yang terdaftar dan telah diverifikasi.

Data pribadi yang diberikan harus valid, lengkap, dan dapat dipertanggungjawabkan.

Setiap pengguna bertanggung jawab penuh atas keamanan akun masing-masing.

2. Ketentuan Peminjaman Buku

Setiap pengguna dapat meminjam maksimal 3 buku secara bersamaan (dapat disesuaikan).

Masa peminjaman buku adalah 7–14 hari tergantung jenis buku.

Peminjaman dilakukan secara digital melalui platform perpustakaan online.

Pengguna wajib memastikan koneksi internet stabil untuk mengakses buku digital.

3. Perpanjangan Masa Peminjaman

Perpanjangan hanya dapat dilakukan 1 kali per buku.

Perpanjangan tidak dapat dilakukan jika buku tersebut sedang dalam status antrian tunggu oleh pengguna lain.

Permintaan perpanjangan harus diajukan sebelum masa pinjam berakhir.

4. Pengembalian Buku

Pengembalian dilakukan otomatis saat masa pinjam habis.

Jika pengguna selesai lebih cepat, buku dapat dikembalikan melalui menu “Pengembalian” di aplikasi.

Pengguna tetap bertanggung jawab atas penggunaan buku hingga proses pengembalian selesai.

5. Denda dan Pelanggaran

Keterlambatan pengembalian buku fisik (jika ada) dikenakan denda sesuai kebijakan perpustakaan.

Buku digital yang habis masa pinjamnya akan otomatis terkunci dan tidak dikenakan denda.

Penyalahgunaan akses buku (misalnya membagikan file ilegal) akan dikenai sanksi hingga pemblokiran akun.

6. Larangan Penggunaan

Pengguna dilarang:

Menggandakan, mendistribusikan, atau menjual kembali buku digital.

Membocorkan akun atau akses kepada pihak lain.

Menggunakan platform untuk tujuan ilegal atau melanggar hak cipta.

7. Hak dan Kewajiban Perpustakaan

Perpustakaan berhak mengubah kebijakan tanpa pemberitahuan sebelumnya.

Perpustakaan berhak menangguhkan atau menghapus akun yang melanggar syarat dan ketentuan.

Perpustakaan berkewajiban menjaga keamanan data pengguna sesuai kebijakan privasi.

8. Persetujuan Pengguna

Dengan menggunakan layanan perpustakaan online, pengguna dianggap setuju dengan seluruh syarat dan ketentuan yang berlaku.</p>
                
            
                </ol>
            </div>
            
            <div class="agree-section">
                <div class="agree-checkbox">
                    <label class="checkbox-label">
                        <input type="checkbox" id="agreeTerms">
                        I agree with the terms and conditions
                    </label>
                </div>
                
                <div class="terms-buttons">
                    <button id="cancelTerms">Cancel</button>
                    <button id="confirmBorrow" class="primary" disabled>Confirm Borrow</button>
                </div>
            </div>
        </div>
    `;

    // Show the modal
    $('#termsModal').style.display = 'flex';

    // Add event listeners
    const agreeCheckbox = $('#agreeTerms');
    const confirmBorrow = $('#confirmBorrow');

    agreeCheckbox.addEventListener('change', () => {
        confirmBorrow.disabled = !agreeCheckbox.checked;
    });

    $('#cancelTerms').addEventListener('click', () => {
        $('#termsModal').style.display = 'none';
    });

    confirmBorrow.addEventListener('click', () => {
        if (!agreeCheckbox.checked) {
            alert('You must agree to the terms and conditions.');
            return;
        }

        const res = borrowBook(currentUser.username, bookId, duration);
        if (!res.ok) {
            alert('Gagal: ' + res.msg);
            return;
        }

        alert('Berhasil meminjam! Buku harus dikembalikan dalam ' + duration + ' hari.');
        $('#termsModal').style.display = 'none';
        showPage('catalogPage');
        debouncedRenderAll();
    });
}

/* ======= UI rendering ======= */
function renderRecommendedBooks() {
    const grid = $('#recommendedGrid');
    grid.innerHTML = '';
    const recommendedBooks = getRecommendedBooks();

    if (recommendedBooks.length === 0) {
        grid.innerHTML = '<div class="muted small">Tidak ada rekomendasi saat ini.</div>';
        return;
    }

    recommendedBooks.forEach(book => {
        renderBookCard(book, grid, true);
    });

    bindDetailButtons(grid);
}

function renderTrendingBooks() {
    const grid = $('#trendingGrid');
    grid.innerHTML = '';
    const trendingBooks = getTrendingBooks();

    if (trendingBooks.length === 0) {
        grid.innerHTML = '<div class="muted small">Tidak ada buku trending saat ini.</div>';
        return;
    }

    trendingBooks.forEach(book => {
        renderBookCard(book, grid, true);
    });

    bindDetailButtons(grid);
}

function renderAllBooks(filterGenre = '', searchQuery = '') {
    const grid = $('#booksGrid');
    grid.innerHTML = '';
    let allBooks = getBooks();

    // Apply filters
    if (filterGenre) {
        allBooks = allBooks.filter(book => book.genre === filterGenre);
    }

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allBooks = allBooks.filter(book =>
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query) ||
            book.description.toLowerCase().includes(query) ||
            book.genre.toLowerCase().includes(query)
        );
    }

    // Update book count text
    const bookCountText = $('#bookCountText');
    if (filterGenre || searchQuery) {
        bookCountText.textContent = `Menampilkan ${allBooks.length} buku${filterGenre ? ` dalam genre ${filterGenre}` : ''}${searchQuery ? ` untuk "${searchQuery}"` : ''}`;
    } else {
        bookCountText.textContent = `Menampilkan semua ${allBooks.length} buku`;
    }
    
    if (allBooks.length === 0) {
        grid.innerHTML = '<div class="muted small">Tidak ada buku yang sesuai dengan filter.</div>';
        return;
    }
    
    allBooks.forEach(book => {
        renderBookCard(book, grid, false);
    });
    
    bindDetailButtons(grid);
}

function bindDetailButtons(container) {
    // bind detail buttons
    container.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the parent click event
            const id = Number(btn.dataset.id);
            showBookDetail(id);
        });
    });
    
    // bind read buttons
    container.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.id);
            readBook(id);
        });
    });
    
    // Also make the whole book card clickable
    container.querySelectorAll('.book').forEach(bookCard => {
        bookCard.addEventListener('click', (e) => {
            // Only trigger if the click wasn't on the button itself
            if (!e.target.classList.contains('detail-btn') && !e.target.classList.contains('read-btn')) {
                const detailBtn = bookCard.querySelector('.detail-btn');
                if (detailBtn) {
                    const id = Number(detailBtn.dataset.id);
                    showBookDetail(id);
                }
            }
        });
    });
}

function renderGenreFilter() {
    const genres = getGenres();
    const select = $('#genreFilter');
    
    // Clear existing options except the first one
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Add genre options
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        select.appendChild(option);
    });
}

function randomizeBooks() {
    // Clear cache saat merandom
    renderedBooksCache.clear();
    
    // Randomize the order of books in all sections
    renderRecommendedBooks();
    renderTrendingBooks();
    
    // For all books section, we'll shuffle the books
    const currentGenre = $('#genreFilter').value;
    const currentSearch = $('#searchInput').value;
    renderAllBooks(currentGenre, currentSearch);
}

function renderProfile() {
    const area = $('#profileArea');
    const cur = getCurrent();
    if (!cur) {
        area.innerHTML = 'Silakan login untuk melihat profil.';
        $('#userInfo').textContent = 'Belum masuk';
        $('#btnLogout').style.display = 'none';
        $('#btnShowLogin').style.display = 'inline-block';
        $('#btnEditBooks').style.display = 'none';
        return;
    }
    area.innerHTML = `<div><strong>${escapeHtml(cur.displayName||cur.username)}</strong></div><div class="muted small">@${escapeHtml(cur.username)}</div>`;
    $('#userInfo').textContent = `Masuk sebagai ${cur.displayName||cur.username}`;
    $('#btnLogout').style.display = 'inline-block';
    $('#btnShowLogin').style.display = 'none';
    $('#btnEditBooks').style.display = 'inline-block';
}

function renderBorrows() {
    const cur = getCurrent();
    const list = $('#borrowList');
    list.innerHTML = '';
    if (!cur) {
        list.innerHTML = '<div class="muted small">Silakan login untuk melihat pinjaman Anda.</div>';
        return;
    }
    const items = getBorrows().filter(x => x.username === cur.username);
    if (items.length === 0) {
        list.innerHTML = '<div class="muted small">Tidak ada pinjaman.</div>';
        return;
    }
    items.filter(x => !x.returned).forEach(b => {
        const book = getBooks().find(bb => bb.id === b.bookId);
        const due = new Date(b.dueDate);
        const daysLeft = Math.ceil((due - new Date()) / (24 * 60 * 60 * 1000));
        const badge = daysLeft < 0 ? `<span class="badge overdue">Telat ${Math.abs(daysLeft)} hari</span>` : (daysLeft <= 3 ? `<span class="badge due-soon">${daysLeft} hari tersisa</span>` : `<span class="badge">${daysLeft} hari tersisa</span>`);
        const el = document.createElement('div');
        el.style.marginBottom = '8px';
        el.innerHTML = `
          <div><strong>${escapeHtml(book.title)}</strong> <div class="muted small">${escapeHtml(book.author)}</div></div>
          <div class="small muted">Dipinjam: ${new Date(b.borrowDate).toLocaleString()} | Jatuh tempo: ${due.toLocaleDateString()}</div>
          <div style="margin-top:6px">${badge} <button data-return="${b.id}" style="margin-left:8px">Kembalikan</button></div>
        `;
        list.appendChild(el);
    });

    // bind return
    list.querySelectorAll('button[data-return]').forEach(btn => btn.addEventListener('click', () => {
        const id = Number(btn.dataset.return);
        if (confirm('Konfirmasi kembalikan buku?')) {
            returnBorrow(id);
            debouncedRenderAll();
        }
    }));
}

function renderHistory() {
    const cur = getCurrent();
    const area = $('#historyArea');
    if (!cur) {
        area.innerHTML = 'Silakan login untuk melihat riwayat.';
        return;
    }
    const items = getBorrows().filter(x => x.username === cur.username).sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
    if (items.length === 0) {
        area.innerHTML = 'Belum ada riwayat.';
        return;
    }
    area.innerHTML = items.map(r => {
        const book = getBooks().find(bb => bb.id === r.bookId);
        return `<div style="margin-bottom:8px"><strong>${escapeHtml(book.title)}</strong> - ${new Date(r.borrowDate).toLocaleDateString()} &rarr; ${r.returned? 'Dikembalikan' : 'Belum dikembalikan'}</div>`;
    }).join('');
}

// Debounced render function untuk menghindari render berlebihan
function debouncedRenderAll() {
    if (isRendering) return;
    
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    
    renderTimeout = setTimeout(() => {
        isRendering = true;
        renderAll();
        isRendering = false;
    }, 50); // Delay 50ms
}

function renderAll() {
    renderProfile();
    renderRecommendedBooks();
    renderTrendingBooks();
    renderGenreFilter();
    renderAllBooks('', '');
    renderBorrows();
    renderHistory();
}

// Modal helpers
function showLoginModal(msg) {
    const html = `
        <h3>Login / Register</h3>
        <div class="muted small">${escapeHtml(msg||'Silakan masuk atau buat akun baru.')}</div>
        <div style="margin-top:10px">
          <div class="form-row"><label>Username</label><input id="m_username" /></div>
          <div class="form-row"><label>Nama tampilan</label><input id="m_display" placeholder="Boleh dikosongkan saat login" /></div>
          <div class="form-row"><label>Password</label><input id="m_password" type="password" /></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button id="m_register">Daftar</button>
            <button id="m_login" class="primary">Login</button>
          </div>
        </div>
      `;
    
    $('#loginModalContent').innerHTML = html;
    $('#loginModal').style.display = 'flex';
    
    $('#m_register').onclick = () => {
        const u = $('#m_username').value.trim();
        const d = $('#m_display').value.trim();
        const p = $('#m_password').value;
        const res = registerUser(u, d || u, p);
        alert(res.ok ? 'Berhasil daftar — silakan login' : ('Gagal: ' + res.msg));
        if (res.ok) { /* auto-fill login */
            $('#m_display').value = d;
        }
    };
    $('#m_login').onclick = () => {
        const u = $('#m_username').value.trim();
        const p = $('#m_password').value;
        const res = loginUser(u, p);
        if (!res.ok) return alert('Gagal: ' + res.msg);
        $('#loginModal').style.display = 'none';
        debouncedRenderAll();
    };
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;"
    }[c]));
}

// Search and filter dengan debounce
let searchTimeout = null;
$('#searchInput').addEventListener('input', () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(() => {
        const searchQuery = $('#searchInput').value;
        const selectedGenre = $('#genreFilter').value;
        renderAllBooks(selectedGenre, searchQuery);
    }, 300); // Delay 300ms
});

$('#genreFilter').addEventListener('change', () => {
    const selectedGenre = $('#genreFilter').value;
    const searchQuery = $('#searchInput').value;
    renderAllBooks(selectedGenre, searchQuery);
});

// Randomize button
$('#randomizeBtn').addEventListener('click', randomizeBooks);

// Buttons
$('#btnShowLogin').addEventListener('click', () => showLoginModal());
$('#btnLogout').addEventListener('click', () => {
    if (confirm('Logout?')) {
        logout();
    }
});

// Edit books button
$('#btnEditBooks').addEventListener('click', showBookEditor);

// Back to catalog button
$('#backToCatalog').addEventListener('click', () => {
    showPage('catalogPage');
});

// Reset data button
$('#btnResetData').addEventListener('click', () => {
    if (confirm('Reset semua data? Ini akan menghapus semua buku, user, dan peminjaman.')) {
        localStorage.removeItem(K_BOOKS);
        localStorage.removeItem(K_USERS);
        localStorage.removeItem(K_BORROWS);
        localStorage.removeItem(K_CURRENT);
        cache.clear();
        renderedBooksCache.clear();
        alert('Data berhasil direset. Halaman akan dimuat ulang.');
        location.reload();
    }
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === $('#termsModal')) {
        $('#termsModal').style.display = 'none';
    }
    if (event.target === $('#loginModal')) {
        $('#loginModal').style.display = 'none';
    }
    if (event.target === $('#editBooksModal')) {
        $('#editBooksModal').style.display = 'none';
    }
});

// Tambahkan event listener untuk tombol download di halaman baca
$('#downloadPdf').addEventListener('click', () => {
    if (currentReadingBookId) {
        downloadPdf(currentReadingBookId);
    }
});

// Tambahkan event listener untuk kembali dari halaman baca
$('#backFromRead').addEventListener('click', () => {
    showPage('catalogPage');
});

// Init render
document.addEventListener('DOMContentLoaded', function() {
    // Tampilkan loading state
    document.body.style.opacity = '0.7';
    
    setTimeout(() => {
        renderAll();
        showPage('catalogPage'); // Show catalog by default
        
        // Sembunyikan loading state
        document.body.style.opacity = '1';
    }, 100);
});

// Periodic UI refresh for countdowns - dikurangi frekuensinya
setInterval(() => {
    renderBorrows();
    renderHistory();
}, 30000); // 30 detik instead of 60 detik