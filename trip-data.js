/**
 * @typedef {Object} Flight
 * @property {string} airline - Airline name
 * @property {string} from - Departure airport code
 * @property {string} [fromName] - Departure city name
 * @property {string} fromTime - Departure time (HH:MM or "TBD")
 * @property {string} to - Arrival airport code
 * @property {string} [toName] - Arrival city name
 * @property {string} toTime - Arrival time (HH:MM or "TBD")
 * @property {string} [note] - Additional flight notes
 */

/**
 * @typedef {Object} Hotel
 * @property {string} name - Hotel name
 * @property {number} stars - Star rating (1-5)
 * @property {string} room - Room type
 * @property {string} cost - Cost description
 * @property {string} [link] - Booking URL
 * @property {string} checkIn - Check-in date (YYYY-MM-DD)
 * @property {string} checkOut - Check-out date (YYYY-MM-DD)
 */

/**
 * @typedef {Object} Activity
 * @property {string} title - Activity title
 * @property {string} [icon] - Emoji icon
 * @property {string} [time] - Scheduled time (HH:MM)
 * @property {string} [note] - Additional notes
 * @property {string} [location] - Location name for Google Maps
 * @property {string} [section] - Section header label for grouped activities
 */

/**
 * @typedef {Object} TripDay
 * @property {string} date - Date string (YYYY-MM-DD)
 * @property {string} dayOfWeek - Hebrew day name
 * @property {string} segment - Segment ID
 * @property {string} [secondarySegment] - Secondary segment ID for transition days
 * @property {string} label - Day label/description
 * @property {Flight[]} flights - Flights for this day
 * @property {Hotel|null} hotel - Hotel for this day
 * @property {Activity[]} activities - Activities for this day
 * @property {string[]} notes - Day notes
 * @property {Array<{type: string, src?: string, label?: string}>} documents - Attached documents
 */

/**
 * @typedef {Object} Segment
 * @property {string} id - Unique segment identifier
 * @property {string} name - Hebrew segment name
 * @property {string} color - Hex color code
 * @property {string[]} dates - Array of date strings (YYYY-MM-DD)
 * @property {string} timeZone - IANA time zone identifier
 * @property {string} tzAbbr - Time zone abbreviation
 * @property {number} utcOffset - UTC offset in hours
 */

/**
 * @typedef {Object} Embassy
 * @property {string} name - Embassy name
 * @property {string} phone - Phone number
 * @property {string} note - Additional note
 */

/**
 * @typedef {Object} EmergencyNumber
 * @property {string} label - Service description
 * @property {string} number - Phone number
 */

/**
 * @typedef {Object} Hospital
 * @property {string} name - Hospital name
 * @property {string} address - Hospital address
 * @property {string} phone - Phone number
 */

/**
 * @typedef {Object} EmergencyInfo
 * @property {Embassy[]} embassies
 * @property {{thailand: EmergencyNumber[], singapore: EmergencyNumber[]}} localEmergency
 * @property {Object<string, Hospital>} hospitals
 */

/**
 * @typedef {Object} TripData
 * @property {string} title - Trip title
 * @property {string[]} travelers - Traveler names
 * @property {Segment[]} segments - Trip segments
 * @property {TripDay[]} days - Trip days
 * @property {EmergencyInfo} emergencyInfo - Emergency contact information
 */

