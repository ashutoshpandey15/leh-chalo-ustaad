/* Route, dhaba menus, dialogues, truck art — all the content lives here. */

const ROUTE_KM = 474;

// km = distance from Manali, alt = metres (approx.)
const STOPS = [
  { km: 0,   en: 'MANALI',       hi: 'मनाली',        alt: 2050, type: 'town',   line: 'सेब की खुशबू, मॉल रोड की भीड़ — यहीं से सफ़र शुरू.' },
  { km: 13,  en: 'SOLANG',       hi: 'सोलंग',         alt: 2480, type: 'town',   line: 'पैराग्लाइडिंग वाले ऊपर उड़ रहे हैं, हम नीचे रेंग रहे हैं.' },
  { km: 25,  en: 'ATAL TUNNEL',  hi: 'अटल टनल',      alt: 3060, type: 'tunnel', len: 9, line: '9 किलोमीटर की सुरंग. लाइट जला लो उस्ताद!' },
  { km: 38,  en: 'SISSU',        hi: 'सिस्सू',         alt: 3130, type: 'dhaba',  dhaba: 'Sissu Jharna Dhaba', line: 'झरना दिख रहा है. रुको, चाय पी के चलते हैं.' },
  { km: 58,  en: 'TANDI',        hi: 'तांदी',          alt: 2573, type: 'pump',   line: 'अगला पेट्रोल पंप 365 km बाद. टंकी फुल कराओ!' },
  { km: 67,  en: 'KEYLONG',      hi: 'केलांग',         alt: 3080, type: 'town',   line: 'लाहौल का दिल. इसके बाद नेटवर्क भगवान भरोसे.' },
  { km: 88,  en: 'JISPA',        hi: 'जिस्पा',         alt: 3200, type: 'dhaba',  dhaba: 'Bhaga Kinare Dhaba', line: 'नदी किनारे टेंट, ठंडी हवा — उस्ताद, बस 10 मिनट.' },
  { km: 95,  en: 'DARCHA',       hi: 'दारचा',          alt: 3360, type: 'check',  line: 'चेकपोस्ट! कागज़ दिखाओ, मुस्कुराओ, आगे बढ़ो.' },
  { km: 128, en: 'ZINGZING BAR', hi: 'ज़िंगज़िंग बार',  alt: 4270, type: 'dhaba',  dhaba: 'ZingZing Maggi Point', line: 'नाम सुन के मत हँसो. इस बार में सिर्फ़ चाय मिलती है.' },
  { km: 142, en: 'BARALACHA LA', hi: 'बारालाचा ला',   alt: 4890, type: 'pass',   line: '4,890 मीटर. साँस धीरे लो, गाड़ी धीरे चलाओ.' },
  { km: 178, en: 'SARCHU',       hi: 'सरचू',           alt: 4290, type: 'dhaba',  dhaba: 'Sarchu Tent Dhaba', line: 'हिमाचल ख़त्म, लद्दाख शुरू. रात को माइनस 5.' },
  { km: 203, en: 'GATA LOOPS',   hi: 'गाटा लूप्स',     alt: 4190, type: 'loops',  line: '21 हेयरपिन मोड़. गिनती शुरू... 1, 2, 3... चक्कर आ गया.' },
  { km: 213, en: 'NAKEE LA',     hi: 'नकी ला',         alt: 4740, type: 'pass',   line: 'एक और दर्रा. उस्ताद का गियरबॉक्स सब देख चुका है.' },
  { km: 230, en: 'LACHULUNG LA', hi: 'लाचुलुंग ला',    alt: 5059, type: 'pass',   line: '5,059 मीटर. चिप्स का पैकेट फूल के फ़ुटबॉल बन गया.' },
  { km: 260, en: 'PANG',         hi: 'पांग',           alt: 4600, type: 'dhaba',  dhaba: 'Pang Parachute Dhaba', line: 'आधी रात, पैराशूट टेंट, गरम मैगी. ज़िंदगी सेट.' },
  { km: 300, en: 'MORE PLAINS',  hi: 'मोरे मैदान',     alt: 4700, type: 'plains', line: '40 km सीधा मैदान. अब दबा दो एक्सीलेटर... आराम से.' },
  { km: 336, en: 'TANGLANG LA',  hi: 'तंगलंग ला',      alt: 5328, type: 'pass',   line: '5,328 मीटर! फ़ोटो लो, स्टोरी डालो, ऑक्सीजन बचाओ.' },
  { km: 362, en: 'RUMTSE',       hi: 'रुम्त्से',        alt: 4250, type: 'town',   line: 'पहला लद्दाखी गाँव. जुले जुले!' },
  { km: 401, en: 'UPSHI',        hi: 'उपशी',           alt: 3400, type: 'check',  line: 'सिंधु नदी के पहले दर्शन. नमस्ते सिंधु भैया.' },
  { km: 430, en: 'KARU',         hi: 'कारू',           alt: 3450, type: 'town',   line: 'फ़ौजी इलाक़ा. ठसके से सलाम ठोको.' },
  { km: 474, en: 'LEH',          hi: 'लेह',            alt: 3500, type: 'finish', line: 'जुले! पहुँच गए. उस्ताद, आप तो हीरो निकले.' },
];

