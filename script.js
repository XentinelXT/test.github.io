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
        console.error('Error loading from localStorage:', e);
        return fallback;
    }
}

const save = (k, v) => {
    try {
        localStorage.setItem(k, JSON.stringify(v));
        cache.set(k, v);
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Keys
const K_USERS = 'lib_users'
const K_CURRENT = 'lib_currentUser'
const K_BOOKS = 'lib_books'
const K_BORROWS = 'lib_borrows'

// Categories with icons and mapping to genres
const CATEGORIES = [{
        id: 'textbook',
        name: 'TEXTBOOK & JOURNALS',
        icon: '',
        color: '#3498db',
        image: 'assets/image/textbook.png',
        keywords: ['Textbook', 'Journal', 'Buku Pegangan', 'Buku Pelajaran', 'Modul Praktikum', 'Penelitian', 'Ensiklopedia', 'Kamus', 'Referensi', 'Education', 'Buku Teks']
    },
    {
        id: 'history',
        name: 'HISTORY',
        icon: '',
        color: '#e67e22',
        image: 'assets/image/history.png',
        keywords: ['Sejarah', 'Historical Fiction', 'History', 'Biografi', 'Autobiografi', 'Sosial & Budaya', 'Politik', 'Filsafat']
    },
    {
        id: 'finance',
        name: 'FINANCE & BUSINESS',
        icon: '',
        color: '#2ecc71',
        image: 'assets/image/finance.png',
        keywords: ['Ekonomi', 'Bisnis & Manajemen', 'Finance', 'Akuntansi', 'Motivasi & Pengembangan Diri', 'Keuangan']
    },
    {
        id: 'fantasy',
        name: 'FANTASY',
        icon: '',
        color: '#9b59b6',
        image: 'assets/image/fantasy.png',
        keywords: ['Fantasi', 'Fantasy', 'Fiksi Ilmiah', 'Science Fiction', 'Dystopian', 'Young Adult', 'Petualangan', 'Misteri', 'Thriller', 'Horor', 'Romansa', 'Drama', 'Klasik']
    },
    {
        id: 'math-science',
        name: 'MATH & SCIENCE',
        icon: '',
        color: '#e74c3c',
        image: 'assets/image/math.png',
        keywords: ['Matematika', 'Sains & Teknologi', 'Science', 'Math', 'Teknik Informatika', 'IT', 'Kedokteran', 'Kesehatan', 'Farmasi', 'Lingkungan', 'Alam', 'Fisika', 'Kimia', 'Biologi']
    }
];

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
let currentCategory = null;
let categoryTimeout = null;

// Rotasi buku untuk bagian Rekomendasi dan Trending
let rotationInterval = null;

// Cache untuk buku yang sudah dirender
const renderedBooksCache = new Map();

// Default data (if no books yet)
function ensureDefaults() {
    try {
        if (!load(K_BOOKS, null)) {
            const sample = [{
                    id: 1,
                    title: 'The Adventures of Sherlock Holmes',
                    author: 'Arthur Conan Doyle',
                    description: 'The Adventures of Sherlock Holmes adalah kumpulan 12 cerita pendek detektif klasik di mana sang detektif legendaris, Sherlock Holmes, dengan sahabatnya Dr. John Watson, menyelesaikan berbagai misteri dari kasus kejahatan di kota London hingga teka-teki di pedesaan Inggris. Kisah-kisah ini termasuk beberapa cerita paling ikonik seperti "A Scandal in Bohemia", "The Speckled Band", "The Red-Headed League", "The Blue Carbuncle", "The Five Orange Pips", dan banyak lagi. Pembaca diajak melihat kejeniusan Holmes dalam deduksi, pengamatan detail, serta metode investigasinya yang logis dan cerdas.',
                    copies: 5,
                    image: 'https://perpustakaan.jakarta.go.id/catalog-dispusip/uploaded_files/sampul_koleksi/original/Monograf/219023.png',
                    pages: 307,
                    year: 1892,
                    isbn: '978-0486474915',
                    genre: "Misteri / Detektif",
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
                    title: 'Alices Adventure in Wonderland',
                    author: 'Charles Lutwidge Dodgson',
                    description: 'Alice\'s Adventures in Wonderland adalah novel klasik karya Lewis Carroll yang pertama kali diterbitkan pada tahun 1865. Kisah ini mengikuti seorang gadis bernama Alice yang tanpa sengaja jatuh ke dalam sebuah lubang kelinci dan memasuki dunia aneh bernama Wonderland, tempat penuh makhluk eksentrik, logika yang terbalik, serta kejadian-kejadian absurd yang tak dapat dijelaskan. Dalam petualangannya, Alice bertemu karakter-karakter ikonik seperti White Rabbit, Mad Hatter, Cheshire Cat, dan Queen of Hearts, yang masing-masing menghadirkan pengalaman unik dan penuh teka-teki. Novel ini dikenal sebagai salah satu karya fantasi terpenting dalam sejarah sastra, memadakan humor, imajinasi liar, serta "nonsense literature" yang membuatnya disukai pembaca dari berbagai usia. Selain menjadi bacaan anak-anak, cerita ini juga sering dipelajari dalam kajian sastra karena penuh simbol dan permainan logika yang cerdas. Dengan tema tentang identitas, pertumbuhan, dan dunia imajinasi yang tidak terbatas, Alice\'s Adventures in Wonderland tetap relevan hingga saat ini dan terus diterbitkan dalam berbagai edisi bahasa serta ilustrasi.',
                    copies: 4,
                    image: 'https://cdn.gramedia.com/uploads/items/Alice.jpg',
                    pages: 105,
                    year: 1865,
                    isbn: '-',
                    genre: "Fantasi / Children's Fiction",
                    publisher: 'Macmillan Publishers',
                    publicationDate: '1865-11-26',
                    edition: 'First publication',
                    language: 'English',
                    maxBorrowTime: '21 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 92,
                    isTrending: true,
                    isRecommended: true,
                    pdfUrl: 'https://www.adobe.com/be_en/active-use/pdf/Alice_in_Wonderland.pdf'
                },
                {
                    id: 3,
                    title: "Pride and Prejudice",
                    author: 'Jane Austen',
                    description: 'Pride and Prejudice adalah novel klasik karya Jane Austen, pertama kali diterbitkan tahun 1813. Cerita ini mengikuti hubungan antara Elizabeth Bennet dan Mr. Darcy, mengangkat tema kelas sosial, cinta, kesalahpahaman, dan karakter manusia. Hingga kini, novel ini menjadi salah satu karya sastra Inggris paling terkenal dan banyak dipelajari.',
                    copies: 6,
                    image: 'https://almabooks.com/wp-content/uploads/2016/10/9781847493699.jpg',
                    pages: 346,
                    year: 2019,
                    isbn: '978-0141439518',
                    genre: "Romance klasik / Fiksi sastra",
                    publisher: 'T. Egerton, Whitehall',
                    publicationDate: '28 Januari 1813',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '14 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '3 books per user',
                    popularity: 98,
                    isTrending: true,
                    isRecommended: true,
                    pdfUrl: 'https://giove.isti.cnr.it/demo/eread/Libri/joy/Pride.pdf'
                },
                {
                    id: 4,
                    title: 'The Picture Of Dorian Gray',
                    author: 'Oscar Wilde',
                    description: 'The Picture of Dorian Gray adalah novel klasik karya Oscar Wilde, pertama kali diterbitkan pada tahun 1890. Cerita ini mengikuti seorang pemuda tampan bernama Dorian Gray yang potret dirinya berubah menjadi semakin buruk setiap kali ia melakukan tindakan immoral, sementara tubuhnya tetap awet muda.',
                    copies: 4,
                    image: 'https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg',
                    pages: 237,
                    year: 1890,
                    isbn: '978-0141439570',
                    genre: "Gothic fiction / Filosofis",
                    publisher: 'Lippincotts Monthly Magazine',
                    publicationDate: '20 Juni 1890',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '14 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 92,
                    isTrending: true,
                    isRecommended: true,
                    pdfUrl: 'https://giove.isti.cnr.it/demo/eread/Libri/joy/Pride.pdf'
                },
                {
                    id: 5,
                    title: 'Frankenstein',
                    author: 'Mary Shelley',
                    description: 'Frankenstein adalah novel klasik karya Mary Shelley, pertama kali diterbitkan pada tahun 1818. Cerita ini mengikuti Victor Frankenstein, seorang ilmuwan muda yang terobsesi menciptakan kehidupan lewat eksperimen ilmiah. Ia berhasil menciptakan makhluk hidup, tetapi hasil ciptaannya dianggap monster membawa tragedi, kesepian, dan konflik moral yang mendalam.',
                    copies: 3,
                    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQd4zFf8O0UGrM-6y-2B_tAZytVjcdTrW50AQ&s',
                    pages: 312,
                    year: 1818,
                    isbn: '978-0141439471',
                    genre: "Fiksi Ilmiah / Gothic Fiction",
                    publisher: 'Lackington, Hughes, Harding, Mavor & Jones',
                    publicationDate: '1 Januari 1818',
                    edition: 'Reprint Edition',
                    language: 'Indonesian',
                    maxBorrowTime: '21 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 88,
                    isTrending: false,
                    isRecommended: true,
                    pdfUrl: 'https://www.coreknowledge.org/wp-content/uploads/2023/08/CC_Frankenstein_Reader_W1.pdf'
                },
                {
                    id: 6,
                    title: 'To Kill a Mockingbird',
                    author: 'Harper Lee',
                    description: 'To Kill a Mockingbird adalah novel klasik Amerika yang ditulis oleh Harper Lee. Diterbitkan pada tahun 1960, novel ini langsung menjadi sukses, memenangkan Pulitzer Prize, dan telah menjadi karya klasik sastra Amerika modern. Cerita ini berlatar di kota fiksi Maycomb, Alabama, selama Depresi Besar. Naratornya adalah Scout Finch, seorang gadis berusia enam tahun yang tinggal bersama kakak laki-lakinya Jem dan ayah mereka yang janda, Atticus, seorang pengacara berusia pertengahan. Plot dan karakter-karakter dalam novel ini didasarkan pada pengamatan Lee tentang keluarga dan tetangganya, serta peristiwa yang terjadi di dekat kota asalnya Monroeville, Alabama, pada tahun 1936, ketika dia berusia sepuluh tahun.',
                    copies: 4,
                    image: 'https://ebooks.gramedia.com/ebook-covers/25313/image_highres/HCO_TKAM2018MTH11.jpeg',
                    pages: 324,
                    year: 1960,
                    isbn: '978-0061120084',
                    genre: "Fiksi / Drama / Klasik",
                    publisher: 'J.B. Lippincott & Co.',
                    publicationDate: '1960-07-11',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '14 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 95,
                    isTrending: true,
                    isRecommended: false,
                    pdfUrl: 'https://www.raio.org/TKMFullText.pdf'
                },
                {
                    id: 7,
                    title: '1984',
                    author: 'George Orwell',
                    description: '1984 adalah novel distopia fiksi ilmiah sosial dan politik berbahasa Inggris karya novelis Inggris George Orwell. Diterbitkan pada 8 Juni 1949 dengan judul Nineteen Eighty-Four, novel ini berlatar di London pada tahun yang tidak disebutkan, yang diyakini 1984, ketika sebagian besar populasi dunia menjadi korban perang tak berujung, pengawasan pemerintah yang berlebihan, dan propaganda. "Big Brother", pemimpin Partai, menikmati pemujaan yang hampir ilahi. Partai berusaha mencegah kemungkinan pemberontakan ketika mereka memperkenalkan "Newspeak", bahasa yang bertujuan untuk mencegah pemikiran politik yang tidak diinginkan; "Thought Police", yang menghukum "thoughtcrime"; dan pengawasan konstan mereka melalui "telescreens". Protagonis novel ini, Winston Smith, adalah pekerja berpangkat rendah di Kementerian Kebenaran, yang bertanggung jawab atas propaganda. Pekerjaannya yang membosankan adalah menulis ulang sejarah dan menghancurkan dokumen. Namun, rahasia Winston adalah bahwa dia membenci Partai dan bermimpi akan revolusi melawan "Big Brother".',
                    copies: 5,
                    image: 'https://m.media-amazon.com/images/I/71wANojhEKL._AC_UF1000,1000_QL80_.jpg',
                    pages: 328,
                    year: 1949,
                    isbn: '978-0451524935',
                    genre: "Fiksi Ilmiah / Dystopian / Politik",
                    publisher: 'Secker & Warburg',
                    publicationDate: '1949-06-08',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '21 days',
                    renewalAvailability: 'No',
                    borrowQuota: '1 book per user',
                    popularity: 97,
                    isTrending: true,
                    isRecommended: true,
                    pdfUrl: 'https://www.clarkchargers.org/ourpages/auto/2015/3/10/50720556/1984.pdf'
                },
                {
                    id: 8,
                    title: 'The Great Gatsby',
                    author: 'F. Scott Fitzgerald',
                    description: 'The Great Gatsby adalah novel tahun 1925 karya penulis Amerika F. Scott Fitzgerald. Berlatar di Jazz Age di Long Island, dekat New York City, novel ini menceritakan tentang narator Nick Carraway dan interaksinya dengan tetangganya yang misterius dan kaya raya, Jay Gatsby, yang mengadakan pesta mewah di rumahnya tetapi tidak menghadirinya. Gatsby terobsesi dengan Daisy Buchanan, yang pernah dia cintai di masa muda mereka. Novel ini mengeksplorasi tema dekadensi, idealisme, resistensi terhadap perubahan, kelebihan sosial, dan menciptakan identitas baru, dan banyak dianggap sebagai peringatan terhadap "American Dream".',
                    copies: 3,
                    image: 'https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg',
                    pages: 218,
                    year: 1925,
                    isbn: '978-0743273565',
                    genre: "Fiksi / Klasik / Romansa",
                    publisher: "Charles Scribner's Sons",
                    publicationDate: '1925-04-10',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '14 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 94,
                    isTrending: false,
                    isRecommended: true,
                    pdfUrl: 'https://ct02210097.schoolwires.net/site/handlers/filedownload.ashx?moduleinstanceid=26616&dataid=28467&FileName=The%20Great%20Gatsby.pdf'
                },
                {
                    id: 9,
                    title: 'Moby-Dick',
                    author: 'Herman Melville',
                    description: 'Moby-Dick; or, The Whale adalah novel tahun 1851 karya penulis Amerika Herman Melville. Buku ini menceritakan petualangan narator Ishmael dan perjalanannya di atas kapal penangkap ikan paus Pequod, yang dikomandoi oleh Kapten Ahab yang obsesif. Ishmael segera mengetahui bahwa tujuan Ahab adalah membalas dendam pada Moby Dick, paus sperma putih raksasa yang pada pelayaran sebelumnya menghancurkan kapal Ahab dan memakan kakinya. Moby-Dick dianggap sebagai salah satu karya besar Sastra Amerika dan warisan dunia. Ini dikreditkan sebagai kontribusi terhadap genre American Renaissance. Melville memulai menulis Moby-Dick pada Februari 1850, dan akan menyelesaikan buku itu 18 bulan kemudian, setahun lebih lama dari yang dia antisipasi. Itu diterbitkan pertama kali pada Oktober 1851 di London, dalam tiga volume berjudul The Whale, dan sebulan kemudian di New York dalam satu volume.',
                    copies: 2,
                    image: 'https://img.perlego.com/book-covers/110070/9780486114347.jpg',
                    pages: 635,
                    year: 1851,
                    isbn: '978-0142437247',
                    genre: "Petualangan / Fiksi Maritim / Klasik",
                    publisher: 'Richard Bentley',
                    publicationDate: '1851-10-18',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '30 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '1 book per user',
                    popularity: 89,
                    isTrending: false,
                    isRecommended: false,
                    pdfUrl: 'https://uberty.org/wp-content/uploads/2015/12/herman-melville-moby-dick.pdf'
                },
                {
                    id: 10,
                    title: 'War and Peace',
                    author: 'Leo Tolstoy',
                    description: 'War and Peace adalah novel karya penulis Rusia Leo Tolstoy, yang diterbitkan secara serial, kemudian dalam bentuk buku lengkap pada tahun 1869. Ini dianggap sebagai salah satu karya sastra terbesar yang pernah ditulis. Novel ini menggambarkan masyarakat Rusia selama era Napoleon. Ini terutama mengikuti sejarah lima keluarga aristokrat—Bezukhovs, Bolkonskys, Rostovs, Kuragins, dan Drubetskoys—dan hubungan mereka dengan peristiwa bersejarah tahun 1805-1813, khususnya invasi Napoleon ke Rusia pada tahun 1812. War and Peace terkenal karena realisme psikologisnya, dan Tolstoy tidak ragu untuk mengganggu narasi dengan esai panjang tentang sejarah, perang, filsafat, dan nasib Rusia.',
                    copies: 3,
                    image: 'https://m.media-amazon.com/images/I/81W6BFaJJWL._AC_UF1000,1000_QL80_.jpg',
                    pages: 1225,
                    year: 1869,
                    isbn: '978-0140447934',
                    genre: "Fiksi Sejarah / Filsafat / Klasik",
                    publisher: 'The Russian Messenger',
                    publicationDate: '1869',
                    edition: 'First Edition',
                    language: 'Russian',
                    maxBorrowTime: '30 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '1 book per user',
                    popularity: 91,
                    isTrending: false,
                    isRecommended: true,
                    pdfUrl: 'https://antilogicalism.com/wp-content/uploads/2017/07/war-and-peace.pdf'
                },
                {
                    id: 11,
                    title: 'Introduction to Algorithms',
                    author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
                    description: 'Introduction to Algorithms adalah buku teks tentang algoritma yang digunakan secara luas dalam pendidikan ilmu komputer. Buku ini menyediakan pendekatan komprehensif untuk desain dan analisis algoritma. Sering disebut sebagai "CLRS" (dari inisial penulis), buku ini mencakup berbagai topik termasuk struktur data, algoritma sorting, pencarian, grafik, dan banyak lagi. Buku ini sangat cocok untuk mahasiswa ilmu komputer dan profesional yang ingin memperdalam pengetahuan tentang algoritma.',
                    copies: 4,
                    image: 'https://images-na.ssl-images-amazon.com/images/I/41T0iBxY8FL._SX442_BO1,204,203,200_.jpg',
                    pages: 1292,
                    year: 2009,
                    isbn: '978-0262033848',
                    genre: "Teknik Informatika / IT / Matematika / Buku Pegangan",
                    publisher: 'MIT Press',
                    publicationDate: '2009-07-31',
                    edition: 'Third Edition',
                    language: 'English',
                    maxBorrowTime: '30 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '1 book per user',
                    popularity: 85,
                    isTrending: false,
                    isRecommended: true,
                    pdfUrl: 'https://sd.blackball.lv/library/Introduction_to_Algorithms_Third_Edition_(2009).pdf'
                },
                {
                    id: 12,
                    title: 'The Wealth of Nations',
                    author: 'Adam Smith',
                    description: 'The Wealth of Nations adalah magnum opus ekonom Skotlandia Adam Smith. Diterbitkan pada tahun 1776, buku ini dianggap sebagai karya pertama dalam ilmu ekonomi modern. Smith membahas topik seperti pembagian kerja, produktivitas, dan pasar bebas. Karyanya tetap relevan dan berpengaruh dalam studi ekonomi hingga hari ini. Buku ini memberikan fondasi untuk pemahaman tentang ekonomi kapitalis dan pasar bebas.',
                    copies: 3,
                    image: 'https://cdn.gramedia.com/uploads/products/iin3tinlll.jpg',
                    pages: 950,
                    year: 1776,
                    isbn: '978-0140432084',
                    genre: "Ekonomi / Bisnis & Manajemen / Sejarah",
                    publisher: 'W. Strahan and T. Cadell',
                    publicationDate: '1776-03-09',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '21 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 82,
                    isTrending: false,
                    isRecommended: false,
                    pdfUrl: 'https://www.ibiblio.org/ml/libri/s/SmithA_WealthNations_p.pdf'
                },
                {
                    id: 13,
                    title: 'A Brief History of Time',
                    author: 'Stephen Hawking',
                    description: 'A Brief History of Time adalah buku sains populer karya fisikawan teoretis Stephen Hawking. Pertama kali diterbitkan pada tahun 1988, Hawking membahas konsep seperti ruang dan waktu, alam semesta yang mengembang, prinsip ketidakpastian, lubang hitam, dan teori string. Buku ini bertujuan untuk menjelaskan kosmologi kepada pembaca awam tanpa menggunakan matematika kompleks. Buku ini telah terjual lebih dari 25 juta kopi di seluruh dunia.',
                    copies: 5,
                    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSujnvHg8wg9AR6cOv3ntyZlO8Ab5DWSYON7g&s',
                    pages: 256,
                    year: 1988,
                    isbn: '978-0553380163',
                    genre: "Sains & Teknologi / Matematika / Sejarah",
                    publisher: 'Bantam Books',
                    publicationDate: '1988',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '14 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 90,
                    isTrending: true,
                    isRecommended: true,
                    pdfUrl: 'https://www.fisica.net/relatividade/stephen_hawking_a_brief_history_of_time.pdf'
                },
                {
                    id: 14,
                    title: 'The Hobbit',
                    author: 'J.R.R. Tolkien',
                    description: 'The Hobbit, or There and Back Again adalah novel fantasi tinggi karya penulis Inggris J. R. R. Tolkien. Novel ini diterbitkan pada 21 September 1937 dan mendapat pujian kritis, dinominasikan untuk Carnegie Medal dan dianugerahi penghargaan dari New York Herald Tribune untuk fiksi remaja terbaik. Novel ini mengisahkan petualangan hobbit bernama Bilbo Baggins saat ia melakukan perjalanan dengan sekelompok kurcaci untuk merebut kembali harta mereka dari naga Smaug. Cerita ini menjadi prekuel untuk The Lord of the Rings.',
                    copies: 6,
                    image: 'https://images-na.ssl-images-amazon.com/images/I/51uLvJlKpNL._SX321_BO1,204,203,200_.jpg',
                    pages: 310,
                    year: 1937,
                    isbn: '978-0547928227',
                    genre: "Fantasi / Petualangan / Young Adult",
                    publisher: 'George Allen & Unwin',
                    publicationDate: '1937-09-21',
                    edition: 'First Edition',
                    language: 'English',
                    maxBorrowTime: '21 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '2 books per user',
                    popularity: 96,
                    isTrending: true,
                    isRecommended: true,
                    pdfUrl: 'https://www.planetebook.com/free-ebooks/the-hobbit.pdf'
                },
                {
                    id: 15,
                    title: 'Calculus: Early Transcendentals',
                    author: 'James Stewart',
                    description: 'Buku teks kalkulus yang sangat populer digunakan di banyak universitas di seluruh dunia. Buku ini mencakup topik kalkulus diferensial dan integral dengan pendekatan yang jelas dan banyak contoh. Edisi ini terkenal karena penjelasannya yang mendalam dan latihan soal yang bervariasi. Cocok untuk mahasiswa teknik, sains, dan matematika yang mempelajari kalkulus untuk pertama kalinya.',
                    copies: 4,
                    image: 'https://openlibrary.telkomuniversity.ac.id/uploads/book/cover/20.21.1160.jpg',
                    pages: 1368,
                    year: 2015,
                    isbn: '978-1285741550',
                    genre: "Matematika / Buku Pelajaran / Sains & Teknologi",
                    publisher: 'Cengage Learning',
                    publicationDate: '2015-01-01',
                    edition: 'Eighth Edition',
                    language: 'English',
                    maxBorrowTime: '30 days',
                    renewalAvailability: 'Yes',
                    borrowQuota: '1 book per user',
                    popularity: 80,
                    isTrending: false,
                    isRecommended: false,
                    pdfUrl: 'https://www.stewartcalculus.com/media/8_home.php'
                }
            ];
            save(K_BOOKS, sample);
        }
        if (!load(K_USERS, null)) save(K_USERS, []);
        if (!load(K_BORROWS, null)) save(K_BORROWS, []);
    } catch (error) {
        console.error('Error in ensureDefaults:', error);
    }
}

// Animasi preloader teks
function animatePreloaderText() {
    try {
        const chars = document.querySelectorAll('.char');
        chars.forEach((char, index) => {
            char.style.animationDelay = `${index * 0.1}s`;
        });
    } catch (error) {
        console.error('Error in animatePreloaderText:', error);
    }
}

// Basic (not cryptographically secure) hash for demo
function simpleHash(s) {
    try {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = (h << 5) - h + s.charCodeAt(i);
            h |= 0;
        }
        return String(h);
    } catch (error) {
        console.error('Error in simpleHash:', error);
        return '0';
    }
}

// Auth
function registerUser(username, displayName, password) {
    try {
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
            passwordHash: simpleHash(password),
            joinDate: new Date().toISOString(),
            totalBorrows: 0
        });
        save(K_USERS, users);
        return {
            ok: true
        };
    } catch (error) {
        console.error('Error in registerUser:', error);
        return {
            ok: false,
            msg: 'Terjadi kesalahan saat mendaftar'
        };
    }
}