/** @type {TripData} */
const TRIP_DATA = {
  title: "תאילנד וסינגפור 2026",
  travelers: ["ערן", "קרני"],

  segments: [
    { id: "phuket-arrival", name: "פוקט", color: "#D4A853", dates: ["2026-02-20"], timeZone: "Asia/Bangkok", tzAbbr: "ICT", utcOffset: 7 },
    { id: "krabi", name: "קראבי", color: "#5B8C5A", dates: ["2026-02-21", "2026-02-22", "2026-02-23", "2026-02-24", "2026-02-25", "2026-02-26"], timeZone: "Asia/Bangkok", tzAbbr: "ICT", utcOffset: 7 },
    { id: "singapore", name: "סינגפור", color: "#E76F51", dates: ["2026-02-26", "2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"], timeZone: "Asia/Singapore", tzAbbr: "SGT", utcOffset: 8 },
    { id: "phuket-return", name: "פוקט", color: "#2A9D8F", dates: ["2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07"], timeZone: "Asia/Bangkok", tzAbbr: "ICT", utcOffset: 7 },
  ],

  days: [
    // ===== PHUKET ARRIVAL =====
    {
      date: "2026-02-20",
      dayOfWeek: "שישי",
      segment: "phuket-arrival",
      label: "הגעה לפוקט",
      flights: [
        { airline: "Etihad", from: "TLV", fromName: "תל אביב", fromTime: "00:55", to: "AUH", toName: "אבו דאבי", toTime: "05:50" },
        { airline: "Etihad", from: "AUH", fromName: "אבו דאבי", fromTime: "08:40", to: "HKT", toName: "פוקט", toTime: "17:55" },
      ],
      hotel: {
        name: "Sugar Marina Hotel - AVIATOR",
        stars: 4,
        room: "Deluxe Pool Access",
        cost: "120$ BB",
        link: "https://www.expedia.com/Phuket-Hotels-Marina-Express-AVIATOR-Phuket-Airport.h12428804.Hotel-Information",
        checkIn: "2026-02-20",
        checkOut: "2026-02-21",
      },
      activities: [
        { time: "17:55", title: "נחיתה בפוקט", icon: "✈️", location: "Phuket International Airport" },
        { time: "18:15", title: "נסיעה למלון", icon: "🚕", note: "6 דקות מהשדה", location: "Sugar Marina Hotel AVIATOR Phuket Airport" },
        { time: "19:00", title: "מיני מדרחוב", icon: "🚶", location: "Nai Yang Beach Road, Phuket" },
        { time: "20:00", title: "ארוחת ערב", icon: "🍽️" },
        { time: "21:30", title: "מסאז׳", icon: "💆" },
      ],
      notes: [],
      documents: [],
    },

    // ===== KRABI =====
    {
      date: "2026-02-21",
      dayOfWeek: "שבת",
      segment: "krabi",
      label: "יום טיול פוקט → קראבי",
      flights: [],
      hotel: {
        name: "Panan Krabi Resort",
        stars: 4,
        room: "Deluxe Double Sea View",
        cost: "1041$ BB (6 לילות)",
        checkIn: "2026-02-21",
        checkOut: "2026-02-26",
      },
      activities: [
        { title: "תצפית Samet Nangshe", icon: "🏔️", note: "נקודת תצפית מדהימה", location: "Samet Nangshe Viewpoint, Phang Nga" },
        { title: "מערת מקדש הקופים - Suwan Khuha Cave", icon: "🛕", note: "בודהה שוכב", location: "Wat Suwan Khuha, Phang Nga" },
        { title: "שייט ברפסודות במערת הנטיפים - Tham Phung Chang", icon: "🛶", location: "Tham Phung Chang, Phang Nga" },
        { title: "שמורת טבע Than Bok Korani NP", icon: "🌿", note: "בריכות טבעיות ומפלים", location: "Than Bok Khorani National Park" },
        { title: "מעבר לקראבי וצ׳ק-אין במלון", icon: "🏨", location: "Panan Krabi Resort" },
      ],
      notes: ["אפשר להעביר חלק ליום רביעי"],
      documents: [],
    },
    {
      date: "2026-02-22",
      dayOfWeek: "ראשון",
      segment: "krabi",
      label: "ריילי ביץ׳ + צלילה",
      flights: [],
      hotel: null,
      activities: [
        { title: "ערן צולל", icon: "🤿", note: "צלילה" },
        { title: "יום רגוע בריילי ביץ׳", icon: "🏖️", location: "Railay Beach, Krabi" },
        { title: "חוף Phra Nang", icon: "🏖️", note: "חוף יפהפה", location: "Phra Nang Cave Beach, Krabi" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-02-23",
      dayOfWeek: "שני",
      segment: "krabi",
      label: "צלילה + בישול",
      flights: [],
      hotel: null,
      activities: [
        { title: "ערן צולל", icon: "🤿" },
        { title: "Khao Phanom Bencha NP", icon: "🌿", note: "פארק לאומי - מפלים וטבע", location: "Khao Phanom Bencha National Park, Krabi" },
        { title: "סדנת בישול תאילנדי", icon: "🍳" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-02-24",
      dayOfWeek: "שלישי",
      segment: "krabi",
      label: "איי הונג",
      flights: [],
      hotel: null,
      activities: [
        { title: "יום טיול לאיי הונג", icon: "🏝️", note: "Hong Islands - שנורקלינג וקיאקים", location: "Hong Islands, Krabi" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-02-25",
      dayOfWeek: "רביעי",
      segment: "krabi",
      label: "ארבעת האיים / בריכת האזמרגד",
      flights: [],
      hotel: null,
      activities: [
        { title: "יום טיול לארבעת האיים", icon: "🏝️", location: "Four Islands, Krabi" },
        { title: "בריכת האזמרגד", icon: "💎", note: "Emerald Pool", location: "Sa Morakot, Krabi" },
        { title: "מעיינות חמים", icon: "♨️", note: "Hot Springs", location: "Klong Thom Hot Springs, Krabi" },
      ],
      notes: ["לבחור בין ארבעת האיים לבריכת האזמרגד או לשלב"],
      documents: [],
    },
    {
      date: "2026-02-26",
      dayOfWeek: "חמישי",
      segment: "krabi",
      secondarySegment: "singapore",
      label: "קראבי → סינגפור",
      flights: [
        { airline: "AirAsia/Scoot", from: "KBV", fromName: "קראבי", fromTime: "TBD", to: "SIN", toName: "סינגפור", toTime: "TBD", note: "95$ + 30$ מזוודה + 10$ פלקס לאדם" },
      ],
      hotel: {
        name: "The Clan Hotel",
        stars: 5,
        room: "Twin Deluxe Room",
        cost: "1283$ / 1448$ BB (5 לילות)",
        link: "https://www.expedia.com/Singapore-Hotels-The-Clan-Hotel-Singapore.h45536906.Hotel-Information",
        checkIn: "2026-02-26",
        checkOut: "2026-03-03",
      },
      activities: [
        { title: "קראבי טאון", icon: "🏙️", location: "Krabi Town", section: "בוקר — קראבי" },
        { title: "Krabi Urban Forest", icon: "🌳", location: "Krabi Urban Forest Park" },
        { title: "Krabi Town Temple", icon: "🛕", location: "Wat Kaew Korawaram, Krabi" },
        { title: "שייט מנגרובים", icon: "🛶", note: "ליד קראבי טאון", location: "Krabi Mangrove Forest" },
        { title: "טיסה לסינגפור", icon: "✈️", note: "אם טסים ב-17:30", location: "Krabi International Airport", section: "טיסה" },
        { title: "נחיתה בסינגפור", icon: "✈️", location: "Singapore Changi Airport", section: "ערב — סינגפור" },
        { title: "Rain Vortex בשדה התעופה", icon: "💧", note: "המפל המקורה הגדול בעולם - Jewel Changi", location: "Jewel Changi Airport, Singapore" },
        { title: "צ׳ק-אין במלון", icon: "🏨", location: "The Clan Hotel, Singapore" },
      ],
      notes: ["להיסגר על שעות הטיסה", "לבדוק אם צריך מזוודה נוספת"],
      documents: [],
    },

    // ===== SINGAPORE =====
    {
      date: "2026-02-27",
      dayOfWeek: "שישי",
      segment: "singapore",
      label: "Gardens by the Bay",
      flights: [],
      hotel: null,
      activities: [
        { title: "Sky Garden at CapitaSpring", icon: "🌿", note: "ליד המלון, גבוה, נוף - להזמין כרטיסים!", location: "CapitaSpring Sky Garden, Singapore" },
        { title: "Art & Science Museum", icon: "🏛️", location: "ArtScience Museum, Singapore" },
        { title: "Gardens by the Bay", icon: "🌺", location: "Gardens by the Bay, Singapore" },
        { title: "Flower Dome", icon: "🌸", location: "Flower Dome, Gardens by the Bay, Singapore" },
        { title: "Cloud Forest", icon: "🌧️", location: "Cloud Forest, Gardens by the Bay, Singapore" },
        { title: "OCBC Skyway", icon: "🌉", location: "OCBC Skyway, Gardens by the Bay, Singapore" },
        { title: "מופע אורות Garden Rhapsody", icon: "✨", time: "19:45", note: "מופעים ב-18:45 ו-19:45", location: "Supertree Grove, Gardens by the Bay, Singapore" },
      ],
      notes: ["להזמין כרטיסים ל-Sky Garden: sevenrooms.com"],
      documents: [],
    },
    {
      date: "2026-02-28",
      dayOfWeek: "שבת",
      segment: "singapore",
      label: "צ׳יינהטאון + ליטל אינדיה",
      flights: [],
      hotel: null,
      activities: [
        { title: "צ׳יינהטאון - מקדשים ושווקים", icon: "🏮", location: "Chinatown, Singapore" },
        { title: "Chinatown Heritage Center", icon: "🏛️", location: "Chinatown Heritage Centre, Singapore" },
        { title: "Chinatown Food Complex", icon: "🍜", note: "מעל 250 דוכנים!", location: "Chinatown Complex Food Centre, Singapore" },
        { title: "ליטל אינדיה - Sri Veeramakaliamman Temple", icon: "🛕", location: "Sri Veeramakaliamman Temple, Singapore" },
        { title: "Kampong Glam - מסגד הסולטן", icon: "🕌", location: "Sultan Mosque, Singapore" },
        { title: "Arab Street & Haji Lane", icon: "🛍️", location: "Haji Lane, Singapore" },
        { title: "פארק מרליון + Waterfront Promenade", icon: "🚶", location: "Merlion Park, Singapore" },
        { title: "Spectra - Light & Water Show", icon: "✨", time: "20:00", note: "מרינה ביי, מופעים ב-20:00 ו-21:00", location: "Marina Bay Sands, Singapore" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-03-01",
      dayOfWeek: "ראשון",
      segment: "singapore",
      label: "גנים בוטניים + מוזיאון",
      flights: [],
      hotel: null,
      activities: [
        { title: "הגנים הבוטניים של סינגפור", icon: "🌿", note: "פתוח 05:00-00:00", location: "Singapore Botanic Gardens" },
        { title: "National Museum of Singapore", icon: "🏛️", location: "National Museum of Singapore" },
        { title: "Lau Pa Sat Food Market", icon: "🍽️", note: "ליד המלון", location: "Lau Pa Sat, Singapore" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-03-02",
      dayOfWeek: "שני",
      segment: "singapore",
      label: "סנטוסה",
      flights: [],
      hotel: null,
      activities: [
        { title: "סנטוסה - אקווריום", icon: "🐠", note: "S.E.A. Aquarium", location: "S.E.A. Aquarium, Sentosa, Singapore" },
        { title: "חופי סנטוסה", icon: "🏖️", location: "Siloso Beach, Sentosa, Singapore" },
        { title: "רכבל לפסגה", icon: "🚡", location: "Singapore Cable Car, Mount Faber" },
        { title: "Luge", icon: "🛷", note: "לקנות כרטיסים מראש!", location: "Skyline Luge Sentosa, Singapore" },
        { title: "Wings of Time Show", icon: "✨", time: "19:40", note: "מופע ערב בסנטוסה", location: "Wings of Time, Sentosa, Singapore" },
      ],
      notes: ["להזמין כרטיסים ל-Luge ו-Wings of Time"],
      documents: [],
    },

    // ===== PHUKET RETURN =====
    {
      date: "2026-03-03",
      dayOfWeek: "שלישי",
      segment: "phuket-return",
      label: "חזרה לפוקט + פילים + פנטסי",
      flights: [
        { airline: "AirAsia/Scoot", from: "SIN", fromName: "סינגפור", fromTime: "08:55", to: "HKT", toName: "פוקט", toTime: "09:55", note: "92$ + 30$ מזוודה + 10$ פלקס לאדם" },
      ],
      hotel: {
        name: "Marriott Resort & Spa, Merlin Beach",
        stars: 5,
        room: "Oceanfront",
        cost: "1275$ BB (3 לילות)",
        link: "https://www.agoda.com/he-il/phuket-marriott-resort-spa-merlin-beach/hotel/phuket-th.html",
        checkIn: "2026-03-03",
        checkOut: "2026-03-06",
      },
      activities: [
        { time: "09:55", title: "נחיתה בפוקט", icon: "✈️", location: "Phuket International Airport" },
        { title: "הגעה למלון", icon: "🏨", location: "Phuket Marriott Resort & Spa Merlin Beach" },
        { title: "חוות פילים טיפולית", icon: "🐘", location: "Phuket Elephant Sanctuary" },
        { title: "Phuket Fantasea", icon: "🎪", note: "מופע ערב - שלישי, שישי, ראשון", location: "Phuket FantaSea" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-03-04",
      dayOfWeek: "רביעי",
      segment: "phuket-return",
      label: "חופים + צלילה",
      flights: [],
      hotel: null,
      activities: [
        { title: "ערן צולל?", icon: "🤿", note: "צלילה - שני, רביעי ושבת" },
        { title: "Paradise Beach", icon: "🏖️", location: "Paradise Beach, Phuket" },
        { title: "Freedom Beach", icon: "🏖️", location: "Freedom Beach, Phuket" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-03-05",
      dayOfWeek: "חמישי",
      segment: "phuket-return",
      label: "מפרץ פאנג-נא + קרנבל",
      flights: [],
      hotel: null,
      activities: [
        { title: "יום טיול לארבעת האיים - מפרץ פאנג-נא", icon: "🏝️", location: "Phang Nga Bay, Phuket" },
        { title: "אי ג׳יימס בונד", icon: "🎬", location: "James Bond Island, Phang Nga" },
        { title: "Carnival", icon: "🎡", note: "בערב", location: "Carnival Magic Phuket" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-03-06",
      dayOfWeek: "שישי",
      segment: "phuket-return",
      label: "יום טיול בפוקט",
      flights: [],
      hotel: null,
      activities: [
        { title: "תצפית Karon", icon: "🏔️", location: "Karon Viewpoint, Phuket" },
        { title: "חוף קאטה-נוי", icon: "🏖️", note: "עצירה בדרך", location: "Kata Noi Beach, Phuket" },
        { title: "תצפית Promthep Cape", icon: "🌅", note: "הנקודה הדרומית ביותר", location: "Promthep Cape, Phuket" },
        { title: "ביג בודהה", icon: "🛕", location: "Big Buddha Phuket" },
        { title: "מקדש Chalong", icon: "🛕", note: "אם לא נמאס ממקדשים", location: "Wat Chalong, Phuket" },
        { title: "מפעל קשיו Si Burapha Orchid", icon: "🥜", location: "Si Burapha Orchid, Phuket" },
        { title: "תצפית גבעת הקופים", icon: "🐒", location: "Monkey Hill, Phuket" },
        { title: "פוקט טאון - עיר עתיקה", icon: "🏙️", note: "שוק מ-17:00", location: "Phuket Old Town" },
        { title: "מפלי Tonsai", icon: "💧", note: "אם מספיקים", location: "Ton Sai Waterfall, Phuket" },
      ],
      notes: [],
      documents: [],
    },
    {
      date: "2026-03-07",
      dayOfWeek: "שבת",
      segment: "phuket-return",
      label: "יום טיסות חזרה",
      flights: [
        { airline: "Etihad", from: "HKT", fromName: "פוקט", fromTime: "03:10", to: "AUH", toName: "אבו דאבי", toTime: "06:45" },
        { airline: "Etihad", from: "AUH", fromName: "אבו דאבי", fromTime: "08:40", to: "TLV", toName: "תל אביב", toTime: "10:35" },
      ],
      hotel: null,
      activities: [
        { time: "01:00", title: "יציאה לשדה התעופה", icon: "🚕" },
        { time: "03:10", title: "טיסה פוקט → אבו דאבי", icon: "✈️" },
        { time: "08:40", title: "טיסה אבו דאבי → תל אביב", icon: "✈️" },
        { time: "10:35", title: "נחיתה בארץ!", icon: "🏠" },
      ],
      notes: ["2,014$ לכרטיס הלוך-חזור לאחד", "דמי שינוי 125$ + הפרשים", "דמי ביטול 250$ לכיוון"],
      documents: [],
    },
  ],

  emergencyInfo: {
    embassies: [
      { name: 'שגרירות ישראל בבנגקוק', phone: '+66-2-204-9200', note: 'כולל שירות חירום קונסולרי' },
      { name: 'שגרירות ישראל בסינגפור', phone: '+65-6834-9200', note: '' },
    ],
    localEmergency: {
      thailand: [
        { label: 'אמבולנס תאילנד', number: '1669' },
        { label: 'משטרת תיירים תאילנד', number: '1155' },
        { label: 'משטרה תאילנד', number: '191' },
      ],
      singapore: [
        { label: 'אמבולנס / כיבוי אש סינגפור', number: '995' },
        { label: 'משטרה סינגפור', number: '999' },
      ],
    },
    hospitals: {
      'phuket-arrival': { name: 'Vachira Phuket Hospital', address: 'Phuket Town', phone: '+66-76-361-234' },
      'krabi': { name: 'Krabi Hospital', address: 'Krabi Town', phone: '+66-75-611-212' },
      'singapore': { name: 'Singapore General Hospital', address: 'Outram Road, Singapore', phone: '+65-6222-3322' },
      'phuket-return': { name: 'Vachira Phuket Hospital', address: 'Phuket Town', phone: '+66-76-361-234' },
    },
  },
};