// Base prices at Manali; they climb with altitude (the famous "Maggi inflation").
const MENU_HIMACHAL = [
  ['Masala Maggi', 40], ['Cutting Chai', 15], ['Aloo Parantha + makkhan', 60],
  ['Rajma Chawal', 90], ['Siddu (desi ghee)', 70],
];
const MENU_LADAKH = [
  ['Masala Maggi', 40], ['Butter Tea', 20], ['Thukpa', 90],
  ['Veg Momos', 80], ['Anda Bhurji', 60],
];

const QUOTES = [
  ['KHALASI BOLA',        'उस्ताद, गाना बदलो — ये तीसरी बार चल रहा है.'],
  ['KHALASI BOLA',        'उस्ताद, आगे अंधा मोड़ है. हॉर्न दे दो.'],
  ['KHALASI BOLA',        'मैगी का पैकेट फूल गया. ऊँचाई आ गई.'],
  ['KHALASI BOLA',        'नेटवर्क गया. अब बस आप, मैं और ये पहाड़.'],
  ['USTAAD BOLE',         'बेटा, पहाड़ पे जल्दी करने वाले नीचे जल्दी पहुँचते हैं.'],
  ['USTAAD BOLE',         'गियर तीसरा, दिल पहला.'],
  ['USTAAD BOLE',         'ये रोड नहीं, इम्तिहान है. और हम टॉपर हैं.'],
  ['USTAAD BOLE',         'डीज़ल और धैर्य — दोनों बचा के रखो.'],
  ['USTAAD BOLE',         '22 साल से यही रूट. पहाड़ मुझे नाम से जानते हैं.'],
  ['ARMY WALE BHAIYA',    'धीरे चलाना, आगे बर्फ़ है. जय हिंद!'],
  ['DHABA WALI AUNTY',    'बेटा, मैगी में अंडा डालूँ? ऊपर ठंड है.'],
  ['PEECHE SE SAWARI',    'Story daal di, par network nahi hai. Draft mein pada hai.'],
  ['PEECHE SE SAWARI',    'Bhaiya, ek photo truck ke saath? Bio mein daalunga.'],
  ['BRO KA BOARD',        'पहाड़ पे रेस नहीं, केस होता है.'],
  ['BRO KA BOARD',        'ओवरटेक का शौक़ है? नीचे खाई भी शौक़ीन है.'],
];

const BIKE_LINES = [
  'Julley ustaad! Rasta dene ke liye thank you!',
  'Bhaiya, Leh kitna door? Reel ka deadline hai.',
  'Bullet garam ho gayi, hum thande.',
  'Ustaad, truck mast sajaya hai — photo le lein?',
];
const ARMY_LINES = [
  'Convoy aa raha hai. Side do, salute karo. Jai Hind!',
  'Fauji bhaiya ne haath hilaya. Dil garden garden.',
];
const TAXI_LINES = [
  'Tourist taxi wale bhaiya: "Ustaad, aage jam hai kya?"',
  'Taxi mein se kisi ne gaana gaaya: "Ilahi meraa jee aaye aaye..."',
];