function loginUser(username, password) {
    try {
        const users = load(K_USERS, []);
        const u = users.find(x => x.username === username && x.passwordHash === simpleHash(password));
        if (!u) return {
            ok: false,
            msg: 'Username atau password salah'
        };
        save(K_CURRENT, {
            username: u.username,
            displayName: u.displayName,
            joinDate: u.joinDate,
            totalBorrows: u.totalBorrows || 0
        });
        return {
            ok: true,
            user: {
                username: u.username,
                displayName: u.displayName
            }
        };
    } catch (error) {
        console.error('Error in loginUser:', error);
        return {
            ok: false,
            msg: 'Terjadi kesalahan saat login'
        };
    }
}

function logout() {
    try {
        localStorage.removeItem(K_CURRENT);
        cache.delete(K_CURRENT);
        debouncedRenderAll();
        showPage('catalogPage');
    } catch (error) {
        console.error('Error in logout:', error);
    }
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
    try {
        return getBorrows().filter(b => b.username === username && !b.returned).length;
    } catch (error) {
        console.error('Error in userActiveBorrowsCount:', error);
        return 0;
    }
}

function borrowBook(username, bookId, durationDays) {
    try {
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

        // Update user stats
        const users = load(K_USERS, []);
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
            users[userIndex].totalBorrows = (users[userIndex].totalBorrows || 0) + 1;
            save(K_USERS, users);
        }

        save(K_BORROWS, borrows);
        return {
            ok: true
        };
    } catch (error) {
        console.error('Error in borrowBook:', error);
        return {
            ok: false,
            msg: 'Terjadi kesalahan saat meminjam buku'
        };
    }
}