const PALETTES = [
  { id: 'rangeela', name: 'Punjab Rangeela', body: '#d62839', trim: '#ffd23f', accent: '#1b998b', cab: '#f28c28', tarp: '#2f5d8a' },
  { id: 'neela',    name: 'Shahi Neela',     body: '#1d4e89', trim: '#f5f1e3', accent: '#f6c90e', cab: '#2a9d8f', tarp: '#8a5a2b' },
  { id: 'kesariya', name: 'Kesariya',        body: '#f77f00', trim: '#003049', accent: '#fcbf49', cab: '#d62828', tarp: '#3a5a40' },
  { id: 'gulabi',   name: 'Gulabi Gang',     body: '#ff4f8b', trim: '#fff1a8', accent: '#7b2cbf', cab: '#ff99c8', tarp: '#2d3a8c' },
  { id: 'hara',     name: 'Hara Bhara',      body: '#2b9348', trim: '#fcf300', accent: '#e63946', cab: '#ffbe0b', tarp: '#1d3557' },
];

// Painted on the back of the truck (customiser). Classics first, Gen-Z at the end.
const SLOGANS = [
  'बुरी नज़र वाले तेरा मुँह काला',
  'माँ का आशीर्वाद',
  'देखो मगर प्यार से',
  'जलो मत, बराबरी करो',
  'फिर मिलेंगे',
  'टाटा बाय बाय',
  'हम दो हमारे दो',
  '13 मेरा 7',
  'जय माता दी',
  'मेरा भारत महान',
  'दुल्हन ही दहेज़ है',
  'लटक मत, टपक जाएगा',
  'नीयत साफ़, मंज़िल आसान',
  'किस्मत अपनी अपनी',
  'जगह मिलने पर साइड दी जाएगी',
  'चलती है गाड़ी, उड़ती है धूल',
  'धीरे चलोगे तो बार-बार मिलोगे',
  'सौ में से निन्यानवे बेईमान, फिर भी मेरा भारत महान',
  'मालिक की गाड़ी, ड्राइवर का पसीना',
  'Wait for Side',
  'Keep Distance',
  'Sound Horn',
  'Apna Time Aayega',
  'Main Character Energy',
  'Delulu nahi, Diesel hai',
  'Vibe check: PASSED',
  'Papa ki Pari nahi, Papa ka Truck',
  'Ghar kab aaoge? Leh ke baad',
];

// Short slogans that fit on the side medallion of oncoming trucks.
const TRUCK_BADGES = [
  'बुरी नज़र वाले तेरा मुँह काला', 'माँ का आशीर्वाद', 'देखो मगर प्यार से', 'जलो मत, बराबरी करो',
  'फिर मिलेंगे', 'टाटा बाय बाय', '13 मेरा 7', 'जय माता दी', 'मेरा भारत महान',
  'लटक मत, टपक जाएगा', 'किस्मत अपनी अपनी', 'हम दो हमारे दो', 'Wait for Side', 'Apna Time Aayega',
];

// Rotating road wisdom under the site title.
const ROAD_LINES = [
  'धीरे चलो, पहाड़ जल्दी में नहीं है.',
  'धीरे चलोगे तो बार-बार मिलोगे, तेज़ चलोगे तो हरिद्वार मिलोगे.',
  'Horn OK Please · Use Dipper at Night',
  'सावधानी हटी, दुर्घटना घटी.',
  'जगह मिलने पर साइड दी जाएगी.',
  'बुरी नज़र वाले तेरा मुँह काला.',
  'पहाड़ पे रेस नहीं, केस होता है.',
  'Peg aur pahad — dono pe mat chadho.',
  'Better late than never. Leh kahin nahi bhaag raha.',
];