function returnBorrow(borrowId) {
    try {
        const borrows = getBorrows();
        const rec = borrows.find(x => x.id === borrowId);
        if (!rec) return { ok: false };

        const returnDate = new Date();
        const lateDays = calculatePenalty(rec.dueDate, returnDate);
        rec.returned = true;
        rec.returnDate = returnDate.toISOString();
        rec.lateDays = lateDays;
        rec.penaltyAmount = calculatePenaltyAmount(lateDays);

        // Jika terlambat, beri penalty pada user
        if (lateDays > 0) {
            const users = load(K_USERS, []);
            const userIndex = users.findIndex(u => u.username === rec.username);
            if (userIndex !== -1) {
                users[userIndex].totalPenalty = (users[userIndex].totalPenalty || 0) + rec.penaltyAmount;
                users[userIndex].totalLateDays = (users[userIndex].totalLateDays || 0) + lateDays;
                save(K_USERS, users);
            }
        }

        save(K_BORROWS, borrows);
        return { ok: true, lateDays, penaltyAmount: rec.penaltyAmount };
    } catch (error) {
        console.error('Error in returnBorrow:', error);
        return { ok: false };
    }
}

// Page navigation
function showPage(pageId) {
    try {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show the selected page
        $(`#${pageId}`).classList.add('active');

        // If showing dashboard, update it
        if (pageId === 'dashboardPage') {
            renderDashboard();
        }
    } catch (error) {
        console.error('Error in showPage:', error);
    }
}