// Free-licence photos from Wikimedia Commons (credited on the site, as the licences require).
const WALLPAPERS = [
  { file: 'assets/wallpapers/truck-red-front.jpg',     title: 'Decorated truck, India',            author: 'Edmund Gall',          license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Decorated_truck,_India,_2013-03_(11551081253).jpg' },
  { file: 'assets/wallpapers/truck-painted-front.jpg', title: 'Decorated truck',                    author: 'Justin Morgan',        license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Decorated_truck_(4180258762).jpg' },
  { file: 'assets/wallpapers/truck-red-tanker.jpg',    title: 'Decorated truck in India',           author: 'Derek Blackadder',     license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Decorated_truck_in_India.jpg' },
  { file: 'assets/wallpapers/truck-sikkim.jpg',        title: 'Truck in Rangpo, Sikkim',            author: 'Bernard Gagnon',       license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Truck_in_Rangpo,_Sikkim.jpg' },
  { file: 'assets/wallpapers/horn-ok.jpg',             title: 'Horn OK sign on a Bangalore truck',  author: 'Subhashish Panigrahi', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', source: 'https://commons.wikimedia.org/wiki/File:Horn_Ok_sign_on_a_Bangalore_truck.jpg' },
  { file: 'assets/wallpapers/blow-horn.jpg',           title: 'Blow Horn',                          author: 'Justin Morgan',        license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Blow_Horn_(4189256708).jpg' },
  { file: 'assets/wallpapers/manali-leh-highway.jpg',  title: 'Manali–Leh Highway',                 author: 'Narender9',            license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Manali-Leh_Highway.jpg' },
];

// Real photos of the route, used as the far backdrop (Photo mode). km = where it starts showing.
// All from Wikimedia Commons under Creative Commons licences — credited on screen while showing.
const ROUTE_PHOTOS = [
  { km: 0,   file: 'assets/route/manali.jpg',    place: 'Manali',         author: 'Anuj.bhargava7',       license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Landscape_of_Manali,_India,_2016.jpg' },
  { km: 10,  file: 'assets/route/solang.jpg',    place: 'Solang Valley',  author: 'Harvinder Chandigarh', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Solang_Valley_,Manali,_Himachal_Pardes,_India.JPG' },
  { km: 33,  file: 'assets/route/sissu.jpg',     place: 'Sissu, Lahaul',  author: 'Timothy A. Gonsalves', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Wildflowers_Mountains_Sissu_Lahaul_Jul19_D72_10447.jpg' },
  { km: 55,  file: 'assets/route/keylong.jpg',   place: 'Keylong',        author: 'Navneet Sharma',       license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:View_from_Shashur_Monastery_,_Keylong.jpg' },
  { km: 80,  file: 'assets/route/jispa.jpg',     place: 'Jispa',          author: 'Timothy A. Gonsalves', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Bhaga_Jispa_Upstream_Lahaul_Himachal_Oct20_D72_18317.jpg' },
  { km: 108, file: 'assets/route/zingzing.jpg',  place: 'Zing Zing Bar',  author: 'Ashwin Kumar',         license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Zing_Zing_Bar_(28499499482).jpg' },
  { km: 136, file: 'assets/route/baralacha.jpg', place: 'Baralacha La',   author: 'Tagooty',              license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Baralacha_La_Lahaul_D32_13255.jpg' },
  { km: 165, file: 'assets/route/sarchu.jpg',    place: 'Sarchu',         author: 'Kiran Jonnalagadda',   license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Near_Sarchu,_Jammu_and_Kashmir_(3803874470).jpg' },
  { km: 195, file: 'assets/route/gata.jpg',      place: 'Gata Loops',     author: 'Soumen Gomes',         license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:River_Tsarap_From_The_Gata_Loops.jpg' },
  { km: 210, file: 'assets/route/lachulung.jpg', place: 'Lachulung La',   author: 'GerthMichael',         license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', source: 'https://commons.wikimedia.org/wiki/File:Lachulungla.JPG' },
  { km: 248, file: 'assets/route/pang.jpg',      place: 'Near Pang',      author: 'Lalitgupta isgec',     license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Desert_View_Near_Pang_Ladakh-3.jpg' },
  { km: 285, file: 'assets/route/more.jpg',      place: 'More Plains',    author: 'CA Anand V Kaku',      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Pang_Tanglangla_Highway_02.jpg' },
  { km: 322, file: 'assets/route/tanglang.jpg',  place: 'Tanglang La',    author: 'Wolfgang Maehr',       license: 'CC BY 2.0',    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',    source: 'https://commons.wikimedia.org/wiki/File:Tanglang_La.jpg' },
  { km: 352, file: 'assets/route/upshi.jpg',     place: 'Rumtse–Upshi',   author: 'Lalitgupta isgec',     license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Sharp_Structures_on_hills_Leh.jpg' },
  { km: 420, file: 'assets/route/leh.jpg',       place: 'Leh',            author: 'Arkadeepmeta',         license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Leh_Town.jpg' },
];