// Dashboard
function renderDashboard() {
    try {
        const currentUser = getCurrent();
        if (!currentUser) {
            showLoginModal('Silakan login untuk mengakses dashboard');
            return;
        }

        const users = load(K_USERS, []);
        const user = users.find(u => u.username === currentUser.username);
        const borrows = getBorrows().filter(b => b.username === currentUser.username);
        const activeBorrows = borrows.filter(b => !b.returned);
        const historyBorrows = borrows.filter(b => b.returned);

        const dashboardContent = $('#dashboardContent');
        dashboardContent.innerHTML = `
            <div class="dashboard-section">
                <h3>📊 Statistik Akun</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${activeBorrows.length}</div>
                        <div class="stat-label">Pinjaman Aktif</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${historyBorrows.length}</div>
                        <div class="stat-label">Total Pinjaman</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${user?.totalBorrows || 0}</div>
                        <div class="stat-label">Semua Waktu</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${5 - activeBorrows.length}</div>
                        <div class="stat-label">Sisa Kuota</div>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <h4>Informasi Akun</h4>
                    <div style="background: rgba(255,255,255,0.9); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                            <div>
                                <div class="muted small">Username</div>
                                <div><strong>${escapeHtml(currentUser.username)}</strong></div>
                            </div>
                            <div>
                                <div class="muted small">Nama Tampilan</div>
                                <div><strong>${escapeHtml(currentUser.displayName || currentUser.username)}</strong></div>
                            </div>
                            <div>
                                <div class="muted small">Tanggal Bergabung</div>
                                <div><strong>${user?.joinDate ? new Date(user.joinDate).toLocaleDateString('id-ID') : 'Tidak diketahui'}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-section">
                <h3>📚 Pinjaman Aktif</h3>
                ${activeBorrows.length === 0 ? 
                    '<p class="muted">Tidak ada pinjaman aktif.</p>' : 
                    activeBorrows.map(b => {
                        const book = getBooks().find(bb => bb.id === b.bookId);
                        const due = new Date(b.dueDate);
                        const now = new Date();
                        const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                        const isOverdue = daysLeft < 0;
                        
                        return `
                            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
                                    <div style="flex: 1;">
                                        <h4 style="margin: 0 0 8px 0;">${escapeHtml(book?.title || 'Buku tidak ditemukan')}</h4>
                                        <div class="muted small">${escapeHtml(book?.author || '')}</div>
                                        <div style="margin-top: 8px;">
                                            <span class="badge ${isOverdue ? 'overdue' : daysLeft <= 3 ? 'due-soon' : ''}">
                                                ${isOverdue ? `Telat ${Math.abs(daysLeft)} hari` : `${daysLeft} hari tersisa`}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <button onclick="readBook(${b.bookId})" style="margin-right: 8px;">📖 Baca</button>
                                        <button onclick="returnBorrowById(${b.id})">↪ Kembalikan</button>
                                    </div>
                                </div>
                                <div style="margin-top: 12px; font-size: 13px; color: var(--muted);">
                                    Dipinjam: ${new Date(b.borrowDate).toLocaleDateString('id-ID')} | 
                                    Jatuh tempo: ${due.toLocaleDateString('id-ID')}
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
            
            <div class="dashboard-section">
                <h3>🕐 Riwayat Peminjaman</h3>
                ${historyBorrows.length === 0 ? 
                    '<p class="muted">Belum ada riwayat peminjaman.</p>' : 
                    `<div style="max-height: 300px; overflow-y: auto;">
                        ${historyBorrows.slice(0, 10).map(b => {
                            const book = getBooks().find(bb => bb.id === b.bookId);
                            return `
                                <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <div><strong>${escapeHtml(book?.title || 'Buku tidak ditemukan')}</strong></div>
                                            <div class="muted small">${new Date(b.borrowDate).toLocaleDateString('id-ID')} - ${new Date(b.dueDate).toLocaleDateString('id-ID')}</div>
                                        </div>
                                        <span class="badge" style="background: rgba(46, 204, 113, 0.15); color: #27ae60;">Dikembalikan</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>`
                }
            </div>
        `;
    } catch (error) {
        console.error('Error in renderDashboard:', error);
    }
}

// Helper untuk return borrow dari dashboard
function returnBorrowById(borrowId) {
    try {
        if (confirm('Konfirmasi kembalikan buku?')) {
            const result = returnBorrow(borrowId);
            if (result.ok) {
                alert('Buku berhasil dikembalikan!');
                renderDashboard();
                debouncedRenderAll();
            }
        }
    } catch (error) {
        console.error('Error in returnBorrowById:', error);
    }
}

// Book utilities
function getRecommendedBooks() {
    try {
        const books = getBooks();
        return books.filter(book => book.isRecommended);
    } catch (error) {
        console.error('Error in getRecommendedBooks:', error);
        return [];
    }
}

const calculatePenalty = (dueDate, returnDate) => {
    const due = new Date(dueDate);
    const returned = new Date(returnDate || new Date());
    const diffDays = Math.ceil((returned - due) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays); // Hari keterlambatan
};

const calculatePenaltyAmount = (lateDays) => {
    // Penalty: Rp 2,000 per hari keterlambatan
    return lateDays * 2000;
};

function getTrendingBooks() {
    try {
        const books = getBooks();
        return books.filter(book => book.isTrending);
    } catch (error) {
        console.error('Error in getTrendingBooks:', error);
        return [];
    }
}

function getRandomBooks(count = 4) {
    try {
        const books = getBooks();
        const shuffled = [...books].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    } catch (error) {
        console.error('Error in getRandomBooks:', error);
        return [];
    }
}

function getGenres() {
    return GENRES;
}

// Fungsi untuk membaca buku
function readBook(bookId) {
    try {
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
    } catch (error) {
        console.error('Error in readBook:', error);
        alert('Terjadi kesalahan saat membuka buku');
    }
}

// Fungsi untuk menampilkan halaman baca
function showReadPage(bookId) {
    try {
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
    } catch (error) {
        console.error('Error in showReadPage:', error);
    }
}

function downloadPdf(bookId) {
    try {
        const book = getBooks().find(b => b.id === bookId);
        if (!book) return;

        // Selalu diarahkan ke bajak.html
        const pdfUrl = "bajak.html";

        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${book.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error in downloadPdf:', error);
        alert('Terjadi kesalahan saat mengunduh PDF');
    }
}


// Fungsi untuk update buku
function updateBook(bookId, newData) {
    try {
        const books = getBooks();
        const bookIndex = books.findIndex(b => b.id === bookId);
        if (bookIndex === -1) return false;

        books[bookIndex] = {...books[bookIndex], ...newData };
        save(K_BOOKS, books);
        cache.delete(K_BOOKS); // Clear cache
        renderedBooksCache.clear(); // Clear render cache
        return true;
    } catch (error) {
        console.error('Error in updateBook:', error);
        return false;
    }
}

function renderBookCard(book, container, showBadge = false) {
    try {
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
        el.dataset.id = book.id;

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
                <img src="${book.image}" alt="${escapeHtml(book.title)}" class="book-cover" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%23f0f0f0%27/%3E%3Ctext x=%2750%27 y=%2750%27 text-anchor=%27middle%27 dy=%27.3em%27 font-family=%27sans-serif%27 fill=%27%23999%27%3EBuku%3C/text%3E%3C/svg%3E'">
                ${badgeHTML}
            </div>
            <div class="genre-tag">${escapeHtml(book.genre.split('/')[0].trim())}</div>
            <h4>${escapeHtml(book.title)}</h4>
            <div class="muted small">${escapeHtml(book.author)}</div>
            <div style="margin-top:8px; font-size: 13px; color: var(--text-light); line-height: 1.5;">
                ${escapeHtml(book.description.substring(0, 80))}...
            </div>
            <div class="book-actions">
                <div>
                    <div class="muted small">Tersedia: <strong>${available}</strong></div>
                </div>
                <div>
                    <button class="detail-btn" data-id="${book.id}">Detail</button>
                    ${userHasBorrowed ? `<button class="read-btn" data-id="${book.id}">Baca</button>` : ''}
                </div>
            </div>
        `;

        // Simpan ke cache
        renderedBooksCache.set(bookKey, el.cloneNode(true));
        container.appendChild(el);
    } catch (error) {
        console.error('Error in renderBookCard:', error);
    }
}

function showBookDetail(bookId) {
    try {
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
                    <img src="${book.image}" alt="${escapeHtml(book.title)}" class="book-cover-large" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%23f0f0f0%27/%3E%3Ctext x=%2750%27 y=%2750%27 text-anchor=%27middle%27 dy=%27.3em%27 font-family=%27sans-serif%27 fill=%27%23999%27%3EBuku%3C/text%3E%3C/svg%3E'">
                </div>

                <div class="synopsis-section">
                    <div class="section-title">SYNOPSIS</div>
                    <div class="synopsis-text">${escapeHtml(book.description)}</div>
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
                            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
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
    } catch (error) {
        console.error('Error in showBookDetail:', error);
    }
}

// Fungsi untuk menampilkan editor buku
function showBookEditor() {
    try {
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
    } catch (error) {
        console.error('Error in showBookEditor:', error);
    }
}

function saveBookChanges(bookId) {
    try {
        const newImage = $(`#edit-image-${bookId}`).value;
        const newPdf = $(`#edit-pdf-${bookId}`).value;

        if (updateBook(bookId, { image: newImage, pdfUrl: newPdf })) {
            alert('✅ Buku berhasil diupdate!');
            debouncedRenderAll();
        } else {
            alert('❌ Gagal mengupdate buku');
        }
    } catch (error) {
        console.error('Error in saveBookChanges:', error);
        alert('❌ Terjadi kesalahan saat mengupdate buku');
    }
}

function testBookImage(bookId) {
    try {
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
    } catch (error) {
        console.error('Error in testBookImage:', error);
        alert('❌ Terjadi kesalahan saat menguji gambar');
    }
}

function testBookPdf(bookId) {
    try {
        const pdfUrl = $(`#edit-pdf-${bookId}`).value;
        if (!pdfUrl) {
            alert('❌ URL PDF kosong');
            return;
        }

        window.open(pdfUrl, '_blank');
    } catch (error) {
        console.error('Error in testBookPdf:', error);
        alert('❌ Terjadi kesalahan saat menguji PDF');
    }
}

function showTermsModal(bookId, duration, book) {
    try {
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

Setiap pengguna bertanggung jawab penuh atas keamanan akun masing-masing. <br><br>

2. Ketentuan Peminjaman Buku

Setiap pengguna dapat meminjam maksimal 3 buku secara bersamaan (dapat disesuaikan).

Masa peminjaman buku adalah 7–14 hari tergantung jenis buku.

Peminjaman dilakukan secara digital melalui platform perpustakaan online.

Pengguna wajib memastikan koneksi internet stabil untuk mengakses buku digital.<br><br>

3. Perpanjangan Masa Peminjaman

Perpanjangan hanya dapat dilakukan 1 kali per buku.

Perpanjangan tidak dapat dilakukan jika buku tersebut sedang dalam status antrian tunggu oleh pengguna lain.

Permintaan perpanjangan harus diajukan sebelum masa pinjam berakhir. <br><br>

4. Pengembalian Buku

Pengembalian dilakukan otomatis saat masa pinjam habis.

Jika pengguna selesai lebih cepat, buku dapat dikembalikan melalui menu "Pengembalian" di aplikasi.

Pengguna tetap bertanggung jawab atas penggunaan buku hingga proses pengembalian selesai.<br><br>

5. Denda dan Pelanggaran

Keterlambatan pengembalian buku fisik (jika ada) dikenakan denda sesuai kebijakan perpustakaan.

Buku digital yang habis masa pinjamnya akan otomatis terkunci dan tidak dikenakan denda.

Penyalahgunaan akses buku (misalnya membagikan file ilegal) akan dikenai sanksi hingga pemblokiran akun. <br><br>

6. Larangan Penggunaan

Pengguna dilarang:

Menggandakan, mendistribusikan, atau menjual kembali buku digital.

Membocorkan akun atau akses kepada pihak lain.

Menggunakan platform untuk tujuan ilegal atau melanggar hak cipta. <br><br>

7. Hak dan Kewajiban Perpustakaan

Perpustakaan berhak mengubah kebijakan tanpa pemberitahuan sebelumnya.

Perpustakaan berhak menangguhkan atau menghapus akun yang melanggar syarat dan ketentuan.

Perpustakaan berkewajiban menjaga keamanan data pengguna sesuai kebijakan privasi. <br><br>

8. Persetujuan Pengguna

Dengan menggunakan layanan perpustakaan online, pengguna dianggap setuju dengan seluruh syarat dan ketentuan yang berlaku.</p>

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
    } catch (error) {
        console.error('Error in showTermsModal:', error);
    }
}

// ======= KATEGORI FUNGSI =======

function renderCategories() {
    try {
        const grid = $('#categoriesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        CATEGORIES.forEach(category => {
            // Hitung jumlah buku untuk kategori ini
            const booksInCategory = countBooksInCategory(category);

            const categoryEl = document.createElement('div');
            categoryEl.className = `category-card ${currentCategory === category.id ? 'active' : ''}`;
            categoryEl.id = `category-${category.id}`;
            categoryEl.style.borderLeft = `4px solid ${category.color}`;

            // Membuat HTML untuk icon dengan gambar dan fallback ke emoji
            const iconHTML = `
                <div class="category-icon" style="background: ${category.color}20; color: ${category.color};">
                    <img src="${category.image}" alt="${category.name}" class="category-icon-img" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="category-icon-fallback" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${category.icon}</div>
                </div>
            `;

            categoryEl.innerHTML = `
                ${iconHTML}
                <div class="category-name">${category.name}</div>
                <div class="category-count">${booksInCategory} buku</div>
                ${booksInCategory > 0 ? `<div class="category-badge" style="background: ${category.color};">New</div>` : ''}
            `;

            categoryEl.addEventListener('click', () => {
                if (categoryTimeout) {
                    clearTimeout(categoryTimeout);
                }

                categoryTimeout = setTimeout(() => {
                    filterByCategory(category.id);
                }, 50);
            });

            grid.appendChild(categoryEl);
        });

        // Update tombol clear filter
        updateClearFilterButton();
    } catch (error) {
        console.error('Error in renderCategories:', error);
    }
}

function countBooksInCategory(category) {
    try {
        const books = getBooks();
        return books.filter(book => {
            const bookGenre = book.genre.toLowerCase();
            return category.keywords.some(keyword =>
                bookGenre.includes(keyword.toLowerCase())
            );
        }).length;
    } catch (error) {
        console.error('Error in countBooksInCategory:', error);
        return 0;
    }
}

function filterByCategory(categoryId) {
    try {
        // Reset search and genre filter
        $('#searchInput').value = '';
        $('#genreFilter').value = '';

        // Toggle category
        if (currentCategory === categoryId) {
            // Jika klik kategori yang sama, reset filter
            currentCategory = null;
            renderAllBooks('', '');
        } else {
            // Filter berdasarkan kategori baru
            currentCategory = categoryId;
            const category = CATEGORIES.find(c => c.id === categoryId);
            if (!category) return;

            // Filter buku berdasarkan keywords kategori
            const allBooks = getBooks();
            const filteredBooks = allBooks.filter(book => {
                const bookGenre = book.genre.toLowerCase();
                return category.keywords.some(keyword =>
                    bookGenre.includes(keyword.toLowerCase())
                );
            });

            renderFilteredBooks(filteredBooks, category.name);
        }

        // Update UI kategori
        updateCategoryUI();
        updateClearFilterButton();
    } catch (error) {
        console.error('Error in filterByCategory:', error);
    }
}

function renderFilteredBooks(books, categoryName) {
    try {
        const grid = $('#booksGrid');
        grid.innerHTML = '';

        if (books.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
                    <h3 style="margin: 0 0 8px 0;">Tidak ada buku ditemukan</h3>
                    <p class="muted">Tidak ada buku dalam kategori "${categoryName}"</p>
                    <button onclick="clearCategoryFilter()" class="primary" style="margin-top: 16px;">
                        Tampilkan Semua Buku
                    </button>
                </div>
            `;
            return;
        }

        books.forEach(book => {
            renderBookCard(book, grid, false);
        });

        bindDetailButtons(grid);

        // Update book count text
        $('#bookCountText').textContent = `Menampilkan ${books.length} buku dalam kategori ${categoryName}`;

        // Scroll ke bagian semua buku
        setTimeout(() => {
            document.querySelector('#booksGrid').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    } catch (error) {
        console.error('Error in renderFilteredBooks:', error);
    }
}

function updateCategoryUI() {
    try {
        // Update semua kategori
        document.querySelectorAll('.category-card').forEach(card => {
            const categoryId = card.id.replace('category-', '');
            if (categoryId === currentCategory) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    } catch (error) {
        console.error('Error in updateCategoryUI:', error);
    }
}

function clearCategoryFilter() {
    try {
        currentCategory = null;
        $('#searchInput').value = '';
        $('#genreFilter').value = '';
        renderAllBooks('', '');
        updateCategoryUI();
        updateClearFilterButton();
    } catch (error) {
        console.error('Error in clearCategoryFilter:', error);
    }
}

function updateClearFilterButton() {
    try {
        const clearFilterBtn = $('#clearCategoryFilter');
        if (clearFilterBtn) {
            if (currentCategory) {
                clearFilterBtn.style.display = 'inline-block';
                // Update teks dengan nama kategori
                const category = CATEGORIES.find(c => c.id === currentCategory);
                if (category) {
                    clearFilterBtn.innerHTML = `✕ Hapus Filter (${category.name})`;
                }
            } else {
                clearFilterBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error in updateClearFilterButton:', error);
    }
}

/* ======= UI rendering ======= */
function renderRecommendedBooks() {
    try {
        const grid = $('#recommendedGrid');
        grid.innerHTML = '';
        const recommendedBooks = getRecommendedBooks();

        if (recommendedBooks.length === 0) {
            grid.innerHTML = '<div class="muted small">Tidak ada rekomendasi saat ini.</div>';
            return;
        }

        // Take up to 4 books for recommendations
        const booksToShow = recommendedBooks.slice(0, 4);
        booksToShow.forEach(book => {
            renderBookCard(book, grid, true);
        });

        bindDetailButtons(grid);
    } catch (error) {
        console.error('Error in renderRecommendedBooks:', error);
    }
}

function renderTrendingBooks() {
    try {
        const grid = $('#trendingGrid');
        grid.innerHTML = '';
        const trendingBooks = getTrendingBooks();

        if (trendingBooks.length === 0) {
            grid.innerHTML = '<div class="muted small">Tidak ada buku trending saat ini.</div>';
            return;
        }

        // Take up to 4 books for trending
        const booksToShow = trendingBooks.slice(0, 4);
        booksToShow.forEach(book => {
            renderBookCard(book, grid, true);
        });

        bindDetailButtons(grid);
    } catch (error) {
        console.error('Error in renderTrendingBooks:', error);
    }
}

function renderAllBooks(filterGenre = '', searchQuery = '') {
    try {
        const grid = $('#booksGrid');
        grid.innerHTML = '';
        let allBooks = getBooks();

        // Reset kategori jika ada filter genre atau search
        if (filterGenre || searchQuery) {
            currentCategory = null;
            updateCategoryUI();
            updateClearFilterButton();
        }

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
        if (currentCategory) {
            const category = CATEGORIES.find(c => c.id === currentCategory);
            bookCountText.textContent = `Menampilkan ${allBooks.length} buku dalam kategori ${category ? category.name : ''}`;
        } else if (filterGenre) {
            bookCountText.textContent = `Menampilkan ${allBooks.length} buku dalam genre ${filterGenre}`;
        } else if (searchQuery) {
            bookCountText.textContent = `Menampilkan ${allBooks.length} buku untuk "${searchQuery}"`;
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
    } catch (error) {
        console.error('Error in renderAllBooks:', error);
    }
}

function bindDetailButtons(container) {
    try {
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
    } catch (error) {
        console.error('Error in bindDetailButtons:', error);
    }
}

function renderGenreFilter() {
    try {
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
    } catch (error) {
        console.error('Error in renderGenreFilter:', error);
    }
}

function randomizeBooks() {
    try {
        // Clear cache saat merandom
        renderedBooksCache.clear();
        currentCategory = null;
        updateCategoryUI();
        updateClearFilterButton();

        // For all books section, we'll shuffle the books
        const currentGenre = $('#genreFilter').value;
        const currentSearch = $('#searchInput').value;
        
        // Get all books and shuffle
        let allBooks = getBooks();
        if (currentGenre) {
            allBooks = allBooks.filter(book => book.genre === currentGenre);
        }
        
        if (currentSearch) {
            const query = currentSearch.toLowerCase();
            allBooks = allBooks.filter(book =>
                book.title.toLowerCase().includes(query) ||
                book.author.toLowerCase().includes(query) ||
                book.description.toLowerCase().includes(query) ||
                book.genre.toLowerCase().includes(query)
            );
        }
        
        // Shuffle the array
        const shuffled = [...allBooks].sort(() => Math.random() - 0.5);
        
        // Render shuffled books
        const grid = $('#booksGrid');
        grid.innerHTML = '';
        shuffled.forEach(book => {
            renderBookCard(book, grid, false);
        });
        bindDetailButtons(grid);
        
        // Update text
        $('#bookCountText').textContent = `Menampilkan ${shuffled.length} buku (acak)`;
        
        // Show notification
        alert('✅ Buku telah diacak!');
    } catch (error) {
        console.error('Error in randomizeBooks:', error);
    }
}

function renderProfile() {
    try {
        const area = $('#profileArea');
        const cur = getCurrent();
        if (!cur) {
            area.innerHTML = 'Silakan login untuk melihat profil.';
            $('#userInfo').textContent = 'Belum masuk';
            $('#btnLogout').style.display = 'none';
            $('#btnDashboard').style.display = 'none';
            $('#btnShowLogin').style.display = 'inline-block';
            $('#btnEditBooks').style.display = 'none';
            return;
        }
        area.innerHTML = `<div><strong>${escapeHtml(cur.displayName||cur.username)}</strong></div><div class="muted small">@${escapeHtml(cur.username)}</div>`;
        $('#userInfo').textContent = `Masuk sebagai ${cur.displayName||cur.username}`;
        $('#btnLogout').style.display = 'inline-block';
        $('#btnDashboard').style.display = 'inline-block';
        $('#btnShowLogin').style.display = 'none';
        $('#btnEditBooks').style.display = 'inline-block';
    } catch (error) {
        console.error('Error in renderProfile:', error);
    }
}

function renderBorrows() {
    try {
        const cur = getCurrent();
        const list = $('#borrowList');
        list.innerHTML = '';
        if (!cur) {
            list.innerHTML = '<div class="muted small">Silakan login untuk melihat pinjaman Anda.</div>';
            return;
        }
        const items = getBorrows().filter(x => x.username === cur.username && !x.returned);
        if (items.length === 0) {
            list.innerHTML = '<div class="muted small">Tidak ada pinjaman aktif.</div>';
            return;
        }
        items.forEach(b => {
            const book = getBooks().find(bb => bb.id === b.bookId);
            const due = new Date(b.dueDate);
            const daysLeft = Math.ceil((due - new Date()) / (24 * 60 * 60 * 1000));
            const badge = daysLeft < 0 ? `<span class="badge overdue">Telat ${Math.abs(daysLeft)} hari</span>` : (daysLeft <= 3 ? `<span class="badge due-soon">${daysLeft} hari tersisa</span>` : `<span class="badge">${daysLeft} hari tersisa</span>`);
            const el = document.createElement('div');
            el.style.marginBottom = '12px';
            el.style.padding = '12px';
            el.style.background = 'rgba(255,255,255,0.9)';
            el.style.borderRadius = '8px';
            el.style.border = '1px solid var(--border)';
            el.innerHTML = `
              <div><strong>${escapeHtml(book.title)}</strong> <div class="muted small">${escapeHtml(book.author)}</div></div>
              <div class="small muted" style="margin-top: 4px;">Dipinjam: ${new Date(b.borrowDate).toLocaleDateString('id-ID')} | Jatuh tempo: ${due.toLocaleDateString('id-ID')}</div>
              <div style="margin-top:8px">${badge} <button data-return="${b.id}" style="margin-left:8px; padding: 4px 8px; font-size: 12px;">Kembalikan</button></div>
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
    } catch (error) {
        console.error('Error in renderBorrows:', error);
    }
}

function renderHistory() {
    try {
        const cur = getCurrent();
        const area = $('#historyArea');
        if (!cur) {
            area.innerHTML = 'Silakan login untuk melihat riwayat.';
            return;
        }
        const items = getBorrows().filter(x => x.username === cur.username && x.returned).sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
        if (items.length === 0) {
            area.innerHTML = '<div class="muted small">Belum ada riwayat peminjaman.</div>';
            return;
        }
        area.innerHTML = items.slice(0, 3).map(r => {
            const book = getBooks().find(bb => bb.id === r.bookId);
            return `<div style="margin-bottom:8px; padding: 8px; background: rgba(255,255,255,0.9); border-radius: 6px; border: 1px solid var(--border);">
                      <div><strong>${escapeHtml(book.title)}</strong></div>
                      <div class="muted small">${new Date(r.borrowDate).toLocaleDateString('id-ID')} - ${new Date(r.dueDate).toLocaleDateString('id-ID')}</div>
                      <span class="badge" style="background: rgba(46, 204, 113, 0.15); color: #27ae60; margin-top: 4px;">Dikembalikan</span>
                    </div>`;
        }).join('');
        if (items.length > 3) {
            area.innerHTML += `<div class="muted small" style="margin-top: 8px;">...dan ${items.length - 3} pinjaman lainnya</div>`;
        }
    } catch (error) {
        console.error('Error in renderHistory:', error);
    }
}

// Debounced render function untuk menghindari render berlebihan
function debouncedRenderAll() {
    try {
        if (isRendering) return;

        if (renderTimeout) {
            clearTimeout(renderTimeout);
        }

        renderTimeout = setTimeout(() => {
            isRendering = true;
            renderAll();
            isRendering = false;
        }, 50); // Delay 50ms
    } catch (error) {
        console.error('Error in debouncedRenderAll:', error);
    }
}

function renderAll() {
    try {
        renderProfile();
        renderCategories();
        renderRecommendedBooks();
        renderTrendingBooks();
        renderGenreFilter();
        renderAllBooks('', '');
        renderBorrows();
        renderHistory();
    } catch (error) {
        console.error('Error in renderAll:', error);
    }
}

// Modal helpers
function showLoginModal(msg) {
    try {
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
    } catch (error) {
        console.error('Error in showLoginModal:', error);
    }
}

function escapeHtml(s) {
    try {
        return String(s).replace(/[&<>"]/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;"
        }[c]));
    } catch (error) {
        console.error('Error in escapeHtml:', error);
        return String(s);
    }
}

// Initialize everything
function init() {
    try {
        ensureDefaults();
        animatePreloaderText();
        renderAll();
        
        // Event listeners
        $('#btnShowLogin').addEventListener('click', () => showLoginModal());
        $('#btnLogout').addEventListener('click', () => {
            if (confirm('Logout?')) {
                logout();
            }
        });
        $('#btnEditBooks').addEventListener('click', showBookEditor);
        $('#btnDashboard').addEventListener('click', () => showPage('dashboardPage'));
        $('#backToCatalog').addEventListener('click', () => showPage('catalogPage'));
        $('#backToCatalogFromDashboard').addEventListener('click', () => showPage('catalogPage'));
        $('#backFromRead').addEventListener('click', () => showPage('catalogPage'));
        
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
        
        $('#clearCategoryFilter').addEventListener('click', () => {
            clearCategoryFilter();
        });
        
        $('#randomizeBtn').addEventListener('click', randomizeBooks);
        
        $('#downloadPdf').addEventListener('click', () => {
            if (currentReadingBookId) {
                downloadPdf(currentReadingBookId);
            }
        });
        
        // Search and filter dengan debounce
        let searchTimeout = null;
        $('#searchInput').addEventListener('input', () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            searchTimeout = setTimeout(() => {
                const searchQuery = $('#searchInput').value;
                const selectedGenre = $('#genreFilter').value;
                currentCategory = null; // Reset kategori saat search
                updateCategoryUI();
                updateClearFilterButton();
                renderAllBooks(selectedGenre, searchQuery);
            }, 300); // Delay 300ms
        });
        
        $('#genreFilter').addEventListener('change', () => {
            const selectedGenre = $('#genreFilter').value;
            const searchQuery = $('#searchInput').value;
            currentCategory = null; // Reset kategori saat filter genre
            updateCategoryUI();
            updateClearFilterButton();
            renderAllBooks(selectedGenre, searchQuery);
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
        
        // Modal cancel button
        $('#loginModalCancel').addEventListener('click', () => {
            $('#loginModal').style.display = 'none';
        });
        
        $('#loginModalOk').addEventListener('click', () => {
            $('#loginModal').style.display = 'none';
        });
        
        // Hide preloader after 3 seconds
        setTimeout(() => {
            const preloader = $('#preloader');
            if (preloader) {
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    preloader.style.display = 'none';
                    showPage('catalogPage');
                }, 500);
            }
        }, 3000);
        
        // Periodic UI refresh for countdowns
        setInterval(() => {
            try {
                renderBorrows();
                renderHistory();
            } catch (error) {
                console.error('Error in periodic refresh:', error);
            }
        }, 30000); // 30 detik
        
    } catch (error) {
        console.error('Error in init:', error);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);