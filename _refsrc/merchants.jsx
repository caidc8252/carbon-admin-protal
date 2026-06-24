/* global React */
// ─────────────────────────────────────────────────────────────
// Carbon — Merchants module
// Hierarchy:  Merchant → Store → Terminal
//   · Every merchant has at least one "headquarter" store that's auto-
//     created with the merchant. When that's the only store, we don't
//     render it as its own row — the terminals it owns appear directly
//     under the merchant. Adding a second store immediately surfaces the
//     headquarter row too, so the user can see exactly where things live.
//   · Terminals always belong to a store (never the merchant directly);
//     the headquarter just keeps that invariant true when the user hasn't
//     bothered to model stores yet.
// ─────────────────────────────────────────────────────────────

const { useState: useStateM, useEffect: useEffectM, useMemo: useMemoM, useRef: useRefM } = React;

// ─── Mock data ───────────────────────────────────────────────
// Country list — keep small enough that a simple select works.
const COUNTRIES = [
  "Canada", "United States", "Mexico", "United Kingdom", "Germany",
  "France", "Australia", "Japan", "Singapore", "Brazil",
];

// Per-country dial-in code. Used to pre-fill `phoneCountryCode` on the
// merchant form when the operator changes the Country/Region select.
// Editable afterwards — the field accepts any string.
const COUNTRY_PHONE_CODES = {
  "Canada":         "+1",
  "United States":  "+1",
  "Mexico":         "+52",
  "United Kingdom": "+44",
  "Germany":        "+49",
  "France":         "+33",
  "Australia":      "+61",
  "Japan":          "+81",
  "Singapore":      "+65",
  "Brazil":         "+55",
};

// ─── Contract catalog ─────────────────────────────────────
// Single source of truth for contract types. UI cards read display name +
// description from here instead of hard-coding them. The `id` is the same
// string used in `merchant.contracts[].type` so existing callers like
// `getMerchantContract(m, "MERCHANT")` are unaffected.
const CONTRACT_CATALOG = [
  { id: "MERCHANT",
    name: "MERCHANT",
    description: "Base contract — required for store, terminal, payment and app maintenance." },
  { id: "MERCHANT_PORTAL",
    name: "MERCHANT_PORTAL",
    description: "Enables the self-service portal — operators can sign in to manage their own configuration." },
];
function getContractDef(id) {
  return CONTRACT_CATALOG.find(c => c.id === id) || { id, name: id, description: "" };
}

// Email format check — used by the merchant form and operator invite. Keep
// it pragmatic (not RFC-perfect); we want to catch typos, not lawyer the spec.
function isValidEmail(s) {
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// Seed merchants. Each carries one or more stores; the first store is
// always the headquarter (isHQ = true) and is auto-created on merchant
// creation. Terminals reference their owning store via storeId.
const MERCHANTS_SEED = [
  {
    id: "m-coffee", name: "Riverside Coffee Co.", country: "Canada",
    address: "402 St-Laurent Blvd, Montréal, QC H2W 1S5",
    phoneCountryCode: "+1", phone: "514-555-0142",
    email: "ops@riversidecoffee.ca",
    tags: ["F&B", "Multi-location", "VIP"],
    notes: "12-location coffee chain. Pilot for the new offline-tip flow. Primary contact: Sandra Vu.",
    createdAt: "Jan 14, 2024",
    stores: [
      { id: "s-coffee-hq",  name: "Riverside Coffee Co.", isHQ: true,
        address: "402 St-Laurent Blvd, Montréal, QC H2W 1S5", country: "Canada",
        notes: "Corporate office + flagship store." },
      { id: "s-coffee-pln", name: "Plateau Roastery", isHQ: false,
        address: "5640 Av du Parc, Montréal, QC H2V 4H1", country: "Canada",
        notes: "Higher tip volume on weekends." },
      { id: "s-coffee-old", name: "Old Port Kiosk", isHQ: false,
        address: "10 Rue de la Commune E, Montréal, QC H2Y 4B1", country: "Canada",
        notes: "Seasonal — closed Dec–Feb." },
    ],
    terminals: [
      { sn: "N950-0014-9281", model: "N950", storeId: "s-coffee-hq",  state: "active",   lastSeen: "5 min ago" },
      { sn: "N950-0014-9282", model: "N950", storeId: "s-coffee-hq",  state: "active",   lastSeen: "2 min ago" },
      { sn: "S90-0822-0014",  model: "S90",  storeId: "s-coffee-hq",  state: "active",   lastSeen: "12 min ago" },
      { sn: "N950-0014-9311", model: "N950", storeId: "s-coffee-pln", state: "active",   lastSeen: "1 min ago" },
      { sn: "N950-0014-9312", model: "N950", storeId: "s-coffee-pln", state: "active",   lastSeen: "8 min ago" },
      { sn: "S60-0488-0021",  model: "S60",  storeId: "s-coffee-pln", state: "active",   lastSeen: "3 days ago" },
      { sn: "N750-0099-0040", model: "N750", storeId: "s-coffee-old", state: "active",   lastSeen: "4 hours ago" },
      // Pending VarSheets — TIDs imported from the acquirer, awaiting on-site
      // bind with the 6-digit device code.
      { sn: null, model: null, storeId: "s-coffee-hq",  state: "pending", lastSeen: "—", tid: "T0099101" },
      { sn: null, model: null, storeId: "s-coffee-pln", state: "pending", lastSeen: "—", tid: "T0099102" },
      { sn: null, model: null, storeId: "s-coffee-pln", state: "pending", lastSeen: "—", tid: "T0099103" },
      { sn: null, model: null, storeId: "s-coffee-old", state: "pending", lastSeen: "—", tid: "T0099104" },
    ],
  },
  {
    id: "m-pharma", name: "Cedar Park Pharmacy", country: "Canada",
    address: "1284 Whyte Ave NW, Edmonton, AB T6E 1Z2",
    phoneCountryCode: "+1", phone: "780-555-0188",
    email: "manager@cedarparkrx.ca",
    tags: ["Healthcare", "Single-location"],
    notes: "",
    createdAt: "Mar 02, 2024",
    stores: [
      { id: "s-pharma-hq", name: "Cedar Park Pharmacy", isHQ: true,
        address: "1284 Whyte Ave NW, Edmonton, AB T6E 1Z2", country: "Canada",
        notes: "Open 7 days." },
    ],
    terminals: [
      { sn: "S90-0822-1102", model: "S90", storeId: "s-pharma-hq", state: "active", lastSeen: "1 min ago" },
      { sn: "S60-0488-0177", model: "S60", storeId: "s-pharma-hq", state: "active", lastSeen: "9 min ago" },
    ],
  },
  {
    id: "m-bistro", name: "Cascade Bistro Group", country: "Canada",
    tags: ["F&B", "Multi-location"],
    notes: "Three locations across BC. Tip-out reports needed monthly.",
    createdAt: "Sep 21, 2023",
    stores: [
      { id: "s-bistro-hq",  name: "Cascade Bistro Group", isHQ: true,
        address: "1490 Robson St, Vancouver, BC V6G 1B7", country: "Canada",
        notes: "Head office + Robson dining room." },
      { id: "s-bistro-pmt", name: "Port Moody Bistro", isHQ: false,
        address: "3107 St Johns St, Port Moody, BC V3H 2C5", country: "Canada", notes: "" },
    ],
    terminals: [
      { sn: "N950-0014-3322", model: "N950", storeId: "s-bistro-hq",  state: "active",  lastSeen: "just now" },
      { sn: "N950-0014-3323", model: "N950", storeId: "s-bistro-hq",  state: "active",  lastSeen: "7 min ago" },
      { sn: null,             model: null,  storeId: "s-bistro-hq",  state: "pending", lastSeen: "—", tid: "T0102201" },
      { sn: "N950-0014-3401", model: "N950", storeId: "s-bistro-pmt", state: "active",  lastSeen: "31 min ago" },
    ],
  },
  {
    id: "m-books", name: "Trillium Books", country: "Canada",
    tags: ["Retail"],
    notes: "Independent bookstore. Single till.",
    createdAt: "Apr 18, 2024",
    stores: [
      { id: "s-books-hq", name: "Trillium Books", isHQ: true,
        address: "92 Bloor St W, Toronto, ON M5S 1M2", country: "Canada", notes: "" },
    ],
    terminals: [
      { sn: "S60-0488-2299", model: "S60", storeId: "s-books-hq", state: "active", lastSeen: "22 min ago" },
    ],
  },
  {
    id: "m-glacier", name: "Glacier Grocers", country: "Canada",
    tags: ["Retail", "Multi-location", "Enterprise"],
    notes: "Large grocery chain across BC and Alberta. SLA 24h support.",
    createdAt: "Aug 04, 2023",
    stores: [
      { id: "s-glacier-hq",  name: "Glacier Grocers", isHQ: true,
        address: "100 W Pender St, Vancouver, BC V6B 1R8", country: "Canada", notes: "Head office." },
      { id: "s-glacier-bby", name: "Burnaby Mega",   isHQ: false, address: "4400 Hastings St, Burnaby, BC V5C 2K1",  country: "Canada", notes: "" },
      { id: "s-glacier-ric", name: "Richmond Pavilion", isHQ: false, address: "5300 No 3 Rd, Richmond, BC V6X 2X9", country: "Canada", notes: "" },
      { id: "s-glacier-cal", name: "Calgary Beltline", isHQ: false, address: "1234 17 Ave SW, Calgary, AB T2T 0C8",  country: "Canada", notes: "" },
      // Chain expansion — extra stores so the strip's filter + scroll
      // arrows have something to work against.
      { id: "s-glacier-van-com", name: "Vancouver Commercial Drive", isHQ: false, address: "1850 Commercial Dr, Vancouver, BC V5N 4A6", country: "Canada", notes: "" },
      { id: "s-glacier-van-kit", name: "Vancouver Kitsilano",        isHQ: false, address: "2150 W 4th Ave, Vancouver, BC V6K 1N6",   country: "Canada", notes: "" },
      { id: "s-glacier-van-dt",  name: "Vancouver Downtown",         isHQ: false, address: "555 Robson St, Vancouver, BC V6B 2B7",    country: "Canada", notes: "" },
      { id: "s-glacier-sur",     name: "Surrey Central",             isHQ: false, address: "10153 King George Blvd, Surrey, BC V3T 2W1", country: "Canada", notes: "" },
      { id: "s-glacier-coq",     name: "Coquitlam Centre",           isHQ: false, address: "2929 Barnet Hwy, Coquitlam, BC V3B 5R5",  country: "Canada", notes: "" },
      { id: "s-glacier-vic",     name: "Victoria Inner Harbour",     isHQ: false, address: "950 Government St, Victoria, BC V8W 1X1", country: "Canada", notes: "" },
      { id: "s-glacier-nan",     name: "Nanaimo Country Club",       isHQ: false, address: "3200 N Island Hwy, Nanaimo, BC V9T 1W1",  country: "Canada", notes: "" },
      { id: "s-glacier-kel",     name: "Kelowna Orchard Park",       isHQ: false, address: "2271 Harvey Ave, Kelowna, BC V1Y 6H2",    country: "Canada", notes: "" },
      { id: "s-glacier-cal-dt",  name: "Calgary Downtown",           isHQ: false, address: "317 7 Ave SW, Calgary, AB T2P 2Y9",       country: "Canada", notes: "" },
      { id: "s-glacier-cal-mr",  name: "Calgary Market Mall",        isHQ: false, address: "3625 Shaganappi Trail NW, Calgary, AB T3A 0E2", country: "Canada", notes: "" },
      { id: "s-glacier-cal-cf",  name: "Calgary Chinook",            isHQ: false, address: "6455 Macleod Trail SW, Calgary, AB T2H 0K8", country: "Canada", notes: "" },
      { id: "s-glacier-edm-dt",  name: "Edmonton Downtown",          isHQ: false, address: "10180 101 St NW, Edmonton, AB T5J 3S4",    country: "Canada", notes: "" },
      { id: "s-glacier-edm-wm",  name: "Edmonton West Mall",         isHQ: false, address: "8882 170 St NW, Edmonton, AB T5T 4M2",    country: "Canada", notes: "Open 24h." },
      { id: "s-glacier-edm-sg",  name: "Edmonton Southgate",         isHQ: false, address: "5015 111 St NW, Edmonton, AB T6H 4M6",    country: "Canada", notes: "" },
      { id: "s-glacier-leth",    name: "Lethbridge Park Place",      isHQ: false, address: "501 1 Ave S, Lethbridge, AB T1J 4L9",     country: "Canada", notes: "" },
      { id: "s-glacier-rd",      name: "Red Deer Bower Place",       isHQ: false, address: "4900 Molly Banister Dr, Red Deer, AB T4R 1N9", country: "Canada", notes: "" },
    ],
    terminals: [
      { sn: "N950-0014-5501", model: "N950", storeId: "s-glacier-hq",  state: "active", lastSeen: "1 min ago" },
      { sn: "N950-0014-5502", model: "N950", storeId: "s-glacier-hq",  state: "active", lastSeen: "1 min ago" },
      { sn: "N950-0014-5510", model: "N950", storeId: "s-glacier-bby", state: "active", lastSeen: "3 min ago" },
      { sn: "N950-0014-5511", model: "N950", storeId: "s-glacier-bby", state: "active", lastSeen: "2 min ago" },
      { sn: "S90-0822-5512",  model: "S90",  storeId: "s-glacier-bby", state: "active", lastSeen: "11 min ago" },
      { sn: "N950-0014-5520", model: "N950", storeId: "s-glacier-ric", state: "active", lastSeen: "5 min ago" },
      { sn: "N950-0014-5530", model: "N950", storeId: "s-glacier-cal", state: "active", lastSeen: "1 min ago" },
      { sn: "N950-0014-5531", model: "N950", storeId: "s-glacier-cal", state: "active", lastSeen: "1 min ago" },
    ],
  },

  // ─── Additional merchants — give the list enough rows to span more than
  //     one page (pagination handling) and a mix of countries/statuses for
  //     the condition area. Minimal shape: one HQ store + a few terminals;
  //     normaliseTimestamps backfills mid / contracts / apps / operators.
  {
    id: "m-harbor", name: "Harbor Liquor Mart", country: "Canada",
    address: "55 Water St, Halifax, NS B3J 1A2",
    phoneCountryCode: "+1", phone: "902-555-0110",
    tags: ["Retail", "Single-location"],
    notes: "Single till, high weekend volume.",
    createdAt: "May 19, 2024",
    stores: [{ id: "s-harbor-hq", name: "Harbor Liquor Mart", isHQ: true, address: "55 Water St, Halifax, NS B3J 1A2", country: "Canada", notes: "" }],
    terminals: [
      { sn: "S90-0822-6001", model: "S90", storeId: "s-harbor-hq", state: "active", lastSeen: "4 min ago" },
    ],
  },
  {
    id: "m-aspen", name: "Aspen Diner Group", country: "Canada",
    address: "120 Rue Principale, Gatineau, QC J8X 1B5",
    phoneCountryCode: "+1", phone: "819-555-0133",
    tags: ["F&B", "Multi-location"],
    notes: "",
    createdAt: "Feb 27, 2024",
    stores: [
      { id: "s-aspen-hq",  name: "Aspen Diner — Hull", isHQ: true, address: "120 Rue Principale, Gatineau, QC J8X 1B5", country: "Canada", notes: "" },
      { id: "s-aspen-ayl", name: "Aspen Diner — Aylmer", isHQ: false, address: "181 Rue Principale, Gatineau, QC J9H 6A6", country: "Canada", notes: "" },
    ],
    terminals: [
      { sn: "N950-0014-6010", model: "N950", storeId: "s-aspen-hq",  state: "active", lastSeen: "2 min ago" },
      { sn: "N950-0014-6011", model: "N950", storeId: "s-aspen-ayl", state: "active", lastSeen: "6 min ago" },
    ],
  },
  {
    id: "m-pinecone", name: "Pinecone Pharmacy", country: "Canada",
    address: "330 Bank St, Ottawa, ON K2P 1X9",
    phoneCountryCode: "+1", phone: "613-555-0144",
    tags: ["Healthcare", "Multi-location"],
    notes: "Compliance: PCI quarterly scan due.",
    createdAt: "Nov 08, 2023",
    stores: [{ id: "s-pinecone-hq", name: "Pinecone Pharmacy", isHQ: true, address: "330 Bank St, Ottawa, ON K2P 1X9", country: "Canada", notes: "" }],
    terminals: [
      { sn: "N750P-0319-6020", model: "N750P", storeId: "s-pinecone-hq", state: "active", lastSeen: "9 min ago" },
      { sn: "N750P-0319-6021", model: "N750P", storeId: "s-pinecone-hq", state: "active", lastSeen: "1 min ago" },
    ],
  },
  {
    id: "m-birchwood", name: "Birchwood Cafe Chain", country: "Canada",
    address: "78 Wellington St, Sherbrooke, QC J1H 5C7",
    phoneCountryCode: "+1", phone: "819-555-0155",
    tags: ["F&B", "Multi-location"],
    notes: "",
    createdAt: "Jul 14, 2023",
    stores: [{ id: "s-birchwood-hq", name: "Birchwood Cafe Chain", isHQ: true, address: "78 Wellington St, Sherbrooke, QC J1H 5C7", country: "Canada", notes: "" }],
    terminals: [
      { sn: "S90-0822-6030", model: "S90", storeId: "s-birchwood-hq", state: "active", lastSeen: "12 min ago" },
    ],
  },
  {
    id: "m-northern", name: "Northern Lights Outdoors", country: "Canada",
    address: "201 Portage Ave, Winnipeg, MB R3B 2A9",
    phoneCountryCode: "+1", phone: "204-555-0166",
    tags: ["Retail", "Multi-location"],
    notes: "Seasonal peaks (Nov–Jan).",
    createdAt: "Oct 02, 2023",
    stores: [{ id: "s-northern-hq", name: "Northern Lights Outdoors", isHQ: true, address: "201 Portage Ave, Winnipeg, MB R3B 2A9", country: "Canada", notes: "" }],
    terminals: [
      { sn: "N950-0014-6040", model: "N950", storeId: "s-northern-hq", state: "active", lastSeen: "30 min ago" },
      { sn: "N950-0014-6041", model: "N950", storeId: "s-northern-hq", state: "inactive", lastSeen: "2 days ago" },
    ],
  },
  {
    id: "m-frostbay", name: "Frost Bay Convenience", country: "Canada",
    address: "9 Argyle St, Sydney, NS B1P 5R7",
    phoneCountryCode: "+1", phone: "902-555-0177",
    tags: ["Retail", "Multi-location"],
    notes: "",
    createdAt: "Dec 11, 2023",
    // Active merchant — merchant status is owned by another system, so we
    // keep the default contract.
    stores: [{ id: "s-frostbay-hq", name: "Frost Bay Convenience", isHQ: true, address: "9 Argyle St, Sydney, NS B1P 5R7", country: "Canada", notes: "" }],
    terminals: [
      { sn: "S90-0822-6050", model: "S90", storeId: "s-frostbay-hq", state: "inactive", lastSeen: "8 days ago" },
    ],
  },
  {
    id: "m-granite", name: "Granite Cliff Apparel", country: "Canada",
    address: "150 King St W, Kitchener, ON N2G 1A7",
    phoneCountryCode: "+1", phone: "519-555-0188",
    tags: ["Retail", "Single-location"],
    notes: "",
    createdAt: "Apr 03, 2024",
    stores: [{ id: "s-granite-hq", name: "Granite Cliff Apparel", isHQ: true, address: "150 King St W, Kitchener, ON N2G 1A7", country: "Canada", notes: "" }],
    terminals: [
      { sn: "N950-0014-6060", model: "N950", storeId: "s-granite-hq", state: "active", lastSeen: "5 min ago" },
    ],
  },
  {
    id: "m-summit", name: "Summit Coffee House", country: "Canada",
    address: "410 W Georgia St, Vancouver, BC V6B 2V5",
    phoneCountryCode: "+1", phone: "604-555-0199",
    tags: ["F&B", "Multi-location", "VIP"],
    notes: "Flagship + two satellite kiosks.",
    createdAt: "Aug 22, 2023",
    stores: [
      { id: "s-summit-hq",  name: "Summit Coffee — Downtown", isHQ: true, address: "410 W Georgia St, Vancouver, BC V6B 2V5", country: "Canada", notes: "" },
      { id: "s-summit-yvr", name: "Summit Coffee — YVR Kiosk", isHQ: false, address: "3211 Grant McConachie Way, Richmond, BC V7B 0A4", country: "Canada", notes: "Airside." },
    ],
    terminals: [
      { sn: "N950-0014-6070", model: "N950", storeId: "s-summit-hq",  state: "active", lastSeen: "1 min ago" },
      { sn: "N950-0014-6071", model: "N950", storeId: "s-summit-hq",  state: "active", lastSeen: "1 min ago" },
      { sn: "S90-0822-6072",  model: "S90",  storeId: "s-summit-yvr", state: "active", lastSeen: "7 min ago" },
    ],
  },
  {
    id: "m-driftwood", name: "Driftwood Diner Co.", country: "Canada",
    address: "88 Yates St, Victoria, BC V8W 1L4",
    phoneCountryCode: "+1", phone: "250-555-0211",
    tags: ["F&B", "Multi-location"],
    notes: "",
    createdAt: "Jan 30, 2024",
    stores: [{ id: "s-driftwood-hq", name: "Driftwood Diner Co.", isHQ: true, address: "88 Yates St, Victoria, BC V8W 1L4", country: "Canada", notes: "" }],
    terminals: [
      { sn: "N950-0014-6080", model: "N950", storeId: "s-driftwood-hq", state: "active", lastSeen: "3 min ago" },
    ],
  },
  {
    id: "m-redrock", name: "Red Rock Cantina", country: "United States",
    address: "2200 E Camelback Rd, Phoenix, AZ 85016",
    phoneCountryCode: "+1", phone: "602-555-0222",
    tags: ["F&B", "Single-location"],
    notes: "US pilot merchant.",
    createdAt: "Mar 18, 2024",
    stores: [{ id: "s-redrock-hq", name: "Red Rock Cantina", isHQ: true, address: "2200 E Camelback Rd, Phoenix, AZ 85016", country: "United States", notes: "" }],
    terminals: [
      { sn: "S90-0822-6090", model: "S90", storeId: "s-redrock-hq", state: "active", lastSeen: "14 min ago" },
    ],
  },
  {
    id: "m-evergreen", name: "Evergreen Market", country: "United States",
    address: "1500 Pike Pl, Seattle, WA 98101",
    phoneCountryCode: "+1", phone: "206-555-0233",
    tags: ["Retail", "Multi-location"],
    notes: "",
    createdAt: "Sep 09, 2023",
    stores: [
      { id: "s-evergreen-hq",  name: "Evergreen Market — Pike", isHQ: true, address: "1500 Pike Pl, Seattle, WA 98101", country: "United States", notes: "" },
      { id: "s-evergreen-bel", name: "Evergreen Market — Bellevue", isHQ: false, address: "575 Bellevue Sq, Bellevue, WA 98004", country: "United States", notes: "" },
    ],
    terminals: [
      { sn: "N950-0014-6100", model: "N950", storeId: "s-evergreen-hq",  state: "active", lastSeen: "2 min ago" },
      { sn: "N950-0014-6101", model: "N950", storeId: "s-evergreen-bel", state: "active", lastSeen: "10 min ago" },
    ],
  },
  {
    id: "m-cobblestone", name: "Cobblestone Bakery", country: "Canada",
    address: "44 Rue St-Paul E, Québec, QC G1K 3V9",
    phoneCountryCode: "+1", phone: "418-555-0244",
    tags: ["F&B", "Single-location"],
    notes: "",
    createdAt: "May 02, 2024",
    stores: [{ id: "s-cobblestone-hq", name: "Cobblestone Bakery", isHQ: true, address: "44 Rue St-Paul E, Québec, QC G1K 3V9", country: "Canada", notes: "" }],
    terminals: [
      { sn: "S90-0822-6110", model: "S90", storeId: "s-cobblestone-hq", state: "active", lastSeen: "22 min ago" },
    ],
  },
  {
    id: "m-ironrange", name: "Iron Range Outfitters", country: "Canada",
    address: "8200 Macleod Trail SE, Calgary, AB T2H 0M5",
    phoneCountryCode: "+1", phone: "403-555-0255",
    tags: ["Retail", "Multi-location"],
    notes: "",
    createdAt: "Jun 21, 2023",
    stores: [{ id: "s-ironrange-hq", name: "Iron Range Outfitters", isHQ: true, address: "8200 Macleod Trail SE, Calgary, AB T2H 0M5", country: "Canada", notes: "" }],
    terminals: [
      { sn: "N950-0014-6120", model: "N950", storeId: "s-ironrange-hq", state: "active", lastSeen: "1 min ago" },
      { sn: "N950-0014-6121", model: "N950", storeId: "s-ironrange-hq", state: "active", lastSeen: "4 min ago" },
    ],
  },
];

// In-memory store. Mutated by handlers below; the screens consult it on
// every render via window.MERCHANTS. We intentionally use mutation +
// `setTick` re-render hook rather than a global setState — this keeps the
// data shape ergonomic for prototype code.
//
// On first load we also backfill timestamps onto every merchant / store /
// terminal so callers can always read createdAt + updatedAt without
// caring whether the record came from seed data or runtime creation.
function normaliseTimestamps(merchants) {
  // Stable per-id hash → readable 8-digit MID/TID for the VarSheet display
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff; return h; };
  const mid = (id) => "M" + String(8210_0000 + (hash(id) % 89999)).padStart(8, "0");
  const tid = (key) => "T" + String(101_0000   + (hash(key) % 8999_99)).padStart(8, "0");
  return merchants.map(m => {
    const mCreated = m.createdAt || "—";
    return {
      ...m,
      createdAt: mCreated,
      updatedAt: m.updatedAt || mCreated,
      mid: m.mid || mid(m.id),
      // ─── Contracts: every merchant gets a default MERCHANT contract on
      // creation. MERCHANT_PORTAL is opt-in per merchant (see seed overrides).
      // The MERCHANT contract's `status` is also the "merchant disabled?"
      // switch — flipping it to "disabled" pauses the whole merchant.
      contracts: (m.contracts && m.contracts.length > 0) ? m.contracts : [
        { type: "MERCHANT", grantedAt: mCreated, expiresAt: null, status: "active", operator: "—" },
      ],
      // ─── App assignments: which apps the merchant has been configured to
      // run, and at which version. Decoupled from ROLLOUT_HISTORY for now
      // (which targets the flat fleet model with m-nb-001 ids). When the
      // rich and flat models are reconciled, recordRollout should double-
      // write here so the two stay in sync.
      apps: m.apps || [],
      // ─── Operators (MERCHANT_PORTAL contract). Only meaningful when the
      // PORTAL contract is present; otherwise the section is hidden in UI.
      operators: m.operators || [],
      stores: (m.stores || []).map(s => ({
        ...s,
        createdAt: s.createdAt || mCreated,
        updatedAt: s.updatedAt || s.createdAt || mCreated,
      })),
      terminals: (m.terminals || []).map((t, i) => ({
        ...t,
        createdAt: t.createdAt || mCreated,
        updatedAt: t.updatedAt || t.createdAt || mCreated,
        tid: t.tid || tid(t.sn || `${m.id}:${i}`),
      })),
    };
  });
}

window.MERCHANTS = window.MERCHANTS || applyMerchantSeedExtras(normaliseTimestamps(MERCHANTS_SEED));

// ─── Strategy seed pass for MERCHANTS apps ───────────────
// data.jsx seeds strategies for entries in ROLLOUT_HISTORY (which uses the
// MERCHANT_FLEETS ID space — m-nb-001 etc.). The merchants visible in the
// Merchants list / Apps tab use a different ID space (m-coffee, m-glacier…),
// so without a second pass their Apps tab would render "Not set" for every
// row. This pass walks every (merchant, app, version) tuple from the live
// merchant.apps lists and stamps a strategy, deterministic per tuple.
//
// Distribution targets:
//   ~55% Casual     — the dominant "not-urgent, reboot, no net restriction"
//   ~20% Immediate  — emergency / security patches
//   ~25% Custom     — mixed timing + network combinations
// (Every (merchant, app, version) tuple is guaranteed to get a strategy —
//  the "Not set" state is intentionally excluded from seeded data.)
(function seedStrategiesForVisibleMerchants() {
  if (!window.setMerchantStrategy || !window.UPGRADE_STRATEGY_PRESETS) return;
  const tCombos = ["immediate", "reboot", "rebootOrIdle10"];
  const nCombos = ["any", "wired", "cellCap"];
  const caps    = [50, 100, 200, 500, 1000];

  (window.MERCHANTS || []).forEach(m => {
    (m.apps || []).forEach(a => {
      const app = (window.APPS || []).find(x => x.id === a.packageId);
      if (!app) return;
      const versionId = a.targetVersionId || a.versionId;
      // Skip if already seeded by data.jsx's first pass
      if (window.getMerchantStrategy(m.id, app.package, versionId)) return;

      // Deterministic hash from the tuple → bucket
      const seed = `${m.id}:${app.package}:${versionId}`;
      let h = 0;
      for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
      const bucket = h % 100;

      if (bucket < 55) {
        // ~55% casual
        window.setMerchantStrategy(m.id, app.package, versionId, {
          strategy: "casual", timing: "reboot", network: "any",
        });
      } else if (bucket < 75) {
        // ~20% immediate
        window.setMerchantStrategy(m.id, app.package, versionId, {
          strategy: "immediate", timing: "immediate", network: "any",
        });
      } else {
        // ~25% custom — vary timing × network using the hash so each tuple
        // gets a stable but distinct combination.
        const timing  = tCombos[(h >> 3) % 3];
        const network = nCombos[(h >> 5) % 3];
        window.setMerchantStrategy(m.id, app.package, versionId, {
          strategy: "custom",
          timing,
          network,
          cellCapMb: caps[(h >> 7) % caps.length],
        });
      }
    });
  });
})();

// ─── Seed extras ───────────────────────────────────────────
// Layer PORTAL contracts, app assignments, and operators onto specific
// merchants so the Apps + Contracts tabs have something to show. Kept
// separate from MERCHANTS_SEED to keep the (already long) seed array
// scannable.
function applyMerchantSeedExtras(merchants) {
  const grant = (type, grantedAt, expiresAt, operator = "M. Hassan") => ({ type, grantedAt, expiresAt, status: "active", operator });
  const extrasById = {
    "m-coffee": {
      contracts: [
        grant("MERCHANT",        "Jan 14, 2024", null),
        grant("MERCHANT_PORTAL", "Feb 02, 2024", null /* no expiry */),
      ],
      apps: [
        { packageId: "pos",       versionId: "v32", assignedAt: "May 10, 2026", flag: null },
        { packageId: "loyalty",   versionId: "v07", assignedAt: "Apr 22, 2026", flag: "version-unpublished" },
        { packageId: "timeclock", versionId: "v14", assignedAt: "Mar 05, 2026", flag: null },
      ],
      operators: [
        { id: "op-coffee-1", name: "Sandra Vu",       email: "sandra.vu@riversidecoffee.ca",
          registeredAt: "Feb 04, 2024", status: "active",  registeredVia: "invite", isAdmin: true  },
        { id: "op-coffee-2", name: "Marc Tremblay",   email: "marc@riversidecoffee.ca",
          registeredAt: "Mar 18, 2024", status: "active",  registeredVia: "invite", isAdmin: false },
        { id: "op-coffee-3", name: "Élodie Laurent",  email: "elodie@riversidecoffee.ca",
          registeredAt: "—",            status: "pending", registeredVia: "invite", isAdmin: false },
      ],
    },
    "m-glacier": {
      contracts: [
        grant("MERCHANT",        "Aug 04, 2023", null),
        grant("MERCHANT_PORTAL", "Sep 10, 2024", "Sep 30, 2026" /* expires */),
      ],
      apps: [
        { packageId: "pos",       versionId: "v32", assignedAt: "May 11, 2026", flag: null },
        { packageId: "inventory", versionId: "v12", assignedAt: "May 09, 2026", flag: null },
        { packageId: "timeclock", versionId: "v14", assignedAt: "Feb 18, 2026", flag: null },
      ],
      operators: [
        { id: "op-glacier-1", name: "Priya Shah",   email: "priya.shah@glaciergrocers.ca",
          registeredAt: "Sep 12, 2024", status: "active", registeredVia: "invite", isAdmin: true },
        { id: "op-glacier-2", name: "Dave Okafor",  email: "dave.okafor@glaciergrocers.ca",
          registeredAt: "Oct 03, 2024", status: "active", registeredVia: "admin",  isAdmin: false },
        { id: "op-glacier-3", name: "Helena Brunt", email: "helena.brunt@glaciergrocers.ca",
          registeredAt: "Nov 22, 2024", status: "locked", registeredVia: "invite", isAdmin: false },
      ],
    },
    "m-bistro": {
      apps: [
        { packageId: "pos",       versionId: "v32", assignedAt: "Apr 30, 2026", flag: null },
        { packageId: "loyalty",   versionId: "v07", assignedAt: "Apr 22, 2026", flag: "version-unpublished" },
      ],
    },
    "m-pharma": {
      apps: [
        { packageId: "pos",       versionId: "v31", assignedAt: "Mar 12, 2026", flag: "app-unsubscribed" },
      ],
    },
  };
  return merchants.map(m => {
    const extras = extrasById[m.id];
    if (!extras) return m;
    return {
      ...m,
      contracts: extras.contracts || m.contracts,
      apps:      extras.apps      || m.apps,
      operators: extras.operators || m.operators,
    };
  });
}

// Trigger a re-render of merchant screens after a mutation.
let _mTick = 0;
const mListeners = new Set();
function bumpMerchants() {
  _mTick++;
  mListeners.forEach(fn => fn(_mTick));
}
function useMerchantTick() {
  const [, set] = useStateM(0);
  useEffectM(() => {
    mListeners.add(set);
    return () => mListeners.delete(set);
  }, []);
  return _mTick;
}

// ─── Contract helpers ─────────────────────────────────────
// MERCHANT contract is the "is the merchant active?" switch. Flipping its
// status to "disabled" pauses everything — the UI shows a banner and the
// list page greys the row out.
function getMerchantContract(merchant, type) {
  return (merchant.contracts || []).find(c => c.type === type) || null;
}
function isMerchantDisabled(merchant) {
  const c = getMerchantContract(merchant, "MERCHANT");
  return c?.status === "disabled";
}
function setMerchantDisabled(merchant, disabled) {
  let c = getMerchantContract(merchant, "MERCHANT");
  if (!c) {
    c = { type: "MERCHANT", grantedAt: merchant.createdAt || "—", expiresAt: null, status: "active" };
    merchant.contracts = [...(merchant.contracts || []), c];
  }
  c.status = disabled ? "disabled" : "active";
  merchant.updatedAt = "just now";
  bumpMerchants();
}
function hasPortalContract(merchant) {
  return !!getMerchantContract(merchant, "MERCHANT_PORTAL");
}

// ─── Email masking ────────────────────────────────────────
// Privacy display for the operator table. "sandra.vu@example.com" becomes
// "s****u@example.com" — first and last char of the local-part visible,
// middle obscured. The UI provides a per-row "show full" toggle on top.
function maskEmail(email) {
  if (!email || !email.includes("@")) return email || "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const stars = "*".repeat(Math.max(3, Math.min(5, local.length - 2)));
  return `${local[0]}${stars}${local[local.length - 1]}@${domain}`;
}

// ─── Date formatting for contracts ────────────────────────
function formatContractExpiry(expiresAt) {
  if (!expiresAt) return "No expiry";
  return expiresAt;
}

// ─── Default-contract factory for new merchants ──────────
// app.jsx's NewMerchant flow calls this when constructing the record so
// every new merchant lands with a MERCHANT contract pre-attached.
function defaultMerchantContracts(grantedAt = "just now", operator = "—") {
  return [{ type: "MERCHANT", grantedAt, expiresAt: null, status: "active", operator }];
}

// Helpers
function effectiveStores(merchant) {
  // Hide the headquarter row when it's the ONLY store. Terminals owned by
  // a hidden HQ surface directly under the merchant in the terminals table.
  if ((merchant.stores || []).length <= 1) return [];
  return merchant.stores;
}
function storeOf(merchant, storeId) {
  return (merchant.stores || []).find(s => s.id === storeId) || null;
}
function findMerchantById(id) {
  return (window.MERCHANTS || []).find(m => m.id === id) || null;
}

// ─── Applied-filter chip (removable) ────────────────────────
// Mirrors the Sample Orders condition area: each applied filter shows as a
// small removable pill under a dashed separator.
function MAppliedChip({ label, value, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 24,
      padding: "0 4px 0 var(--space-3)",
      borderRadius: "var(--radius-full)",
      fontSize: 11.5,
      border: "1px solid var(--border-2)",
      background: "var(--bg2)",
      color: "var(--fg2)",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      <span className="overline" style={{ fontSize: 9.5, color: "var(--fg3)", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ color: "var(--fg1)", fontWeight: 500 }}>{value}</span>
      <button
        onClick={onRemove}
        title={`Remove ${label} filter`}
        style={{
          display: "grid", placeItems: "center",
          width: 18, height: 18, borderRadius: "var(--radius-full)",
          color: "var(--fg3)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}
      >
        <window.Ico name="x" size={11} />
      </button>
    </span>
  );
}

// ─── CSV export helpers (mirrors Sample Orders) ─────────────
function mCsvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function merchantsToCsv(merchants) {
  const headers = ["Merchant", "Merchant ID", "MID", "Country", "Stores", "Terminals", "Tags", "Status", "Contracts", "Created"];
  const rows = merchants.map(m => [
    m.name,
    m.id,
    m.mid || "",
    m.country,
    m.stores?.length || 0,
    m.terminals?.length || 0,
    (m.tags || []).join("; "),
    isMerchantDisabled(m) ? "Disabled" : "Active",
    (m.contracts || []).map(c => c.type).join("; "),
    m.createdAt,
  ]);
  return [headers, ...rows].map(r => r.map(mCsvCell).join(",")).join("\r\n");
}
function mDownloadCsv(filename, csv) {
  // BOM so Excel opens UTF-8 cleanly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Export menu item (mirrors Sample Orders) ───────────────
function MExportMenuItem({ icon, title, subtitle, tag, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", textAlign: "left",
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        background: "transparent",
        color: disabled ? "var(--fg3)" : "var(--fg1)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        borderRadius: "var(--radius-sm)",
        background: "var(--bg3)",
        display: "grid", placeItems: "center",
        color: "var(--fg2)",
      }}>
        <window.Ico name={icon} size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{title}</span>
          {tag && (
            <span style={{
              fontSize: 9.5, fontWeight: 500, letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "1px 5px", borderRadius: "var(--radius-sm)",
              background: tag === "Server" ? "var(--accent-soft)" : "var(--bg3)",
              color: tag === "Server" ? "var(--accent)" : "var(--fg3)",
              border: "1px solid",
              borderColor: tag === "Server" ? "transparent" : "var(--border-1)",
            }}>{tag}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 1 }}>{subtitle}</div>
      </div>
    </button>
  );
}

// ─── List screen ────────────────────────────────────────────
function MerchantsListScreen({ navigate, openNewMerchant }) {
  useMerchantTick();
  const all = window.MERCHANTS || [];

  // ─── Draft (input) state — live as the operator types/toggles, but does
  //     NOT filter the list until they hit Search / press Enter. Mirrors the
  //     Sample Orders condition area.
  //   status     — "any" | "active" | "disabled"
  //   contract   — Set of contract type ids (multi)
  //   terminals  — bucket: "any" | "0" | "1-10" | "11-50" | "51+"
  //   created    — "any" | "30d" | "90d" | "year"
  const [q, setQ] = useStateM("");
  const [country, setCountry] = useStateM("any");
  const [tagFilter, setTagFilter] = useStateM([]);  // multi-select tag chips
  const [statusFilter,   setStatusFilter]   = useStateM("any");
  const [contractFilter, setContractFilter] = useStateM(new Set());
  const [terminalsBucket,setTerminalsBucket]= useStateM("any");
  const [createdBucket,  setCreatedBucket]  = useStateM("any");

  // ─── Applied state — what the list actually reads. Only updated on Search
  //     (or chip-removal / clear-all).
  const [aQ, setAQ]                 = useStateM("");
  const [aCountry, setACountry]     = useStateM("any");
  const [aTagFilter, setATagFilter] = useStateM([]);
  const [aStatus, setAStatus]       = useStateM("any");
  const [aContract, setAContract]   = useStateM(new Set());
  const [aTerminals, setATerminals] = useStateM("any");
  const [aCreated, setACreated]     = useStateM("any");

  // ─── Sticky layout: the page (this screen's root) scrolls as one; the
  //     condition area and the table header stay pinned. The table header
  //     pins directly below the condition area, so we measure the condition
  //     area's height and feed it to the header's sticky `top`.
  const condRef = useRefM(null);
  const [condH, setCondH] = useStateM(0);
  useEffectM(() => {
    const el = condRef.current;
    if (!el) return;
    const update = () => setCondH(el.offsetHeight);
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro && ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro && ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  // All distinct tags across the merchant pool — feeds the tag filter.
  const allTags = useMemoM(() => {
    const set = new Set();
    all.forEach(m => (m.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }, [all]);

  // Parse "May 11, 2026" style timestamps from seed → days-ago vs the demo
  // anchor (May 17, 2026). Falls back to large number when un-parseable so
  // such rows simply land outside the "last N days" bucket.
  const _DEMO_NOW = new Date("2026-05-17");
  const daysSince = (s) => {
    if (!s) return Number.POSITIVE_INFINITY;
    const d = new Date(s);
    if (isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
    return Math.floor((_DEMO_NOW - d) / 86400000);
  };

  const inTerminalsBucket = (n) => {
    switch (aTerminals) {
      case "0":     return n === 0;
      case "1-10":  return n >= 1 && n <= 10;
      case "11-50": return n >= 11 && n <= 50;
      case "51+":   return n >= 51;
      default:      return true;
    }
  };
  const inCreatedBucket = (m) => {
    if (aCreated === "any") return true;
    const days = daysSince(m.createdAt);
    if (aCreated === "30d")  return days <= 30;
    if (aCreated === "90d")  return days <= 90;
    if (aCreated === "year") return days <= 365;
    return true;
  };

  const filtered = useMemoM(() => {
    return all.filter(m => {
      if (aCountry !== "any" && m.country !== aCountry) return false;
      // Tag filter is OR semantics — match if merchant has ANY selected tag.
      if (aTagFilter.length > 0 && !(m.tags || []).some(t => aTagFilter.includes(t))) return false;
      // Status — MERCHANT contract enabled/disabled
      if (aStatus !== "any") {
        const disabled = isMerchantDisabled(m);
        if (aStatus === "active"   && disabled) return false;
        if (aStatus === "disabled" && !disabled) return false;
      }
      // Contract — any-of selected
      if (aContract.size > 0) {
        const types = new Set((m.contracts || []).map(c => c.type));
        let hit = false;
        for (const t of aContract) if (types.has(t)) { hit = true; break; }
        if (!hit) return false;
      }
      if (!inTerminalsBucket(m.terminals?.length || 0)) return false;
      if (!inCreatedBucket(m)) return false;
      if (aQ) {
        // Fuzzy match on merchant name only.
        const needle = aQ.toLowerCase();
        if (!m.name.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [all, aQ, aCountry, aTagFilter, aStatus, aContract, aTerminals, aCreated]);

  // Count of secondary ("More filters") draft selections — drives the popover badge.
  const moreActiveCount =
    (statusFilter   !== "any" ? 1 : 0) +
    (contractFilter.size > 0  ? 1 : 0) +
    (terminalsBucket!== "any" ? 1 : 0) +
    (createdBucket  !== "any" ? 1 : 0);
  const resetMore = () => {
    setStatusFilter("any");
    setContractFilter(new Set());
    setTerminalsBucket("any");
    setCreatedBucket("any");
  };

  // ─── Apply / clear ────────────────────────────────────────
  // Search copies the whole draft over to applied state.
  const runSearch = () => {
    setAQ(q.trim());
    setACountry(country);
    setATagFilter([...tagFilter]);
    setAStatus(statusFilter);
    setAContract(new Set(contractFilter));
    setATerminals(terminalsBucket);
    setACreated(createdBucket);
  };
  // Per-dimension removal from the Applied row clears both draft + applied.
  const clearQ        = () => { setQ(""); setAQ(""); };
  const clearCountry  = () => { setCountry("any"); setACountry("any"); };
  const removeTag     = (t) => { setTagFilter(p => p.filter(x => x !== t)); setATagFilter(p => p.filter(x => x !== t)); };
  const clearStatus   = () => { setStatusFilter("any"); setAStatus("any"); };
  const removeContract= (c) => {
    setContractFilter(p => { const n = new Set(p); n.delete(c); return n; });
    setAContract(p => { const n = new Set(p); n.delete(c); return n; });
  };
  const clearTerminals= () => { setTerminalsBucket("any"); setATerminals("any"); };
  const clearCreated  = () => { setCreatedBucket("any"); setACreated("any"); };
  const resetAll = () => {
    setQ(""); setCountry("any"); setTagFilter([]); resetMore();
    setAQ(""); setACountry("any"); setATagFilter([]);
    setAStatus("any"); setAContract(new Set()); setATerminals("any"); setACreated("any");
  };

  const hasApplied =
    !!aQ || aCountry !== "any" || aTagFilter.length > 0 ||
    aStatus !== "any" || aContract.size > 0 || aTerminals !== "any" || aCreated !== "any";

  const TERMINALS_LABEL = { "0": "0", "1-10": "1–10", "11-50": "11–50", "51+": "51+" };
  const CREATED_LABEL   = { "30d": "Last 30 days", "90d": "Last 90 days", "year": "Last year" };
  const STATUS_LABEL    = { active: "Active", disabled: "Disabled" };

  // Pagination — 10 rows / page (Sample Orders parity), reset on applied-filter change.
  const pager = window.usePaginated(filtered, 10,
    `m|${aQ}|${aCountry}|${aTagFilter.join(",")}|${aStatus}|${[...aContract].sort().join(",")}|${aTerminals}|${aCreated}`);

  // More than one page of results? Drives the "Export search results" enable
  // state — when everything fits on one page that option is identical to
  // "Export current view", so we disable it.
  const hasMultiplePages = filtered.length > pager.pageSize;

  // ─── Export (mirrors Sample Orders) ───────────────────────
  //   · "Export visible rows"      → current page only (pager.slice) — local CSV.
  //   · "Export all query results" → whole filtered set across every page
  //                                  (filtered) — simulated server round-trip.
  // The two options exist precisely because the list is paginated: the
  // visible export respects the current page, the query export ignores it.
  const exportBtnRef = useRefM(null);
  const [exportOpen, setExportOpen] = useStateM(false);
  const [exporting, setExporting]   = useStateM(false);
  const [toast, setToast]           = useStateM(null);
  const showExportToast = (message, tone = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3200);
  };
  const exportVisible = () => {
    setExportOpen(false);
    const csv = merchantsToCsv(pager.slice);
    const ts  = new Date().toISOString().slice(0, 10);
    mDownloadCsv(`merchants_page-${pager.page}_${ts}.csv`, csv);
    showExportToast(`Exported ${pager.slice.length} visible merchant${pager.slice.length === 1 ? "" : "s"}`, "success");
  };
  const exportAll = () => {
    setExportOpen(false);
    if (exporting) return;
    setExporting(true);
    showExportToast("Preparing your file…", "info");
    // Mock backend round-trip — in reality this POSTs the query and streams
    // back a server-generated file. Here we simulate latency + reuse the CSV
    // from the full filtered set.
    setTimeout(() => {
      const csv = merchantsToCsv(filtered);
      const ts  = new Date().toISOString().slice(0, 10);
      mDownloadCsv(`merchants_query_${ts}.csv`, csv);
      setExporting(false);
      showExportToast(`Exported ${filtered.length} merchant${filtered.length === 1 ? "" : "s"} from search results`, "success");
    }, 1400);
  };

  const totals = useMemoM(() => ({
    merchants: all.length,
    disabled:  all.filter(m => isMerchantDisabled(m)).length,
    stores: all.reduce((acc, m) => acc + (m.stores?.length || 0), 0),
    terminals: all.reduce((acc, m) => acc + (m.terminals?.length || 0), 0),
    installed: all.reduce((acc, m) => acc + (m.terminals || []).filter(t => t.state === "active").length, 0),
  }), [all]);

  return (
    <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden", background: "var(--bg1)" }}>
      <window.PageHeader
        title="Merchants"
        subtitle="Maintain merchant accounts, their stores, and the terminals attached to each store."
        actions={
          <window.Button primary icon="plus" onClick={openNewMerchant}>New merchant</window.Button>
        } />

      {/* KPI strip — fixed above the condition area */}
      <div style={{ flexShrink: 0, padding: "var(--space-4) var(--space-6) var(--space-3)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            { label: "Merchants",        value: totals.merchants,  sub: "registered" },
            { label: "Stores",           value: totals.stores,     sub: "across all merchants" },
            { label: "Terminals",        value: totals.terminals,  sub: "bound to a store" },
            { label: "Disabled",         value: totals.disabled,   sub: totals.disabled ? "MERCHANT contract paused" : "all active", tone: totals.disabled ? "warning" : null },
          ].map(k => (
            <div key={k.label} style={{
              padding: "12px 16px", borderRadius: "var(--radius-lg)",
              background: "var(--bg2)",
              border: "1px solid var(--border-1)",
              boxShadow: "var(--shadow-1)",
            }}>
              <div className="overline" style={{ fontSize: 10.5 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span className="mono num" style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em",
                  color: k.tone === "success" ? "var(--success)"
                      : k.tone === "warning" ? "var(--warning)"
                      : "var(--fg1)" }}>{k.value}</span>
                <span style={{ fontSize: 11, color: "var(--fg3)" }}>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Condition area (Sample Orders style — bg2 panel, draft inputs +
          Search button, applied chips below a dashed separator) ─── */}
      <div ref={condRef} style={{
        position: "sticky", top: 0, zIndex: 20,
        padding: "var(--space-4) var(--space-6)",
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border-1)",
        display: "flex", flexDirection: "column", gap: "var(--space-3)",
      }}>
        {/* Form row */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 320px", minWidth: 220 }}>
            <window.Input
              value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              placeholder="Search by merchant name…"
              prefix={<window.Ico name="search" size={13} />}
              size="sm"
              suffix={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {q && (
                    <button type="button" title="Clear"
                      onClick={(e) => { e.preventDefault(); clearQ(); }}
                      style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: "var(--radius-full)", color: "var(--fg3)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
                      <window.Ico name="x" size={11} />
                    </button>
                  )}
                  <kbd style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, lineHeight: "14px",
                    padding: "1px 5px", border: "1px solid var(--border-2)",
                    borderRadius: "var(--radius-sm)", background: "var(--bg1)",
                    color: "var(--fg3)", whiteSpace: "nowrap",
                  }}>↵ Enter</kbd>
                </span>
              } />
          </div>

          {/* Country select — tds-select with inline clear when active */}
          <label className="tds-select tds-select--sm" style={{ flex: "0 0 180px", position: "relative" }}>
            <select
              value={country} onChange={(e) => setCountry(e.target.value)}
              style={{
                appearance: "none", WebkitAppearance: "none",
                flex: 1, height: "100%", background: "transparent",
                border: 0, outline: 0, fontSize: 13, color: "var(--fg1)",
                paddingRight: country !== "any" ? 22 : "var(--space-5)",
              }}>
              <option value="any">All countries</option>
              {[...new Set(all.map(m => m.country))].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {country !== "any" ? (
              <button type="button" title="Reset country"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearCountry(); }}
                style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: "var(--radius-full)", color: "var(--fg3)", marginLeft: -18, zIndex: 2 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
                <window.Ico name="x" size={12} />
              </button>
            ) : (
              <window.Ico name="chevd" size={12} className="tds-select__chevron" />
            )}
          </label>

          <TagFilterDropdown options={allTags} value={tagFilter} onChange={setTagFilter} />

          {/* Search — sits immediately after the conditions */}
          <window.Button size="sm" icon="search" onClick={runSearch}>Search</window.Button>
        </div>

        {/* Applied-filters row — only shown when something is applied */}
        {hasApplied && (
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap",
            paddingTop: "var(--space-2)",
            borderTop: "1px dashed var(--border-1)",
          }}>
            <span className="overline" style={{ fontSize: 10, color: "var(--fg3)", letterSpacing: "0.08em" }}>Applied</span>
            {aQ && <MAppliedChip label="Search" value={aQ} onRemove={clearQ} />}
            {aCountry !== "any" && <MAppliedChip label="Country" value={aCountry} onRemove={clearCountry} />}
            {aTagFilter.map(t => <MAppliedChip key={t} label="Tag" value={t} onRemove={() => removeTag(t)} />)}
            {aStatus !== "any" && <MAppliedChip label="Status" value={STATUS_LABEL[aStatus] || aStatus} onRemove={clearStatus} />}
            {[...aContract].map(c => <MAppliedChip key={c} label="Contract" value={c} onRemove={() => removeContract(c)} />)}
            {aTerminals !== "any" && <MAppliedChip label="Terminals" value={TERMINALS_LABEL[aTerminals] || aTerminals} onRemove={clearTerminals} />}
            {aCreated !== "any" && <MAppliedChip label="Created" value={CREATED_LABEL[aCreated] || aCreated} onRemove={clearCreated} />}
            <button onClick={resetAll}
              style={{ marginLeft: "var(--space-1)", fontSize: 11.5, color: "var(--fg3)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--fg1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--fg3)"; }}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ─── List area — the page scrolls as one unit; the condition area and
          the table header stay pinned. The table renders every row of the
          current page fully expanded (no inner scrollbar) — when the rows
          overflow the viewport the page scrollbar handles it. ─── */}
      <div style={{ padding: "var(--space-5) var(--space-6)" }}>
        <div className="tds-card" style={{
          display: "flex", flexDirection: "column",
          overflow: "visible",
          boxShadow: "var(--shadow-1)", borderRadius: "var(--radius-lg)",
        }}>
          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--border-1)",
            background: "var(--bg2)",
            borderTopLeftRadius: "var(--radius-lg)",
            borderTopRightRadius: "var(--radius-lg)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <window.Ico name="store" size={14} style={{ color: "var(--fg3)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg1)" }}>
                <span className="mono num">{filtered.length}</span>
                <span style={{ color: "var(--fg3)", marginLeft: 6, fontWeight: 400 }}>
                  merchant{filtered.length === 1 ? "" : "s"}
                  {hasApplied && <> · filtered from <span className="mono num">{all.length}</span></>}
                </span>
              </span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <div ref={exportBtnRef} style={{ display: "inline-flex" }}>
                <window.Button
                  variant="ghost"
                  size="sm"
                  icon={exporting ? "refresh" : "download"}
                  iconRight="chevdown"
                  onClick={() => setExportOpen(v => !v)}
                  disabled={exporting}
                >
                  {exporting ? "Preparing…" : "Export"}
                </window.Button>
              </div>
            </div>
          </div>

          {/* Export menu */}
          <window.PortalDropdown
            anchorRef={exportBtnRef}
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            placement="bottom-end"
            minWidth={280}
          >
            <div style={{
              background: "var(--bg2)",
              border: "1px solid var(--border-2)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-3)",
              padding: 4,
              animation: "fade-in var(--duration-fast) var(--easing-standard)",
            }}>
              <MExportMenuItem
                icon="download"
                title="Export current view"
                subtitle={`Current page · ${pager.slice.length} merchant${pager.slice.length === 1 ? "" : "s"}`}
                onClick={exportVisible}
                disabled={pager.slice.length === 0}
              />
              <div style={{ height: 1, background: "var(--border-1)", margin: "2px 4px" }} />
              <MExportMenuItem
                icon="download"
                title="Export search results"
                subtitle={hasMultiplePages
                  ? `All matches · ${filtered.length} merchants`
                  : "Available when results span more than one page"}
                onClick={exportAll}
                disabled={filtered.length === 0 || !hasMultiplePages}
              />
            </div>
          </window.PortalDropdown>

          {/* Table — header pinned just below the condition area; rows fully expanded */}
          <table className="tds-table num" style={{ width: "100%" }}>
              <thead style={{ position: "sticky", top: condH, zIndex: 10, background: "var(--bg2)" }}>
                <tr>
                  <th style={{ minWidth: 220 }}>Merchant</th>
                  <th>Country</th>
                  <th>Stores</th>
                  <th>Terminals</th>
                  <th style={{ minWidth: 160 }}>Tags</th>
                  <th style={{ textAlign: "right", width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)" }}>
                    {all.length === 0
                      ? "No merchants yet. Click \u201CNew merchant\u201D above to create one."
                      : "No merchants match those filters."}
                  </td></tr>
                )}
                {pager.slice.map(m => {
                  const storeCount = m.stores?.length || 0;
                  const disabled = isMerchantDisabled(m);
                  const storeLabel = storeCount <= 1
                    ? <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>Headquarter only</span>
                    : <span className="mono num" style={{ fontWeight: 500 }}>{storeCount}</span>;
                  return (
                    <tr key={m.id}
                      onClick={() => navigate({ screen: "merchantDetail", merchantId: m.id })}
                      style={{ cursor: "pointer", opacity: disabled ? 0.55 : 1 }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <MerchantAvatar name={m.name} size={28} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 500,
                                textDecoration: disabled ? "line-through" : "none",
                                color: disabled ? "var(--fg3)" : "var(--fg1)" }}>{m.name}</span>
                              {disabled && <MerchantStatusPill disabled />}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--fg2)" }}>{m.country}</td>
                      <td>{storeLabel}</td>
                      <td>
                        <span className="mono num" style={{ fontWeight: 500 }}>{m.terminals?.length || 0}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(m.tags || []).slice(0, 3).map(t => <TagChip key={t} t={t} />)}
                          {(m.tags || []).length > 3 && (
                            <span style={{ fontSize: 11, color: "var(--fg3)", padding: "2px 4px" }}>
                              +{(m.tags || []).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <window.Ico name="chevr" size={14} style={{ color: "var(--fg3)" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

          {/* Pagination — sits at the bottom of the fully-expanded list */}
          <div style={{ borderTop: "1px solid var(--border-1)", background: "var(--bg2)",
            borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)" }}>
            <window.Pagination
              page={pager.page} pageSize={pager.pageSize} total={pager.total}
              onChange={pager.setPage} onPageSizeChange={pager.setPageSize}
              pageSizes={[10, 20, 50]} />
          </div>
        </div>
      </div>

      <window.Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── Merchant detail ────────────────────────────────────────
// Three-tab layout: Stores & Terminals (the original single view) plus two
// new tabs introduced for the contract + app-assignment scenarios. The
// store/terminal tab is the home tab and stays mounted as the default.
//
//   · Stores & Terminals — current store strip + terminals table.
//   · Apps                — apps assigned to the merchant (window.MerchantAppsTab,
//                            defined in merchant-apps.jsx).
//   · Contracts           — MERCHANT + MERCHANT_PORTAL contract cards plus
//                            (when PORTAL is bound) the operators sub-section.
//                            Defined in merchant-contracts.jsx.
//
// The selected tab persists on the route (`route.tab`) so deep-links and
// browser-back behave sensibly.
function MerchantDetailScreen({ merchant, route, navigate }) {
  useMerchantTick();
  const [editMerchantOpen, setEditMerchantOpen] = useStateM(false);
  const [storeFormOpen, setStoreFormOpen] = useStateM(null);
  const [terminalFormOpen, setTerminalFormOpen] = useStateM(null);
  const [installOpen, setInstallOpen] = useStateM(null);   // terminal | null
  const [unbindOpen, setUnbindOpen] = useStateM(null);     // terminal | null
  const [deletePendingOpen, setDeletePendingOpen] = useStateM(null); // terminal | null
  const [confirmDeleteStore, setConfirmDeleteStore] = useStateM(null);
  const [confirmDisableOpen, setConfirmDisableOpen] = useStateM(false);

  const stores = merchant.stores || [];
  // Default selection: route hint → first store → HQ.
  const initialStoreId = route.storeId || stores[0]?.id;
  const [selectedStoreId, setSelectedStoreId] = useStateM(initialStoreId);
  useEffectM(() => { setSelectedStoreId(route.storeId || stores[0]?.id); }, [merchant.id]);

  const selectedStore = stores.find(s => s.id === selectedStoreId) || stores[0];
  const disabled = isMerchantDisabled(merchant);

  // Tab selection — defaults to "stores". Route owns the truth so URL
  // reflects the current view.
  const tab = route.tab || "stores";
  const setTab = (next) => navigate({ ...route, tab: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "var(--color-bg-2)", borderBottom: "1px solid var(--color-border-subtle)",
        padding: "14px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button onClick={() => navigate({ screen: "merchants" })} style={{ color: "var(--fg3)", padding: 4 }} title="Back">
            <window.Ico name="chevl" size={16} />
          </button>
          <MerchantAvatar name={merchant.name} size={44} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{merchant.name}</h1>
              <span style={{ fontSize: 11.5, color: "var(--color-text-tertiary)" }}>{merchant.country}</span>
            </div>
            {merchant.tags?.length > 0 && (
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {merchant.tags.map(t => <TagChip key={t} t={t} />)}
              </div>
            )}
            <MerchantContactMeta merchant={merchant} />
          </div>
          <window.Button icon="edit" onClick={() => setEditMerchantOpen(true)}>Edit merchant</window.Button>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginTop: 14, marginLeft: 58 }}>
          {[
            { id: "stores",    label: "Stores & Terminals" },
            { id: "apps",      label: "Apps" },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 14px 9px",
                  fontSize: 12.5, fontWeight: active ? 600 : 450,
                  color: active ? "var(--fg1)" : "var(--fg3)",
                  borderBottom: active ? "2px solid var(--color-primary-600)" : "2px solid transparent",
                  marginBottom: -1,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className="mono num" style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 999,
                    background: active ? "var(--color-primary-50)" : "var(--bg3)",
                    color: active ? "var(--color-primary-700)" : "var(--fg3)",
                    border: "1px solid var(--border-1)",
                  }}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 28px", background: "var(--color-bg-1)" }}>
        {disabled && <DisabledBanner onEnable={() => setConfirmDisableOpen(true)} />}

        {tab === "stores" && (
          <StoresWithTerminalsView
            merchant={merchant}
            stores={stores}
            selectedStore={selectedStore}
            navigate={navigate}
            merchantDisabled={disabled}
            onSelectStore={(id) => setSelectedStoreId(id)}
            onAddStore={() => { if (disabled) return; setStoreFormOpen({ mode: "new" }); }}
            onEditStore={(s) => { if (disabled) return; setStoreFormOpen({ mode: "edit", store: s }); }}
            onDeleteStore={(s) => setConfirmDeleteStore(s)}
            onBindTerminal={(storeId) => { if (disabled) return; setTerminalFormOpen({ mode: "new", defaultStoreId: storeId }); }}
            onEditTerminal={(t) => { if (disabled) return; setTerminalFormOpen({ mode: "edit", terminal: t }); }}
            onInstallTerminal={(t) => { if (disabled) return; setInstallOpen(t); }}
            onUnbindTerminal={(t) => setUnbindOpen(t)}
            onDeletePendingTerminal={(t) => setDeletePendingOpen(t)} />
        )}

        {tab === "apps" && window.MerchantAppsTab && (
          <window.MerchantAppsTab merchant={merchant} />
        )}
      </div>

      {/* Disable / enable confirm dialog (lives in detail scope so both
          the Contracts tab button and the in-banner button can open it) */}
      {confirmDisableOpen && (
        <window.ConfirmDialog
          open
          title={disabled ? "Enable merchant?" : "Disable merchant?"}
          body={disabled
            ? `Re-enabling ${merchant.name} will restore store, terminal, and app maintenance. Operators will regain access if a Merchant Portal contract is bound.`
            : `Disabling ${merchant.name} pauses store, terminal, and app maintenance. Installed terminals keep transacting, but new changes are blocked until the merchant is re-enabled.`}
          confirmLabel={disabled ? "Enable merchant" : "Disable merchant"}
          tone={disabled ? "primary" : "danger"}
          onCancel={() => setConfirmDisableOpen(false)}
          onConfirm={() => {
            setMerchantDisabled(merchant, !disabled);
            setConfirmDisableOpen(false);
            window.showToast?.(
              disabled ? `${merchant.name} re-enabled` : `${merchant.name} disabled`,
              disabled ? "success" : "warning",
            );
          }} />
      )}

      {/* Edit merchant drawer */}
      {editMerchantOpen && (
        <MerchantFormModal
          mode="edit"
          merchant={merchant}
          onClose={() => setEditMerchantOpen(false)}
          onSave={(patch) => {
            Object.assign(merchant, patch, { updatedAt: "just now" });
            bumpMerchants();
            setEditMerchantOpen(false);
            window.showToast?.(`${merchant.name} updated`, "success");
          }} />
      )}

      {/* New / edit store modal */}
      {storeFormOpen && (
        <StoreFormModal
          mode={storeFormOpen.mode}
          merchant={merchant}
          store={storeFormOpen.store}
          onClose={() => setStoreFormOpen(null)}
          onDelete={(s) => { setStoreFormOpen(null); setConfirmDeleteStore(s); }}
          onSave={(payload) => {
            const now = "just now";
            if (storeFormOpen.mode === "new") {
              const newStore = {
                id: `s-${merchant.id.replace(/^m-/, "")}-${Date.now().toString(36)}`,
                isHQ: false,
                createdAt: now, updatedAt: now,
                ...payload,
              };
              merchant.stores = [...(merchant.stores || []), newStore];
              merchant.updatedAt = now;
              setSelectedStoreId(newStore.id);
              window.showToast?.(`Store "${newStore.name}" added`, "success");
            } else {
              Object.assign(storeFormOpen.store, payload, { updatedAt: now });
              merchant.updatedAt = now;
              window.showToast?.(`Store "${payload.name}" updated`, "success");
            }
            bumpMerchants();
            setStoreFormOpen(null);
          }} />
      )}

      {/* New / edit terminal (VarSheet) modal */}
      {terminalFormOpen && (
        <TerminalFormModal
          mode={terminalFormOpen.mode}
          merchant={merchant}
          stores={stores}
          terminal={terminalFormOpen.terminal}
          defaultStoreId={terminalFormOpen.defaultStoreId}
          onClose={() => setTerminalFormOpen(null)}
          onDelete={(t) => {
            setTerminalFormOpen(null);
            const isPending = t.state === "pending" && !t.sn;
            if (isPending) setDeletePendingOpen(t); else setUnbindOpen(t);
          }}
          onSave={(payload) => {
            const now = "just now";
            // Bulk import path — payload is { __bulk: [rows] }. Each valid
            // row becomes its own pending VarSheet.
            if (payload && payload.__bulk) {
              const hq = stores.find(s => s.isHQ);
              const created = payload.__bulk.map((r, i) => {
                const fallbackTid = "T" + String(1010000 + Math.floor(Math.random() * 8999999) + i).padStart(8, "0");
                return {
                  sn: null, model: null,
                  state: "pending", lastSeen: "—",
                  createdAt: now, updatedAt: now,
                  tid: fallbackTid,
                  storeId: r.storeId || hq?.id || stores[0]?.id,
                  address: r.address,
                  mcc: r.mcc,
                  currency: r.currency,
                  cardSchemes: (r.schemes || "").split(",").map(s => s.trim()).filter(Boolean),
                };
              });
              merchant.terminals = [...(merchant.terminals || []), ...created];
              merchant.updatedAt = now;
              bumpMerchants();
              window.showToast?.(`${created.length} VarSheet${created.length === 1 ? "" : "s"} imported · all pending installation`, "success");
              setTerminalFormOpen(null);
              return;
            }
            if (terminalFormOpen.mode === "new") {
              // Pending VarSheet — no SN/model yet. tid is auto-assigned by
              // normaliseTimestamps on read, but since we're mutating in
              // place we generate one here too so the UI shows it immediately.
              const fallbackTid = "T" + String(1010000 + Math.floor(Math.random() * 8999999)).padStart(8, "0");
              const newT = {
                sn: null, model: null,
                state: "pending", lastSeen: "—",
                createdAt: now, updatedAt: now,
                // Map the acquirer-supplied identifiers onto the terminal
                // record's tid + dedicated *Acq fields. The system-level
                // merchant.mid stays the system identifier; midAcq is the
                // acquirer's MID for this VarSheet.
                tid:              payload.tid?.trim() || fallbackTid,
                tidAcq:           payload.tid?.trim() || fallbackTid,
                midAcq:           payload.mid?.trim() || "",
                merchantNameAcq:  payload.merchantNameAcq?.trim() || "",
                ...payload,
              };
              // Avoid double-overwriting tid from the ...payload spread.
              newT.tid = newT.tid;
              merchant.terminals = [...(merchant.terminals || []), newT];
              merchant.updatedAt = now;
              window.showToast?.(`VarSheet ${newT.tid} created · pending installation`, "success");
            } else {
              Object.assign(terminalFormOpen.terminal, payload, { updatedAt: now });
              merchant.updatedAt = now;
              window.showToast?.(`VarSheet ${terminalFormOpen.terminal.tid} updated`, "success");
            }
            bumpMerchants();
            setTerminalFormOpen(null);
          }} />
      )}

      {/* Install device modal */}
      {installOpen && (
        <InstallTerminalModal
          merchant={merchant}
          terminal={installOpen}
          onClose={() => setInstallOpen(null)}
          onConfirm={(resolved) => {
            const now = "just now";
            Object.assign(installOpen, {
              sn: resolved.sn, model: resolved.model,
              state: "active", lastSeen: "just now",
              updatedAt: now,
            });
            merchant.updatedAt = now;
            window.showToast?.(`${resolved.sn} installed · VarSheet ${installOpen.tid} now installed`, "success");
            bumpMerchants();
            setInstallOpen(null);
          }} />
      )}

      {/* Unbind device modal (for bound terminals) */}
      {unbindOpen && (
        <UnbindTerminalModal
          merchant={merchant}
          terminal={unbindOpen}
          onClose={() => setUnbindOpen(null)}
          onConfirm={() => {
            const now = "just now";
            // Clear device binding but keep the VarSheet record.
            Object.assign(unbindOpen, {
              sn: null, model: null,
              state: "pending", lastSeen: "—",
              updatedAt: now,
            });
            merchant.updatedAt = now;
            window.showToast?.(`Device unbound from VarSheet ${unbindOpen.tid} · awaiting reinstall`, "warning");
            bumpMerchants();
            setUnbindOpen(null);
          }} />
      )}

      {/* Delete pending VarSheet confirmation */}
      <window.ConfirmDialog
        open={!!deletePendingOpen}
        onClose={() => setDeletePendingOpen(null)}
        title={deletePendingOpen ? `Delete VarSheet ${deletePendingOpen.tid}?` : "Delete VarSheet?"}
        body={<>
          <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.55, marginBottom: 10 }}>
            This removes the pending registration permanently. The Terminal No. will not be reusable.
          </div>
          {deletePendingOpen && (
            <div style={{
              padding: "10px 12px",
              background: "var(--bg2)",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--radius-md)",
              display: "grid", gridTemplateColumns: "100px minmax(0, 1fr)", rowGap: 5, columnGap: 12,
            }}>
              <KvLabel>Merchant No.</KvLabel>
              <KvValue><span className="mono" style={{ fontSize: 12 }}>{merchant.mid}</span></KvValue>
              <KvLabel>Terminal No.</KvLabel>
              <KvValue><span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{deletePendingOpen.tid}</span></KvValue>
            </div>
          )}
        </>}
        confirmLabel="Delete VarSheet"
        tone="danger"
        icon="trash"
        onConfirm={() => {
          merchant.terminals = (merchant.terminals || []).filter(t => t.tid !== deletePendingOpen.tid);
          window.showToast?.(`VarSheet ${deletePendingOpen.tid} deleted`, "warning");
          bumpMerchants();
          setDeletePendingOpen(null);
        }} />

      <window.ConfirmDialog
        open={!!confirmDeleteStore}
        onClose={() => setConfirmDeleteStore(null)}
        title={confirmDeleteStore ? `Remove "${confirmDeleteStore.name}"?` : "Remove store?"}
        body={confirmDeleteStore
          ? <>
              {(merchant.terminals || []).some(t => t.storeId === confirmDeleteStore.id) ? (
                <div style={{ padding: "10px 12px", background: "var(--error-bg)",
                  border: "1px solid color-mix(in oklab, var(--color-error-500) 25%, transparent)",
                  borderRadius: "var(--radius-md)", color: "var(--color-error-700)",
                  fontSize: 12.5, lineHeight: 1.55 }}>
                  This store still has <b>{(merchant.terminals || []).filter(t => t.storeId === confirmDeleteStore.id).length}</b> terminal(s) bound to it. Move or unbind them before removing the store.
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
                  The store record will be deleted.
                </div>
              )}
            </>
          : null}
        confirmLabel="Remove store"
        tone="danger"
        icon="trash"
        onConfirm={() => {
          const blocked = (merchant.terminals || []).some(t => t.storeId === confirmDeleteStore.id);
          if (blocked) { setConfirmDeleteStore(null); return; }
          merchant.stores = (merchant.stores || []).filter(s => s.id !== confirmDeleteStore.id);
          if (selectedStoreId === confirmDeleteStore.id) {
            setSelectedStoreId(merchant.stores[0]?.id);
          }
          window.showToast?.(`Store "${confirmDeleteStore.name}" removed`, "warning");
          bumpMerchants();
          setConfirmDeleteStore(null);
        }} />
    </div>
  );
}

// ─── Last-seen timestamp ───────────────────────────────────
// Terminal records store a relative "last seen" phrase ("3 min ago"). The
// Payment terminals list shows an absolute timestamp instead, computed from
// a fixed reference time so it stays stable across renders.
function lastSeenTimestamp(rel) {
  if (!rel || rel === "\u2014") return "\u2014";
  const base = new Date(2026, 4, 29, 14, 30, 0); // ref: May 29 2026, 14:30
  let ms = 0;
  if (!/just now/i.test(rel)) {
    const m = String(rel).match(/(\d+)\s*(min|hour|day)/i);
    if (m) {
      const n = +m[1];
      ms = m[2].toLowerCase() === "min"  ? n * 60000
         : m[2].toLowerCase() === "hour" ? n * 3600000
         :                                 n * 86400000;
    }
  }
  const d = new Date(base.getTime() - ms);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Stores row + selected-store terminals ────────────────
// The whole merchant-detail body is this one component. Horizontal store
// cards on top, selected store's detail + terminals below. "Add store"
// lives as the trailing card; "Bind terminal" lives on the selected-store
// header — there is no merchant-level bind, since terminals must always
// land in a specific store.
function StoresWithTerminalsView({ merchant, stores, selectedStore, selectedStoreOptional, merchantDisabled, onSelectStore,
                                   onAddStore, onEditStore, onDeleteStore,
                                   onBindTerminal, onEditTerminal, onInstallTerminal,
                                   onUnbindTerminal, onDeletePendingTerminal,
                                   navigate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Stores strip — always horizontal scroll, with search + arrows for big chains */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <span className="overline" style={{ fontSize: 10.5 }}>Stores · <span className="mono num">{stores.length}</span></span>
          <span style={{ fontSize: 11, color: "var(--fg3)" }}>Click a card to view its terminals.</span>
        </div>
        <StoreCardStrip
          merchant={merchant}
          stores={stores}
          selectedStore={selectedStore}
          onSelectStore={onSelectStore}
          merchantDisabled={merchantDisabled}
          onAddStore={onAddStore} />
      </div>

      {selectedStore && (
        <SelectedStoreHeader
          merchant={merchant}
          store={selectedStore}
          merchantDisabled={merchantDisabled}
          onEdit={() => onEditStore(selectedStore)}
          onDelete={() => onDeleteStore(selectedStore)} />
      )}

      {selectedStore && (
        <SelectedStoreTerminals
          merchant={merchant}
          store={selectedStore}
          merchantDisabled={merchantDisabled}
          onBind={() => onBindTerminal(selectedStore.id)}
          onEdit={onEditTerminal}
          onInstall={onInstallTerminal}
          onUnbind={onUnbindTerminal}
          onDeletePending={onDeletePendingTerminal} />
      )}
    </div>
  );
}

// ─── Store card strip ─────────────────────────────────────
// Horizontally scrolling chip strip — always the same layout, regardless
// of count. For large chains (>6 stores) we show a filter input + a
// "scroll left / right" pair so 20+ stores are still navigable without
// dragging the scrollbar by hand.
function StoreCardStrip({ merchant, stores, selectedStore, onSelectStore, onAddStore, merchantDisabled }) {
  const [query, setQuery] = useStateM("");
  const scrollRef = useRefM(null);
  const [canL, setCanL] = useStateM(false);
  const [canR, setCanR] = useStateM(false);

  const filtered = useMemoM(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(s =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q)
    );
  }, [stores, query]);

  const updateOverflow = () => {
    const el = scrollRef.current; if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffectM(() => {
    updateOverflow();
    const el = scrollRef.current; if (!el) return;
    const onScroll = () => updateOverflow();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateOverflow);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateOverflow);
    };
  }, [filtered.length]);

  // Keep the selected card in view when the merchant switches.
  useEffectM(() => {
    const el = scrollRef.current; if (!el || !selectedStore) return;
    const node = el.querySelector(`[data-store-id="${selectedStore.id}"]`);
    if (node && typeof node.scrollIntoView === "function") {
      // Only nudge horizontally — never the whole page.
      const elRect = el.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      if (nodeRect.left < elRect.left || nodeRect.right > elRect.right) {
        el.scrollTo({
          left: node.offsetLeft - el.clientWidth / 2 + node.offsetWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }, [selectedStore?.id]);

  const showTools = stores.length > 6;
  const nudge = (dir) => {
    const el = scrollRef.current; if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.7, 240), behavior: "smooth" });
  };

  const arrowStyle = (enabled) => ({
    width: 28, height: 28, padding: 0,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg2)", border: "1px solid var(--border-1)",
    borderRadius: "var(--radius-sm)",
    color: enabled ? "var(--fg1)" : "var(--fg3)",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.45,
    transition: "background var(--duration-fast) var(--easing-standard)",
  });

  return (
    <div>
      {showTools && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            flex: "0 1 320px", minWidth: 200,
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px",
            background: "var(--bg2)", border: "1px solid var(--border-1)",
            borderRadius: "var(--radius-md)",
          }}>
            <window.Ico name="search" size={13} style={{ color: "var(--fg3)", flexShrink: 0 }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or address…"
              style={{
                flex: 1, minWidth: 0,
                border: 0, outline: "none", background: "transparent",
                fontSize: 12.5, color: "var(--fg1)",
              }} />
            {query && (
              <button type="button" onClick={() => setQuery("")} title="Clear"
                style={{ background: "transparent", border: 0, padding: 2, cursor: "pointer",
                  color: "var(--fg3)", display: "inline-flex", alignItems: "center" }}>
                <window.Ico name="x" size={12} />
              </button>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--fg3)", whiteSpace: "nowrap" }}>
            <span className="mono num" style={{ fontWeight: 500, color: "var(--fg2)" }}>{filtered.length}</span>
            <span style={{ margin: "0 4px" }}>of</span>
            <span className="mono num">{stores.length}</span>
          </span>
          <div style={{ display: "inline-flex", gap: 4 }}>
            <button type="button" onClick={() => nudge(-1)} disabled={!canL}
              title="Scroll left" style={arrowStyle(canL)}>
              <window.Ico name="chevl" size={14} />
            </button>
            <button type="button" onClick={() => nudge(1)} disabled={!canR}
              title="Scroll right" style={arrowStyle(canR)}>
              <window.Ico name="chevr" size={14} />
            </button>
          </div>
          <window.Button size="sm" icon="plus" onClick={onAddStore} disabled={merchantDisabled}>Add store</window.Button>
        </div>
      )}

      <div ref={scrollRef} style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "4px 2px 6px",
      }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "14px 16px", fontSize: 12, color: "var(--fg3)",
            border: "1px dashed var(--border-1)",
            borderRadius: "var(--radius-md)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            No stores match "{query}".
            <button type="button" onClick={() => setQuery("")} style={{
              color: "var(--color-primary-700)", textDecoration: "underline",
              background: "transparent", border: 0, cursor: "pointer", padding: 0,
              fontSize: 12,
            }}>Clear filter</button>
          </div>
        ) : (
          filtered.map(s => {
            const tCount = (merchant.terminals || []).filter(t => t.storeId === s.id).length;
            const on = selectedStore?.id === s.id;
            return (
              <button key={s.id} data-store-id={s.id}
                onClick={() => onSelectStore(s.id)} style={{
                  flexShrink: 0,
                  minWidth: 180, maxWidth: 220,
                  padding: "12px 14px", textAlign: "left",
                  background: on ? "var(--color-primary-50)" : "var(--bg2)",
                  border: "1px solid",
                  borderColor: on ? "var(--color-primary-500)" : "var(--border-1)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: on ? "0 0 0 3px oklch(40% 0.14 262 / 0.10)" : "var(--shadow-1)",
                  cursor: "pointer",
                  transition: "background var(--duration-fast) var(--easing-standard), border-color var(--duration-fast) var(--easing-standard)",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span title={s.name} style={{
                    fontSize: 13, fontWeight: 500, lineHeight: 1.35,
                    color: on ? "var(--color-primary-700)" : "var(--fg1)",
                    display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2,
                    overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word",
                  }}>{s.name}</span>
                  {s.isHQ && (
                    <span style={{
                      fontSize: 9.5, padding: "1px 5px", borderRadius: 3,
                      background: on ? "var(--bg2)" : "var(--color-primary-50)",
                      color: "var(--color-primary-700)",
                      fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "0.04em",
                      flexShrink: 0, marginTop: 2,
                    }}>HQ</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: on ? "var(--color-primary-700)" : "var(--fg3)" }}>
                  <span className="mono num" style={{ fontWeight: 500 }}>{tCount}</span> terminal{tCount === 1 ? "" : "s"}
                </div>
              </button>
            );
          })
        )}
        {/* Trailing Add card — only when the toolbar isn't already offering it,
            and when the merchant isn't disabled */}
        {!showTools && !merchantDisabled && (
          <button onClick={onAddStore} style={{
          flexShrink: 0, minWidth: 140,
          padding: "12px 14px", textAlign: "center",
          background: "var(--bg2)",
          border: "1.5px dashed var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          color: "var(--fg2)",
          cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-primary-500)";
          e.currentTarget.style.background = "var(--color-primary-50)";
          e.currentTarget.style.color = "var(--color-primary-700)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border-default)";
          e.currentTarget.style.background = "var(--bg2)";
          e.currentTarget.style.color = "var(--fg2)";
        }}>
          <window.Ico name="plus" size={16} stroke={1.8} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Add store</span>
        </button>
        )}
      </div>
    </div>
  );
}


// ─── Slim header for the selected store ───────────────────
// Just the name + a "View / Edit / Remove" menu. The full address / notes /
// created/updated are tucked behind a popover so they don't dominate the
// page — the page's purpose is the terminals table below.
function SelectedStoreHeader({ merchant, store, onEdit, onDelete, merchantDisabled }) {
  const [detailsOpen, setDetailsOpen] = useStateM(false);
  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px",
        background: "var(--bg2)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--radius-md)",
      }}>
        <window.Ico name="store" size={13} style={{ color: "var(--fg3)", flexShrink: 0 }} />
        <span title={store.address || undefined} style={{ fontSize: 12.5, color: "var(--fg2)", minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {store.address || <span style={{ color: "var(--fg3)" }}>No address on file</span>}
        </span>
        {store.address && (
          <button
            type="button"
            title="Copy address"
            aria-label="Copy address"
            onClick={() => {
              const text = `${store.address}${store.country ? `, ${store.country}` : ""}`;
              const done = () => window.showToast?.("Address copied to clipboard", "success");
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(() => {
                  window.showToast?.("Couldn't copy — check browser permissions", "warning");
                });
              } else {
                // Fallback for environments without the async clipboard API.
                const ta = document.createElement("textarea");
                ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
                document.body.appendChild(ta); ta.select();
                try { document.execCommand("copy"); done(); } catch (_) {}
                document.body.removeChild(ta);
              }
            }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, padding: 0, flexShrink: 0,
              background: "transparent", border: 0, borderRadius: "var(--radius-sm)",
              color: "var(--fg3)", cursor: "pointer",
              transition: "background var(--duration-fast) var(--easing-standard), color var(--duration-fast) var(--easing-standard)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--fg1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
            <window.Ico name="copy" size={12} />
          </button>
        )}
        <span style={{ fontSize: 11.5, color: "var(--fg3)", whiteSpace: "nowrap" }}>· {store.country}</span>
        <div style={{ flex: 1 }} />
        <window.Button size="sm" ghost icon="info" onClick={() => setDetailsOpen(true)}>Details</window.Button>
        <window.Button size="sm" ghost icon="edit" onClick={onEdit} disabled={merchantDisabled}>Edit</window.Button>
        {!store.isHQ && (
          <window.Button size="sm" ghost icon="trash" onClick={onDelete} />
        )}
      </div>

      <window.Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} width={480}
        title={store.name}
        subtitle={store.isHQ ? "Headquarter — auto-created with the merchant." : "Store details"}
        footer={<window.Button onClick={() => setDetailsOpen(false)}>Close</window.Button>}>
        <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", rowGap: 8, columnGap: 14 }}>
          <KvLabel>Address</KvLabel>
          <KvValue>{store.address || <span style={{ color: "var(--fg3)" }}>—</span>}</KvValue>
          <KvLabel>Country</KvLabel><KvValue>{store.country}</KvValue>
          {store.notes && <>
            <KvLabel>Notes</KvLabel><KvValue><span style={{ whiteSpace: "pre-wrap" }}>{store.notes}</span></KvValue>
          </>}
          <KvLabel>Created</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 11.5, color: "var(--fg3)" }}>{store.createdAt}</span></KvValue>
          {store.updatedAt && store.updatedAt !== store.createdAt && (
            <>
              <KvLabel>Updated</KvLabel>
              <KvValue><span className="mono" style={{ fontSize: 11.5, color: "var(--fg3)" }}>{store.updatedAt}</span></KvValue>
            </>
          )}
        </div>
      </window.Modal>
    </>
  );
}

function SelectedStoreTerminals({ merchant, store, onBind, onEdit, onInstall, onUnbind, onDeletePending, merchantDisabled }) {
  const rawTerminals = (merchant.terminals || []).filter(t => t.storeId === store.id);

  // ─── Filters (Merchants-style deferred search: typed live as a draft,
  //     applied to the list only on Search / Enter) ──
  const [q,            setQ]            = useStateM("");      // draft search — SN (or TID)
  const [statusFilter, setStatusFilter] = useStateM("any");  // draft: any | installed | not-installed
  const [aQ,      setAQ]      = useStateM("");                // applied search
  const [aStatus, setAStatus] = useStateM("any");            // applied status

  // Parse the relative-time string into "seconds ago" so we can sort by
  // recency. Anything we can't parse falls to the bottom of the active list.
  const parseLastSeen = (s) => {
    if (!s || s === "—") return Number.POSITIVE_INFINITY;
    if (/just now/i.test(s)) return 0;
    const m = s.match(/(\d+)\s*(sec|min|hour|day|week|month|year)/i);
    if (!m) return Number.POSITIVE_INFINITY;
    const n = +m[1];
    const unit = m[2].toLowerCase();
    const mult = unit.startsWith("sec")   ? 1
              : unit.startsWith("min")   ? 60
              : unit.startsWith("hour")  ? 3600
              : unit.startsWith("day")   ? 86400
              : unit.startsWith("week")  ? 604800
              : unit.startsWith("month") ? 2592000
              :                            31536000;
    return n * mult;
  };

  const filtered = useMemoM(() => {
    return rawTerminals.filter(t => {
      const isPending = t.state === "pending" && !t.sn;
      const installed = !isPending;
      if (aStatus === "installed"     && !installed) return false;
      if (aStatus === "not-installed" &&  installed) return false;
      if (aQ) {
        // Fuzzy match on serial number (and TID).
        const n = aQ.toLowerCase();
        if (!`${t.sn || ""} ${t.tid || ""}`.toLowerCase().includes(n)) return false;
      }
      return true;
    });
  }, [rawTerminals, aQ, aStatus]);

  // Pending rows float to the top — they're actionable.
  const terminals = useMemoM(() => [...filtered].sort((a, b) => {
    const aPending = a.state === "pending" && !a.sn;
    const bPending = b.state === "pending" && !b.sn;
    if (aPending !== bPending) return aPending ? -1 : 1;
    if (aPending && bPending) return (a.tid || "").localeCompare(b.tid || "");
    return parseLastSeen(a.lastSeen) - parseLastSeen(b.lastSeen);
  }), [filtered]);

  // Apply / clear — mirrors the Merchants condition area.
  const runSearch   = () => { setAQ(q.trim()); setAStatus(statusFilter); };
  const clearQ      = () => { setQ(""); setAQ(""); };
  const clearStatus = () => { setStatusFilter("any"); setAStatus("any"); };
  const resetAll    = () => { setQ(""); setStatusFilter("any"); setAQ(""); setAStatus("any"); };
  const STATUS_LABEL = { installed: "Installed", "not-installed": "Not installed" };

  const pager = window.usePaginated(terminals, 10,
    `t|${merchant.id}|${store.id}|${aQ}|${aStatus}`);

  const hasAnyRaw = rawTerminals.length > 0;
  const hasApplied = !!aQ || aStatus !== "any";

  return (
    <window.Card title={
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Payment terminals</span>
        <span className="mono num" style={{
          fontSize: 10.5, padding: "1px 7px", borderRadius: 999,
          background: "var(--bg3)", color: "var(--fg3)", fontWeight: 500,
          border: "1px solid var(--border-1)",
        }}>{rawTerminals.length}</span>
      </div>
    } hint={<>Pending rows aren't bound to a physical device yet — use <b>Bind</b> to enter the 6-digit authorization code on the device screen.</>}
      action={
        <window.Button primary size="sm" icon="plus" onClick={onBind} disabled={merchantDisabled}>Add terminal</window.Button>
      }
      padding={0}>
      {!hasAnyRaw ? (
        <div style={{ padding: "32px 18px", textAlign: "center" }}>
          <window.Empty icon="device"
            title="No terminals bound here yet"
            body={<>Click <b>Add terminal</b> above to register a VarSheet for <b>{store.name}</b>.</>} />
        </div>
      ) : (
        <>
          {/* ─── Condition area (Merchants style) ─── */}
          <div style={{
            padding: "var(--space-4)",
            background: "var(--bg2)",
            borderBottom: "1px solid var(--border-1)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 280px", minWidth: 200 }}>
                <window.Input
                  size="sm"
                  value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                  placeholder="Search by serial number (SN)"
                  prefix={<window.Ico name="search" size={13} />}
                  suffix={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {q && (
                        <button type="button" title="Clear"
                          onClick={(e) => { e.preventDefault(); clearQ(); }}
                          style={{ display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: "var(--radius-full)", color: "var(--fg3)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
                          <window.Ico name="x" size={11} />
                        </button>
                      )}
                      <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10, lineHeight: "14px", padding: "1px 5px", border: "1px solid var(--border-2)", borderRadius: "var(--radius-sm)", background: "var(--bg1)", color: "var(--fg3)", whiteSpace: "nowrap" }}>↵ Enter</kbd>
                    </span>
                  } />
              </div>
              <label className="tds-select tds-select--sm" style={{ flex: "0 0 170px", position: "relative" }}>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ appearance: "none", WebkitAppearance: "none", flex: 1, height: "100%", background: "transparent", border: 0, outline: 0, fontSize: 13, color: "var(--fg1)", paddingRight: statusFilter !== "any" ? 22 : "var(--space-5)" }}>
                  <option value="any">All statuses</option>
                  <option value="installed">Installed</option>
                  <option value="not-installed">Not installed</option>
                </select>
                {statusFilter !== "any" ? (
                  <button type="button" title="Reset status"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearStatus(); }}
                    style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: "var(--radius-full)", color: "var(--fg3)", marginLeft: -18, zIndex: 2 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg3)"; e.currentTarget.style.color = "var(--fg1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg3)"; }}>
                    <window.Ico name="x" size={12} />
                  </button>
                ) : (
                  <window.Ico name="chevd" size={12} className="tds-select__chevron" />
                )}
              </label>
              <window.Button size="sm" icon="search" onClick={runSearch}>Search</window.Button>
            </div>

            {hasApplied && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", paddingTop: "var(--space-2)", borderTop: "1px dashed var(--border-1)" }}>
                <span className="overline" style={{ fontSize: 10, color: "var(--fg3)", letterSpacing: "0.08em" }}>Applied</span>
                {aQ && <MAppliedChip label="SN" value={aQ} onRemove={clearQ} />}
                {aStatus !== "any" && <MAppliedChip label="Status" value={STATUS_LABEL[aStatus] || aStatus} onRemove={clearStatus} />}
                <button onClick={resetAll}
                  style={{ marginLeft: "var(--space-1)", fontSize: 11.5, color: "var(--fg3)", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--fg1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--fg3)"; }}>
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Table (Merchants tds-table style) */}
          <table className="tds-table num" style={{ width: "100%" }}>
              <thead style={{ background: "var(--bg2)" }}>
                <tr>
                  <th>Merchant No. (MID)</th>
                  <th>Terminal No. (TID)</th>
                  <th>Serial number</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Last seen</th>
                  <th style={{ textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {terminals.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--fg3)" }}>
                    {hasApplied ? "No terminals match those filters." : "No terminals at this store yet."}
                  </td></tr>
                )}
                {pager.slice.map(t => {
                  const isPending = t.state === "pending" && !t.sn;
                  const tone = isPending ? "warning"
                            : t.state === "active" ? "success"
                                                    : "neutral";
                  // Only two display states: Installed (has SN, ever installed)
                  // and Not installed (pending VarSheet — no SN yet).
                  const statusLabel = isPending ? "Not installed" : "Installed";
                  return (
                    <tr key={t.tid} style={{ background: isPending ? "var(--warning-bg)" : "transparent" }}>
                      <td>
                        <span className="mono" style={{ fontSize: 11.5, color: "var(--fg2)" }}>{merchant.mid}</span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{t.tid}</span>
                      </td>
                      <td>
                        {t.sn
                          ? (window.findDeviceBySn?.(t.sn)
                              ? <a href="#" onClick={(e) => {
                                  e.preventDefault(); e.stopPropagation();
                                  window.__navigate?.({ screen: "deviceDetail", deviceSn: t.sn });
                                }}
                                className="mono"
                                style={{ fontSize: 12, fontWeight: 500,
                                  color: "var(--color-primary-700)",
                                  textDecoration: "underline", textUnderlineOffset: 2,
                                  cursor: "pointer" }}
                                title={`Open device ${t.sn}`}>{t.sn}</a>
                              : <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--fg2)" }}
                                  title="Device record not available in this build">{t.sn}</span>)
                          : <span style={{ fontSize: 11.5, color: "var(--color-warning-700)", fontStyle: "italic" }}>not installed</span>}
                      </td>
                      <td>
                        {t.model
                          ? <span className="mono" style={{ fontSize: 12, color: "var(--fg2)" }}>{t.model}</span>
                          : <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>—</span>}
                      </td>
                      <td>
                        <window.Pill tone={tone} dot size="sm">{statusLabel}</window.Pill>
                      </td>
                      <td style={{ fontSize: 11.5, color: "var(--fg2)" }}>
                        <span className="mono">{lastSeenTimestamp(t.lastSeen)}</span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {isPending ? (
                          <>
                            <window.Button size="sm" primary icon="link" onClick={() => onInstall(t)} disabled={merchantDisabled}>Bind</window.Button>
                            <window.Button size="sm" ghost icon="edit" onClick={() => onEdit(t)} disabled={merchantDisabled}>Edit</window.Button>
                            <window.Button size="sm" ghost icon="trash" onClick={() => onDeletePending(t)} />
                          </>
                        ) : (
                          <>
                            <window.Button size="sm" ghost icon="edit" onClick={() => onEdit(t)} disabled={merchantDisabled}>Edit</window.Button>
                            <window.Button size="sm" ghost icon="link" onClick={() => onUnbind(t)}>Unbind</window.Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          {terminals.length > 0 && (
            <window.Pagination
              page={pager.page} pageSize={pager.pageSize} total={pager.total}
              onChange={pager.setPage} onPageSizeChange={pager.setPageSize}
              pageSizes={[10, 20, 50]} />
          )}
        </>
      )}
    </window.Card>
  );
}

// ─── Legacy tab components (no longer mounted) ─────────────
// The Overview / Stores / Terminals tabs were merged into the new
// StoresWithTerminalsView above. We deliberately leave the helpers for
// store and tag chips below; the dead tab functions used to live here.
// ─── Forms ─────────────────────────────────────────────────
function MerchantFormModal({ mode, merchant, onClose, onSave }) {
  const isEdit = mode === "edit" && !!merchant;
  const [name, setName] = useStateM(merchant?.name || "");
  const [country, setCountry] = useStateM(merchant?.country || COUNTRIES[0]);
  const [address, setAddress] = useStateM(merchant?.address || "");
  // Phone code defaults from country on first render; when the operator
  // changes Country, we offer to refresh the dial code IF they haven't
  // hand-edited it (tracked by `phoneCodeTouched`).
  const initialPhoneCode = merchant?.phoneCountryCode
    || COUNTRY_PHONE_CODES[merchant?.country || COUNTRIES[0]]
    || "";
  const [phoneCountryCode, setPhoneCountryCode] = useStateM(initialPhoneCode);
  const [phoneCodeTouched, setPhoneCodeTouched] = useStateM(false);
  const [phone, setPhone] = useStateM(merchant?.phone || "");
  const [email, setEmail] = useStateM(merchant?.email || "");
  const [tags, setTags] = useStateM(merchant?.tags || []);
  const [tagInput, setTagInput] = useStateM("");
  const [notes, setNotes] = useStateM(merchant?.notes || "");

  // Email is optional, but if provided must look like an email.
  const emailTrimmed = email.trim();
  const emailInvalid = emailTrimmed.length > 0 && !isValidEmail(emailTrimmed);

  const canSave = name.trim().length > 1 && tags.length <= 5 && !emailInvalid;

  const onCountryChange = (next) => {
    setCountry(next);
    // Re-prefill the dial code unless the operator has hand-edited it.
    if (!phoneCodeTouched) {
      setPhoneCountryCode(COUNTRY_PHONE_CODES[next] || "");
    }
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (tags.includes(v)) { setTagInput(""); return; }
    if (tags.length >= 5) return;
    setTags([...tags, v]);
    setTagInput("");
  };

  return (
    <window.Modal open onClose={onClose} width={560}
      title={isEdit ? `Edit ${merchant.name}` : "New merchant"}
      subtitle={isEdit
        ? "Update the merchant's account information. A default headquarter store was created on registration; manage stores under the Stores tab."
        : "Register a new merchant. A default headquarter store will be created automatically — you can break it out as its own row later by adding a second store."}
      footer={
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary disabled={!canSave} icon={isEdit ? "check" : "plus"}
            onClick={() => onSave({
              name: name.trim(),
              country,
              address: address.trim(),
              phoneCountryCode: phoneCountryCode.trim(),
              phone: phone.trim(),
              email: emailTrimmed,
              tags,
              notes,
            })}>
            {isEdit ? "Save changes" : "Create merchant"}
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <window.Field label="Merchant name" required
          hint={<span><span className="mono">{name.length}</span> / 80 characters</span>}>
          <window.Input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder="e.g. Riverside Coffee Co." />
        </window.Field>
        <window.Field label="Country / region" required>
          <select value={country} onChange={(e) => onCountryChange(e.target.value)} style={{
            width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-default)", fontSize: 13,
            fontFamily: "inherit", background: "var(--bg2)", color: "var(--fg1)",
          }}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </window.Field>
        <window.Field label="Address">
          <window.Input value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, postal code" />
        </window.Field>
        <window.Field label="Contact phone"
          hint="Country code auto-fills from Country / region; edit if needed.">
          <div style={{ display: "flex", gap: 8 }}>
            <window.Input value={phoneCountryCode}
              onChange={(e) => { setPhoneCodeTouched(true); setPhoneCountryCode(e.target.value.slice(0, 6)); }}
              placeholder="+1"
              style={{ width: 80, flex: "0 0 80px" }} />
            <window.Input value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="514-555-0142"
              style={{ flex: 1 }} />
          </div>
        </window.Field>
        <window.Field label="Contact email"
          hint={emailInvalid
            ? <span style={{ color: "var(--color-error-600, oklch(50% 0.18 25))" }}>
                Please enter a valid email address (name@example.com).
              </span>
            : "Used for system notices. Optional."}>
          <window.Input value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ops@example.com"
            style={emailInvalid ? { borderColor: "var(--color-error-500, oklch(60% 0.18 25))" } : undefined} />
        </window.Field>
        <window.Field label="Tags"
          hint={<span><span className="mono">{tags.length}</span> / 5 — optional. Press Enter to add.</span>}>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 4,
            padding: "6px 8px",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg2)",
            minHeight: 36, alignItems: "center",
          }}>
            {tags.map(t => (
              <span key={t} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 4px 2px 8px", borderRadius: 999,
                background: "var(--color-primary-50)",
                color: "var(--color-primary-700)",
                fontSize: 11.5, fontWeight: 500,
              }}>
                {t}
                <button onClick={() => setTags(tags.filter(x => x !== t))}
                  style={{ padding: 2, color: "var(--color-primary-700)" }} title="Remove">
                  <window.Ico name="x" size={10} stroke={2.5} />
                </button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } if (e.key === "Backspace" && !tagInput && tags.length > 0) setTags(tags.slice(0, -1)); }}
                placeholder={tags.length === 0 ? "Add a tag and press Enter" : "Add another…"}
                style={{
                  flex: 1, minWidth: 120, border: 0, outline: "none",
                  background: "transparent", fontSize: 12.5,
                  color: "var(--fg1)",
                  fontFamily: "inherit",
                }} />
            )}
          </div>
        </window.Field>
        <window.Field label="Notes">
          <window.Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Optional — primary contact, SLA, special arrangements, etc." />
        </window.Field>
      </div>
    </window.Modal>
  );
}

function StoreFormModal({ mode, merchant, store, onClose, onSave, onDelete }) {
  const isEdit = mode === "edit" && !!store;
  const isHQ = store?.isHQ;
  // The HQ store's name defaults to (and stays in sync with) the merchant name
  // when it hasn't been customized.
  const [name, setName] = useStateM(store?.name || (isHQ ? merchant.name : ""));
  const [address, setAddress] = useStateM(store?.address || "");
  const [country, setCountry] = useStateM(store?.country || merchant.country);
  const [notes, setNotes] = useStateM(store?.notes || "");

  const canSave = name.trim().length > 1;

  return (
    <window.Modal open onClose={onClose} width={560}
      title={isEdit
        ? (isHQ ? `Edit headquarter` : `Edit ${store.name}`)
        : "Add store"}
      subtitle={isEdit
        ? (isHQ ? "The headquarter is the auto-created store every merchant has. You can rename it, but it can't be deleted."
                : "Update this store's details.")
        : <>Adding a second store makes the headquarter visible as its own row. Terminals stay with their currently-bound store.</>}
      footer={
        <>
          {isEdit && (
            <window.Button danger icon="trash" onClick={() => onDelete && onDelete(store)}>
              Delete store
            </window.Button>
          )}
          <div style={{ flex: 1 }} />
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary disabled={!canSave} icon={isEdit ? "check" : "plus"}
            onClick={() => onSave({ name: name.trim(), address: address.trim(), country, notes })}>
            {isEdit ? "Save changes" : "Add store"}
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <window.Field label="Store name" required
          hint={isHQ
            ? <>Defaults to the merchant name. Rename if the headquarter has its own street identity. <span className="mono">{name.length}</span> / 80 characters.</>
            : <span><span className="mono">{name.length}</span> / 80 characters</span>}>
          <window.Input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder={isHQ ? merchant.name : "e.g. Plateau Roastery"} />
        </window.Field>
        <window.Field label="Store address">
          <window.Input value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, postal code" />
        </window.Field>
        <window.Field label="Country / region" required>
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={{
            width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-default)", fontSize: 13,
            fontFamily: "inherit", background: "var(--bg2)", color: "var(--fg1)",
          }}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </window.Field>
        <window.Field label="Notes">
          <window.Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Optional — operating hours, contact, etc." />
        </window.Field>
      </div>
    </window.Modal>
  );
}

function TerminalFormModal({ mode, merchant, stores, terminal, defaultStoreId, onClose, onSave, onDelete }) {
  const isEdit = mode === "edit" && !!terminal;
  const isPending = isEdit && terminal?.state === "pending" && !terminal?.sn;
  const hq = stores.find(s => s.isHQ);

  // Mode toggle — single VarSheet vs bulk import. Editing always goes through
  // the single form; the bulk import only makes sense for new records.
  const [entryMode, setEntryMode] = useStateM("single");
  // Active form section (single-mode tabs).
  const [section, setSection] = useStateM("identity");

  // The full VarSheet state. ~30 acquirer-provided parameters grouped by
  // function. Defaults are realistic seeds an acquirer would pre-fill for
  // a Canadian merchant — operators rarely touch most of these.
  const [vs, setVs] = useStateM(() => ({
    // Acquirer-provided identifiers — these are typed in by the operator,
    // not derived from the system's merchant record. The acquirer's name
    // for the merchant often differs from what we know them as.
    merchantNameAcq:  terminal?.merchantNameAcq || merchant.name || "",
    mid:              terminal?.midAcq || "",
    tid:              terminal?.tidAcq || "",
    // Identity
    storeId: terminal?.storeId || defaultStoreId || hq?.id || stores[0]?.id,
    address:           terminal?.address || "",
    subMerchantId:     terminal?.subMerchantId || "",
    // Acquirer
    acquirerId:        terminal?.acquirerId || "ACQ-NB-CA-01",
    acquirerName:     terminal?.acquirerName || "Northbay Acquiring (CA)",
    bankBin:           terminal?.bankBin || "424242",
    settlementAccount: terminal?.settlementAccount || "**** **** **** 4242",
    mcc:               terminal?.mcc || "5812",
    currency:          terminal?.currency || "CAD",
    country:           terminal?.country || "CA",
    timezone:          terminal?.timezone || "America/Toronto",
    // Operations
    cutoffTime:        terminal?.cutoffTime || "23:00",
    batchNumber:       terminal?.batchNumber || "001",
    reversalHours:     terminal?.reversalHours ?? 24,
    minTxAmount:       terminal?.minTxAmount ?? 1.00,
    maxTxAmount:       terminal?.maxTxAmount ?? 5000,
    dailyVolumeLimit:  terminal?.dailyVolumeLimit ?? 50000,
    networkMode:       terminal?.networkMode || "online",
    // Cards & Auth
    cardSchemes:       terminal?.cardSchemes || ["Visa", "Mastercard", "AMEX", "Interac"],
    cvv2:              terminal?.cvv2 ?? true,
    avs:               terminal?.avs ?? false,
    pinBypassAllowed:  terminal?.pinBypassAllowed ?? false,
    manualEntryAllowed:terminal?.manualEntryAllowed ?? true,
    contactlessLimit:  terminal?.contactlessLimit ?? 250,
    emvAids:           terminal?.emvAids || "A0000000031010, A0000000041010, A0000002771010",
    // Features
    tipAllowed:        terminal?.tipAllowed ?? true,
    cashbackAllowed:   terminal?.cashbackAllowed ?? false,
    refundAllowed:     terminal?.refundAllowed ?? true,
    voidAllowed:       terminal?.voidAllowed ?? true,
    preAuthAllowed:    terminal?.preAuthAllowed ?? false,
    surchargeRate:     terminal?.surchargeRate ?? 0,
    dccEnabled:        terminal?.dccEnabled ?? false,
    loyaltyIntegration:terminal?.loyaltyIntegration ?? false,
    // Security & receipts
    tokenizationProvider: terminal?.tokenizationProvider || "TOMS Vault",
    encryption:        terminal?.encryption || "DUKPT",
    keyIndex:          terminal?.keyIndex ?? 1,
    tlsVersion:        terminal?.tlsVersion || "1.3",
    receiptHeader:     terminal?.receiptHeader || "",
    receiptFooter:     terminal?.receiptFooter || "Thank you!",
  }));
  const setField = (k, v) => setVs(prev => ({ ...prev, [k]: v }));

  const canSave = !!vs.storeId
    && vs.merchantNameAcq.trim().length > 0
    && /^[A-Z0-9]{15}$/.test(vs.mid)
    && /^\d{8}$/.test(vs.tid);
  const selectedStore = stores.find(s => s.id === vs.storeId);

  return (
    <window.Modal open onClose={onClose} width={780}
      title={isEdit
        ? (isPending ? `Edit VarSheet ${terminal.tid}` : `Edit terminal ${terminal.sn}`)
        : "Add terminal"}
      subtitle={isEdit
        ? "Update the VarSheet's acquirer parameters. The Terminal No. (TID) is fixed once the record is created."
        : <>Register a VarSheet under <b>{merchant.name}</b>. The Merchant Name, Merchant No. and Terminal No. below are supplied by your <b>acquirer</b> — they may differ from what we know this merchant as.</>}
      footer={
        <>
          {isEdit && (
            <window.Button danger icon="trash" onClick={() => onDelete && onDelete(terminal)}>
              {isPending ? "Delete VarSheet" : "Unbind terminal"}
            </window.Button>
          )}
          <div style={{ flex: 1 }} />
          <window.Button onClick={onClose}>Cancel</window.Button>
          {entryMode === "single" && (
            <window.Button primary disabled={!canSave} icon={isEdit ? "check" : "plus"}
              onClick={() => onSave(vs)}>
              {isEdit ? "Save changes" : "Create Terminal"}
            </window.Button>
          )}
        </>
      }>
      {/* Entry-mode segmented control — only when creating new */}
      {!isEdit && (
        <div role="tablist" style={{
          display: "inline-flex", gap: 2, padding: 3,
          background: "var(--color-bg-3)", border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)", marginBottom: 14,
        }}>
          {[
            { id: "single", label: "Single terminal", icon: "device" },
            { id: "bulk",   label: "Bulk import (CSV / XLSX)", icon: "upload" },
          ].map(opt => {
            const on = entryMode === opt.id;
            return (
              <button key={opt.id} onClick={() => setEntryMode(opt.id)} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: "var(--radius-sm)",
                fontSize: 12, fontWeight: on ? 500 : 400,
                background: on ? "var(--bg2)" : "transparent",
                color: on ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                boxShadow: on ? "var(--shadow-1)" : "none",
              }}>
                <window.Ico name={opt.icon} size={12} stroke={1.8} />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {entryMode === "bulk" && !isEdit ? (
        <BulkImportPanel merchant={merchant} stores={stores} onCommit={(rows) => onSave({ __bulk: rows })} />
      ) : (
        <SingleVarSheetForm
          merchant={merchant} stores={stores}
          terminal={terminal} isEdit={isEdit} isPending={isPending}
          vs={vs} setField={setField}
          section={section} setSection={setSection}
          selectedStore={selectedStore} />
      )}
    </window.Modal>
  );
}

// ─── Single-VarSheet body — section tabs + grouped fields ─
// The ~30 acquirer parameters split into 6 logical sections. Operators
// touch maybe 4 fields on a typical setup (store, address, MCC, schemes);
// the rest are pre-populated by the acquirer's defaults so reviewing them
// is fast and accurate.
function SingleVarSheetForm({ merchant, stores, terminal, isEdit, isPending,
                              vs, setField, section, setSection, selectedStore }) {
  const sections = [
    { id: "identity",   label: "Identity" },
    { id: "acquirer",   label: "Acquirer" },
    { id: "ops",        label: "Operations" },
    { id: "cards",      label: "Cards & auth" },
    { id: "features",   label: "Features" },
    { id: "security",   label: "Security & receipts" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Section tabs */}
      <div style={{
        display: "flex", gap: 2,
        borderBottom: "1px solid var(--color-border-subtle)",
        marginBottom: 2,
        overflowX: "auto",
      }}>
        {sections.map(s => {
          const on = section === s.id;
          return (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              padding: "8px 14px",
              fontSize: 12.5, fontWeight: on ? 500 : 400,
              color: on ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: "2px solid",
              borderColor: on ? "var(--color-text-primary)" : "transparent",
              marginBottom: -1, whiteSpace: "nowrap",
            }}>{s.label}</button>
          );
        })}
      </div>

      <div style={{ maxHeight: 360, overflowY: "auto", padding: "2px 2px" }}>
        {section === "identity" && (
          <FormGrid>
            <window.Field label="Acquirer merchant name" required full
              hint="The name your acquirer uses for this merchant. Often differs from how you know them internally.">
              <window.Input value={vs.merchantNameAcq} onChange={(e) => setField("merchantNameAcq", e.target.value)}
                placeholder="e.g. RIVERSIDE COFFEE CO LTD" />
            </window.Field>
            <window.Field label="Merchant No. (MID)" required
              hint={<>15 characters — digits or uppercase letters. <span className="mono">{vs.mid.length}</span> / 15</>}
              error={vs.mid.length > 0 && !/^[A-Z0-9]{15}$/.test(vs.mid)
                ? "Must be exactly 15 characters, digits or uppercase letters only."
                : null}>
              <window.Input value={vs.mid}
                onChange={(e) => setField("mid", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
                mono
                placeholder="e.g. 821048275AB12CD" />
            </window.Field>
            <window.Field label="Terminal No. (TID)" required
              hint={<>8 digits. <span className="mono">{vs.tid.length}</span> / 8</>}
              error={vs.tid.length > 0 && !/^\d{8}$/.test(vs.tid)
                ? "Must be exactly 8 digits."
                : null}>
              <window.Input value={vs.tid}
                onChange={(e) => setField("tid", e.target.value.replace(/\D/g, "").slice(0, 8))}
                mono
                placeholder="e.g. 01029281" />
            </window.Field>
            <window.Field label="Terminal address (override)" full
              hint={<>Leave blank to inherit from <b>{selectedStore?.name || "the store"}</b>. Sets the address printed on receipts and reported to the acquirer.</>}>
              <window.Input value={vs.address} onChange={(e) => setField("address", e.target.value)}
                placeholder={selectedStore?.address || "Street, city, postal code"} />
            </window.Field>
          </FormGrid>
        )}

        {section === "acquirer" && (
          <FormGrid>
            <window.Field label="Acquirer ID" required>
              <window.Input value={vs.acquirerId} onChange={(e) => setField("acquirerId", e.target.value)} mono />
            </window.Field>
            <window.Field label="Acquirer name">
              <window.Input value={vs.acquirerName} onChange={(e) => setField("acquirerName", e.target.value)} />
            </window.Field>
            <window.Field label="Bank BIN" required>
              <window.Input value={vs.bankBin} onChange={(e) => setField("bankBin", e.target.value)} mono
                placeholder="6-digit BIN" />
            </window.Field>
            <window.Field label="Settlement account">
              <window.Input value={vs.settlementAccount} onChange={(e) => setField("settlementAccount", e.target.value)} mono />
            </window.Field>
            <window.Field label="MCC" required hint="Merchant Category Code (ISO 18245)">
              <window.Input value={vs.mcc} onChange={(e) => setField("mcc", e.target.value.replace(/\D/g, "").slice(0, 4))} mono
                placeholder="e.g. 5812" />
            </window.Field>
            <window.Field label="Currency" required>
              <Select value={vs.currency} onChange={(v) => setField("currency", v)}
                options={["CAD","USD","EUR","GBP","AUD","JPY","SGD","MXN"].map(c => ({ value: c, label: c }))} />
            </window.Field>
            <window.Field label="Country" required>
              <Select value={vs.country} onChange={(v) => setField("country", v)}
                options={["CA","US","MX","GB","DE","FR","AU","JP","SG","BR"].map(c => ({ value: c, label: c }))} />
            </window.Field>
            <window.Field label="Time zone">
              <Select value={vs.timezone} onChange={(v) => setField("timezone", v)}
                options={["America/Toronto","America/Vancouver","America/Edmonton","America/Halifax","America/New_York","America/Los_Angeles","UTC"].map(t => ({ value: t, label: t }))} />
            </window.Field>
          </FormGrid>
        )}

        {section === "ops" && (
          <FormGrid>
            <window.Field label="Settlement cut-off time" hint="Local time. Batches close at this hour.">
              <window.Input type="time" value={vs.cutoffTime} onChange={(e) => setField("cutoffTime", e.target.value)} mono />
            </window.Field>
            <window.Field label="Starting batch number">
              <window.Input value={vs.batchNumber} onChange={(e) => setField("batchNumber", e.target.value.replace(/\D/g, "").slice(0, 4))} mono />
            </window.Field>
            <window.Field label="Reversal window (hours)" hint="How long after auth a void/reversal is allowed.">
              <window.Input type="number" value={vs.reversalHours} onChange={(e) => setField("reversalHours", Number(e.target.value))} min={0} max={168} mono />
            </window.Field>
            <window.Field label="Network mode">
              <Select value={vs.networkMode} onChange={(v) => setField("networkMode", v)}
                options={[
                  { value: "online",  label: "Online only" },
                  { value: "mixed",   label: "Mixed (online + store-and-forward)" },
                  { value: "offline", label: "Offline only" },
                ]} />
            </window.Field>
            <window.Field label="Min transaction amount" hint={`In ${vs.currency}`}>
              <window.Input type="number" step="0.01" value={vs.minTxAmount} onChange={(e) => setField("minTxAmount", Number(e.target.value))} mono />
            </window.Field>
            <window.Field label="Max transaction amount" hint={`In ${vs.currency}`}>
              <window.Input type="number" step="1" value={vs.maxTxAmount} onChange={(e) => setField("maxTxAmount", Number(e.target.value))} mono />
            </window.Field>
            <window.Field label="Daily volume limit" hint={`In ${vs.currency}`}>
              <window.Input type="number" step="100" value={vs.dailyVolumeLimit} onChange={(e) => setField("dailyVolumeLimit", Number(e.target.value))} mono />
            </window.Field>
          </FormGrid>
        )}

        {section === "cards" && (
          <FormGrid>
            <window.Field label="Card schemes enabled" required full>
              <ChipMulti
                options={["Visa","Mastercard","AMEX","Discover","JCB","UnionPay","Interac"]}
                value={vs.cardSchemes}
                onChange={(v) => setField("cardSchemes", v)} />
            </window.Field>
            <window.Field label="EMV AIDs" hint="Comma-separated. The Application Identifiers the kernel will negotiate." full>
              <window.Input value={vs.emvAids} onChange={(e) => setField("emvAids", e.target.value)} mono />
            </window.Field>
            <window.Field label="Contactless limit" hint={`In ${vs.currency}. PIN required above this amount.`}>
              <window.Input type="number" step="1" value={vs.contactlessLimit} onChange={(e) => setField("contactlessLimit", Number(e.target.value))} mono />
            </window.Field>
            <window.Field label="CVV2 verification">
              <Toggle on={vs.cvv2} onChange={(v) => setField("cvv2", v)} />
            </window.Field>
            <window.Field label="AVS check">
              <Toggle on={vs.avs} onChange={(v) => setField("avs", v)} />
            </window.Field>
            <window.Field label="PIN bypass allowed" hint="Allow signature fallback when PIN is unavailable.">
              <Toggle on={vs.pinBypassAllowed} onChange={(v) => setField("pinBypassAllowed", v)} />
            </window.Field>
            <window.Field label="Manual PAN entry">
              <Toggle on={vs.manualEntryAllowed} onChange={(v) => setField("manualEntryAllowed", v)} />
            </window.Field>
          </FormGrid>
        )}

        {section === "features" && (
          <FormGrid>
            <window.Field label="Tip allowed">
              <Toggle on={vs.tipAllowed} onChange={(v) => setField("tipAllowed", v)} />
            </window.Field>
            <window.Field label="Cashback allowed">
              <Toggle on={vs.cashbackAllowed} onChange={(v) => setField("cashbackAllowed", v)} />
            </window.Field>
            <window.Field label="Refund allowed">
              <Toggle on={vs.refundAllowed} onChange={(v) => setField("refundAllowed", v)} />
            </window.Field>
            <window.Field label="Void allowed">
              <Toggle on={vs.voidAllowed} onChange={(v) => setField("voidAllowed", v)} />
            </window.Field>
            <window.Field label="Pre-authorization">
              <Toggle on={vs.preAuthAllowed} onChange={(v) => setField("preAuthAllowed", v)} />
            </window.Field>
            <window.Field label="Surcharge rate (%)" hint="Pass-on cost added to each transaction. 0 = no surcharge.">
              <window.Input type="number" step="0.1" value={vs.surchargeRate} onChange={(e) => setField("surchargeRate", Number(e.target.value))} mono />
            </window.Field>
            <window.Field label="DCC enabled" hint="Dynamic currency conversion for foreign cards.">
              <Toggle on={vs.dccEnabled} onChange={(v) => setField("dccEnabled", v)} />
            </window.Field>
            <window.Field label="Loyalty integration">
              <Toggle on={vs.loyaltyIntegration} onChange={(v) => setField("loyaltyIntegration", v)} />
            </window.Field>
          </FormGrid>
        )}

        {section === "security" && (
          <FormGrid>
            <window.Field label="Tokenization provider">
              <Select value={vs.tokenizationProvider} onChange={(v) => setField("tokenizationProvider", v)}
                options={["TOMS Vault","Visa VTS","Mastercard MDES","None"].map(o => ({ value: o, label: o }))} />
            </window.Field>
            <window.Field label="Key encryption method">
              <Select value={vs.encryption} onChange={(v) => setField("encryption", v)}
                options={["DUKPT","Master/Session","Fixed"].map(o => ({ value: o, label: o }))} />
            </window.Field>
            <window.Field label="Key index">
              <window.Input type="number" value={vs.keyIndex} onChange={(e) => setField("keyIndex", Number(e.target.value))} mono />
            </window.Field>
            <window.Field label="TLS version (min)">
              <Select value={vs.tlsVersion} onChange={(v) => setField("tlsVersion", v)}
                options={["1.2","1.3"].map(o => ({ value: o, label: `TLS ${o}` }))} />
            </window.Field>
            <window.Field label="Receipt header" full>
              <window.Input value={vs.receiptHeader} onChange={(e) => setField("receiptHeader", e.target.value)}
                placeholder="Optional — printed at the top of every receipt" />
            </window.Field>
            <window.Field label="Receipt footer" full>
              <window.Input value={vs.receiptFooter} onChange={(e) => setField("receiptFooter", e.target.value)} />
            </window.Field>
          </FormGrid>
        )}
      </div>
    </div>
  );
}

// ─── Form bits ────────────────────────────────────────────
function FormGrid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {React.Children.map(children, c => {
        // Honour the `full` prop so checkbox / multi rows span both columns.
        const full = c?.props?.full;
        return <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>{c}</div>;
      })}
    </div>
  );
}
function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)",
      border: "1px solid var(--color-border-default)", fontSize: 13,
      fontFamily: "inherit", background: "var(--bg2)", color: "var(--fg1)",
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 38, height: 20, borderRadius: 999, padding: 0,
      background: on ? "var(--color-primary-600)" : "var(--color-bg-3)",
      border: "1px solid",
      borderColor: on ? "var(--color-primary-600)" : "var(--color-border-default)",
      position: "relative", cursor: "pointer",
    }} aria-label={on ? "On" : "Off"}>
      <span style={{
        position: "absolute", top: 1, left: on ? 19 : 1,
        width: 16, height: 16, borderRadius: "50%",
        background: "white", transition: "left .15s ease",
      }} />
    </button>
  );
}
function ChipMulti({ options, value, onChange }) {
  const toggle = (v) => {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(o => {
        const on = value.includes(o);
        return (
          <button key={o} onClick={() => toggle(o)} style={{
            padding: "4px 12px", borderRadius: 999, fontSize: 12,
            background: on ? "var(--color-primary-50)" : "var(--bg2)",
            border: "1px solid",
            borderColor: on ? "var(--color-primary-500)" : "var(--color-border-default)",
            color: on ? "var(--color-primary-700)" : "var(--fg2)",
            fontWeight: on ? 500 : 400,
          }}>{o}</button>
        );
      })}
    </div>
  );
}
function KvMini({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      <span className="overline" style={{ fontSize: 9.5 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--fg1)", minWidth: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

// ─── Bulk import panel ─────────────────────────────────────
// File-driven path. Operator drops a CSV/XLSX, we mock-parse it, show a
// preview table with validation flags, and commit on confirm. Production
// would stream the rows through the same VarSheet validation pipeline as
// the single form before persisting.
function BulkImportPanel({ merchant, stores, onCommit }) {
  const [file, setFile] = useStateM(null);     // { name, size } | null
  const [phase, setPhase] = useStateM("idle"); // idle | parsing | parsed
  const [rows, setRows] = useStateM([]);

  const onPick = (f) => {
    if (!f) return;
    setFile({ name: f.name, size: f.size });
    setPhase("parsing");
    // Mock parse — pretend to chew on the file for a moment, then return a
    // canned set of rows so the preview shows realistic content. In real
    // life this is a streaming XLSX/CSV parser running locally.
    setTimeout(() => {
      const hq = stores.find(s => s.isHQ);
      const sample = [
        { row: 1, address: "402 St-Laurent Blvd, Montréal",  storeId: hq?.id,     mcc: "5812", currency: "CAD", schemes: "Visa,MC,Interac", valid: true },
        { row: 2, address: "5640 Av du Parc, Montréal",      storeId: hq?.id,     mcc: "5812", currency: "CAD", schemes: "Visa,MC,AMEX",    valid: true },
        { row: 3, address: "10 Rue de la Commune, Montréal", storeId: hq?.id,     mcc: "5812", currency: "CAD", schemes: "Visa,MC",         valid: true },
        { row: 4, address: "missing required column",         storeId: null,       mcc: "",     currency: "CAD", schemes: "Visa",            valid: false, error: "Missing MCC" },
        { row: 5, address: "92 Bloor St W, Toronto",          storeId: hq?.id,     mcc: "5942", currency: "CAD", schemes: "Visa,MC",         valid: true },
      ];
      setRows(sample);
      setPhase("parsed");
    }, 900);
  };

  const valid = rows.filter(r => r.valid).length;
  const invalid = rows.length - valid;

  const downloadTemplate = () => {
    window.showToast?.("Template download — coming in Phase 4.2", "info");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Help banner */}
      <div style={{
        padding: "10px 12px",
        background: "var(--color-info-50)",
        border: "1px solid color-mix(in oklab, var(--color-info-500) 22%, transparent)",
        borderRadius: "var(--radius-md)",
        display: "flex", alignItems: "flex-start", gap: 10,
        fontSize: 12, color: "var(--color-info-700)", lineHeight: 1.55,
      }}>
        <window.Ico name="info" size={14} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <b>Bulk upload</b> creates pending VarSheets in one go — TIDs are assigned automatically and each row joins as <b>pending installation</b>. Need the column layout?{" "}
          <button onClick={downloadTemplate} style={{
            color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 2, fontWeight: 500,
          }}>Download template (.xlsx)</button>
        </div>
      </div>

      {/* File picker */}
      {phase === "idle" && (
        <button onClick={() => onPick({ name: "Northbay-Q2-onboarding.xlsx", size: 24400 })} style={{
          padding: "40px 24px",
          border: "1.5px dashed var(--color-border-default)",
          borderRadius: 10,
          background: "var(--color-bg-3)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          width: "100%", cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-primary-500)";
          e.currentTarget.style.background = "var(--color-primary-50)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border-default)";
          e.currentTarget.style.background = "var(--color-bg-3)";
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: "var(--bg2)", color: "var(--fg2)",
            border: "1px solid var(--border-1)",
            display: "grid", placeItems: "center",
          }}>
            <window.Ico name="upload" size={18} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Drag a CSV / XLSX here, or click to browse</div>
          <div style={{ fontSize: 11.5, color: "var(--fg3)" }}>
            Up to 500 rows · column order matches the template
          </div>
        </button>
      )}

      {phase === "parsing" && file && (
        <div style={{
          padding: "16px",
          background: "var(--bg2)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Spinner size={16} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{file.name}</div>
            <div style={{ fontSize: 11, color: "var(--fg3)" }}>
              Parsing rows and validating against acquirer rules…
            </div>
          </div>
        </div>
      )}

      {phase === "parsed" && (
        <>
          {/* Summary */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10,
          }}>
            <KpiTile label="File" value={file.name} mono small />
            <KpiTile label="Rows"     value={rows.length} />
            <KpiTile label="Valid"    value={valid}   tone="success" />
            <KpiTile label="Errors"   value={invalid} tone={invalid > 0 ? "danger" : undefined} />
          </div>

          {/* Preview */}
          <div style={{ border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div className="table-wrap" style={{ maxHeight: 260, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", textAlign: "left",
                    position: "sticky", top: 0, zIndex: 1 }}>
                    {["Row","Address","MCC","Currency","Schemes","Valid?"].map(h => (
                      <th key={h} className="overline" style={{
                        padding: "8px 12px", fontSize: 10.5,
                        borderBottom: "1px solid var(--border-1)", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.row} style={{
                      borderBottom: "1px solid var(--color-border-subtle)",
                      background: !r.valid ? "var(--error-bg)" : "transparent",
                    }}>
                      <td style={{ padding: "8px 12px" }}><span className="mono num">{r.row}</span></td>
                      <td style={{ padding: "8px 12px" }}>{r.address}</td>
                      <td style={{ padding: "8px 12px" }}><span className="mono">{r.mcc || "—"}</span></td>
                      <td style={{ padding: "8px 12px" }}><span className="mono">{r.currency}</span></td>
                      <td style={{ padding: "8px 12px", fontSize: 11 }}>{r.schemes}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {r.valid ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 11, color: "var(--color-success-700)", fontWeight: 500 }}>
                            <window.Ico name="check" size={11} stroke={2.4} /> Valid
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 11, color: "var(--color-error-700)", fontWeight: 500 }} title={r.error}>
                            <window.Ico name="alert" size={11} /> {r.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: "var(--fg3)" }}>
              {invalid > 0
                ? <>Fix the highlighted rows in the source file, then re-upload — or click <b>Import valid only</b> to skip them.</>
                : <>All rows look good. Click <b>Import</b> to create {valid} pending VarSheet{valid === 1 ? "" : "s"}.</>}
            </span>
            <div style={{ flex: 1 }} />
            <window.Button ghost onClick={() => { setFile(null); setPhase("idle"); setRows([]); }}>Replace file</window.Button>
            <window.Button primary icon="check" disabled={valid === 0}
              onClick={() => onCommit(rows.filter(r => r.valid))}>
              {invalid > 0 ? `Import valid only · ${valid}` : `Import · ${valid}`}
            </window.Button>
          </div>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, sub, tone, mono, small }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: "var(--radius-md)",
      background: "var(--bg2)", border: "1px solid var(--border-1)",
    }}>
      <div className="overline" style={{ fontSize: 10 }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontSize: small ? 12 : 18, fontWeight: 500,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        color: tone === "success" ? "var(--success)"
            : tone === "danger"  ? "var(--color-error-700)"
            : "var(--fg1)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg3)" }}>{sub}</div>}
    </div>
  );
}

// ─── Install flow — enter activation code, resolve to SN/model ──
// Mock resolver: deterministic hash of the 6-digit code → SN + model.
// Production would hit a sales-tools / device-fulfillment API.
function resolveActivationCode(code) {
  const samples = [
    { sn: "N950-0288-7541", model: "N950" },
    { sn: "N950-0014-7912", model: "N950" },
    { sn: "S90-0822-3104",  model: "S90"  },
    { sn: "S60-0488-2284",  model: "S60"  },
    { sn: "N750-0099-1052", model: "N750" },
    { sn: "X800-0099-2018", model: "X800" },
  ];
  let h = 0; for (const c of code) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return samples[h % samples.length];
}

function InstallTerminalModal({ merchant, terminal, onClose, onConfirm }) {
  const store = (merchant.stores || []).find(s => s.id === terminal.storeId);
  const [code, setCode] = useStateM("");
  const [phase, setPhase] = useStateM("entering"); // entering | resolving | resolved | error
  const [resolved, setResolved] = useStateM(null);

  const lookup = () => {
    if (code.length !== 6) return;
    setPhase("resolving");
    setTimeout(() => {
      // Simulate a "no such code" error 1-in-20 to demonstrate the error path.
      if (code === "000000") {
        setPhase("error");
        return;
      }
      setResolved(resolveActivationCode(code));
      setPhase("resolved");
    }, 600);
  };

  // Auto-trigger lookup when the user finishes typing 6 digits.
  useEffectM(() => {
    if (code.length === 6 && phase === "entering") lookup();
  }, [code]);

  const onCodeChange = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setPhase("entering");
    setResolved(null);
  };

  return (
    <window.Modal open onClose={onClose} width={560}
      title="Bind device"
      subtitle="Enter the 6-digit authorization code shown on the terminal screen. The system will match it to a device and bind that SN to this VarSheet."
      footer={
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button primary icon="check"
            disabled={phase !== "resolved"}
            onClick={() => onConfirm(resolved)}>
            Confirm install
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* VarSheet info */}
        <div style={{
          padding: "10px 12px",
          background: "var(--bg2)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--radius-md)",
          display: "grid", gridTemplateColumns: "100px minmax(0, 1fr)", rowGap: 6, columnGap: 12,
        }}>
          <KvLabel>Merchant No.</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 12 }}>{merchant.mid}</span></KvValue>
          <KvLabel>Terminal No.</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{terminal.tid}</span></KvValue>
          <KvLabel>Store</KvLabel>
          <KvValue>{store?.name || "—"}{store?.isHQ ? " (HQ)" : ""}</KvValue>
        </div>

        {/* Big code input */}
        <div>
          <label style={{ fontSize: 12, color: "var(--fg2)", fontWeight: 500, display: "block", marginBottom: 6 }}>
            Authorization code
          </label>
          <input
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="000000"
            autoFocus
            inputMode="numeric"
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 28,
              fontFamily: "var(--font-family-mono)",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textAlign: "center",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid",
              borderColor: phase === "error" ? "var(--color-error-500)"
                        : phase === "resolved" ? "var(--color-success-500)"
                                                : "var(--color-border-default)",
              background: "var(--bg2)",
              color: "var(--fg1)",
              outline: "none",
            }} />
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg3)" }}>
            The 6-digit authorization code appears on the terminal screen after first power-on.
          </div>
        </div>

        {/* Resolution feedback */}
        {phase === "resolving" && (
          <div style={{
            padding: "12px 14px",
            background: "var(--color-info-50)",
            border: "1px solid color-mix(in oklab, var(--color-info-500) 22%, transparent)",
            borderRadius: "var(--radius-md)",
            fontSize: 12.5, color: "var(--color-info-700)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Spinner size={12} /> Looking up the authorization code…
          </div>
        )}
        {phase === "error" && (
          <div style={{
            padding: "10px 12px",
            background: "var(--error-bg)",
            border: "1px solid color-mix(in oklab, var(--color-error-500) 22%, transparent)",
            borderRadius: "var(--radius-md)",
            fontSize: 12.5, color: "var(--color-error-700)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <window.Ico name="alert" size={13} />
            No device matches that authorization code. Re-check the screen and try again.
          </div>
        )}
        {phase === "resolved" && resolved && (
          <div style={{
            padding: "12px 14px",
            background: "oklch(96% 0.03 152)",
            border: "1px solid color-mix(in oklab, var(--color-success-500) 25%, transparent)",
            borderRadius: "var(--radius-md)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5,
              fontWeight: 600, color: "var(--color-success-700)" }}>
              <window.Ico name="check" size={13} stroke={2.5} /> Device matched
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "100px minmax(0, 1fr)", rowGap: 5, columnGap: 12 }}>
              <KvLabel>Serial number</KvLabel>
              <KvValue><span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{resolved.sn}</span></KvValue>
              <KvLabel>Model</KvLabel>
              <KvValue><span className="mono" style={{ fontSize: 12 }}>{resolved.model}</span></KvValue>
            </div>
          </div>
        )}
      </div>
    </window.Modal>
  );
}

// ─── Unbind flow — confirm + payment-app warning ──────────
function UnbindTerminalModal({ merchant, terminal, onClose, onConfirm }) {
  const store = (merchant.stores || []).find(s => s.id === terminal.storeId);
  return (
    <window.Modal open onClose={onClose} width={560}
      title={`Unbind terminal ${terminal.sn}?`}
      subtitle="Unbinding clears the device from this VarSheet. The TID stays — you can install a different device on it later."
      footer={
        <>
          <window.Button onClick={onClose}>Cancel</window.Button>
          <window.Button danger icon="link" onClick={onConfirm}>
            Unbind device
          </window.Button>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Warning */}
        <div style={{
          padding: "12px 14px",
          background: "var(--warning-bg)",
          border: "1px solid color-mix(in oklab, var(--color-warning-500) 30%, transparent)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <window.Ico name="alert" size={15} style={{ color: "var(--color-warning-700)", marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: "var(--color-warning-700)", lineHeight: 1.55 }}>
            <b>End the payment session first.</b> Ask the merchant to close any open transaction on the terminal before you confirm — in-flight settlements may fail otherwise.
          </div>
        </div>

        {/* VarSheet + device snapshot */}
        <div style={{
          padding: "10px 12px",
          background: "var(--bg2)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--radius-md)",
          display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", rowGap: 6, columnGap: 14,
        }}>
          <KvLabel>Merchant No.</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 12 }}>{merchant.mid}</span></KvValue>
          <KvLabel>Terminal No.</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{terminal.tid}</span></KvValue>
          <KvLabel>Store</KvLabel>
          <KvValue>{store?.name || "—"}{store?.isHQ ? " (HQ)" : ""}</KvValue>
          <KvLabel>Serial number</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 12 }}>{terminal.sn}</span></KvValue>
          <KvLabel>Model</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 12 }}>{terminal.model}</span></KvValue>
          <KvLabel>Last seen</KvLabel>
          <KvValue><span className="mono" style={{ fontSize: 11.5, color: "var(--fg3)" }}>{terminal.lastSeen || "—"}</span></KvValue>
        </div>
      </div>
    </window.Modal>
  );
}

function Spinner({ size = 14 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      border: `${Math.max(1.5, Math.round(size / 9))}px solid var(--color-bg-3)`,
      borderTopColor: "var(--color-primary-600)",
      animation: "spin .8s linear infinite",
      display: "inline-block",
    }} />
  );
}

// ─── New merchant screen (full page — same shell as new app) ──
function NewMerchantScreen({ onClose, onSave }) {
  return (
    <MerchantFormModal mode="new" merchant={null}
      onClose={onClose}
      onSave={onSave} />
  );
}

// ─── Bits ──────────────────────────────────────────────────
function MerchantAvatar({ name, size = 32 }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  // Deterministic hue from name.
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  const hue = h % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22, flexShrink: 0,
      background: `linear-gradient(135deg, oklch(60% 0.13 ${hue}), oklch(46% 0.16 ${(hue + 28) % 360}))`,
      color: "#fff",
      display: "grid", placeItems: "center",
      fontSize: size * 0.38, fontWeight: 600,
      fontFamily: "Geist, system-ui, sans-serif",
      letterSpacing: "-0.02em",
    }}>{initials}</div>
  );
}

// ─── TagFilterDropdown — multi-select chip popover ─────────
// Compact filter button that opens a checkbox list popover. Used in any
// merchant list to filter by tag. Multi-select with OR semantics.
//
//   <TagFilterDropdown options={allTags} value={tagFilter} onChange={setTagFilter} />
//
// Exposed on window so screens.jsx / pull-wizard.jsx can reuse it.
function TagFilterDropdown({ options, value, onChange, label = "Tag", size = "md" }) {
  const [open, setOpen] = useStateM(false);
  const rootRef = useRefM(null);
  useEffectM(() => {
    if (!open) return;
    const onDoc = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const sel = value || [];
  const toggle = (t) => {
    if (sel.includes(t)) onChange(sel.filter(x => x !== t));
    else onChange([...sel, t]);
  };
  const pad = size === "sm" ? "5px 9px" : "7px 10px";
  const summary = sel.length === 0
    ? `All ${label.toLowerCase()}s`
    : sel.length === 1
      ? sel[0]
      : `${sel[0]} +${sel.length - 1}`;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        padding: pad,
        borderRadius: "var(--radius-sm)",
        border: "1px solid",
        borderColor: sel.length > 0 ? "var(--color-primary-500)" : "var(--color-border-default)",
        background: sel.length > 0 ? "var(--color-primary-50)" : "var(--bg2)",
        color: sel.length > 0 ? "var(--color-primary-700)" : "var(--fg1)",
        fontSize: 12, fontWeight: sel.length > 0 ? 500 : 400,
        display: "inline-flex", alignItems: "center", gap: 6,
        cursor: "pointer", whiteSpace: "nowrap",
      }}>
        <window.Ico name="filter" size={11} />
        <span>{summary}</span>
        <window.Ico name="chevdown" size={10} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          minWidth: 220, maxWidth: 280, zIndex: 30,
          background: "var(--bg2)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-2, 0 8px 24px oklch(0% 0 0 / 0.10))",
          padding: 4,
          maxHeight: 320, overflowY: "auto",
        }}>
          <div style={{
            padding: "6px 10px 4px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
            color: "var(--fg3)", fontWeight: 600,
          }}>
            <span>{label}s</span>
            {sel.length > 0 && (
              <button onClick={() => onChange([])} style={{
                fontSize: 10, color: "var(--color-primary-700)", fontWeight: 500,
                textTransform: "none", letterSpacing: 0,
              }}>Clear</button>
            )}
          </div>
          {options.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--fg3)" }}>
              No tags available.
            </div>
          ) : options.map(t => {
            const on = sel.includes(t);
            return (
              <button key={t} onClick={() => toggle(t)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", width: "100%",
                background: on ? "var(--color-primary-50)" : "transparent",
                color: on ? "var(--color-primary-700)" : "var(--fg1)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12, fontWeight: on ? 500 : 400,
                textAlign: "left", cursor: "pointer",
              }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--color-bg-3)"; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                <span style={{
                  width: 14, height: 14, flexShrink: 0,
                  borderRadius: 3,
                  border: "1.5px solid",
                  borderColor: on ? "var(--color-primary-500)" : "var(--color-border-default)",
                  background: on ? "var(--color-primary-500)" : "var(--bg1)",
                  display: "grid", placeItems: "center",
                  color: "#fff",
                }}>
                  {on && <window.Ico name="check" size={9} stroke={3} />}
                </span>
                <span>{t}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TagChip({ t }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 999,
      background: "var(--color-bg-3)", color: "var(--fg2)",
      border: "1px solid var(--color-border-subtle)",
      fontSize: 11, fontWeight: 450,
    }}>{t}</span>
  );
}

// ─── Phone masking ─────────────────────────────────────────
// Privacy display for the merchant contact line — mask the middle of the
// number, keeping only the last two digits for recognition. (Email reuses
// the existing maskEmail helper above.)
function maskPhone(num) {
  const digits = String(num).replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  const visible = digits.slice(-2);
  return `••• ••• ••${visible}`;
}

// ─── Merchant contact meta row ─────────────────────────────
// Slot below the tags in the merchant detail header. Renders address,
// phone (cc + number), and email as a single dotted-separated metadata
// strip. Phone + email are privacy-masked. Each piece is hidden when
// empty so a brand-new merchant with only required fields still looks clean.
function MerchantContactMeta({ merchant }) {
  const parts = [];
  if (merchant.address) {
    parts.push(<span key="addr">{merchant.address}</span>);
  }
  if (merchant.phone) {
    const cc = merchant.phoneCountryCode ? `${merchant.phoneCountryCode} ` : "";
    parts.push(
      <span key="phone" className="mono" title="Hidden for privacy">{cc}{maskPhone(merchant.phone)}</span>
    );
  }
  if (merchant.email) {
    parts.push(
      <span key="email" className="mono" title="Hidden for privacy">{maskEmail(merchant.email)}</span>
    );
  }
  if (parts.length === 0) return null;
  return (
    <div style={{
      marginTop: 6,
      display: "flex", flexWrap: "wrap", alignItems: "center",
      gap: "4px 10px",
      fontSize: 11.5, color: "var(--color-text-tertiary)",
    }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.5 }}>·</span>}
          {p}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Active / Disabled status pill ─────────────────────────
// Shown in the detail-page header and in the list table for merchants
// whose MERCHANT contract has been disabled.
function MerchantStatusPill({ disabled }) {
  if (!disabled) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "1px 8px", borderRadius: 999,
        background: "var(--success-bg, oklch(96% 0.05 158))",
        color: "var(--success, oklch(42% 0.13 158))",
        border: "1px solid var(--color-border-subtle)",
        fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em",
        textTransform: "uppercase",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
        Active
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "1px 8px", borderRadius: 999,
      background: "var(--bg3)",
      color: "var(--fg3)",
      border: "1px solid var(--color-border-default)",
      fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em",
      textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      Disabled
    </span>
  );
}

// ─── Disabled banner ───────────────────────────────────────
// Sits at the top of every tab when the merchant's MERCHANT contract is
// in the "disabled" state. Reminds the operator what's blocked vs. what
// can still be done, and the downstream device-lock behavior.
function DisabledBanner({ onEnable }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px", marginBottom: 16,
      borderRadius: "var(--radius-md)",
      background: "var(--warning-bg, oklch(96% 0.05 80))",
      border: "1px solid var(--warning, oklch(74% 0.14 80))",
      color: "var(--color-text-primary)",
    }}>
      <window.Ico name="alert" size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Merchant is disabled.</div>
        <div style={{ color: "var(--fg2)" }}>
          New stores, terminals, device bindings and app changes are <b>blocked</b>.
          You can still <b>delete stores</b>, <b>unbind / delete terminals</b>, and
          <b> remove app assignments</b>. All downstream devices will be locked
          automatically on their next power-on. Re-enable from the Contracts tab
          to resume normal maintenance.
        </div>
      </div>
      <window.Button onClick={onEnable}>Re-enable</window.Button>
    </div>
  );
}

function KvLabel({ children }) {
  return <span className="overline" style={{ fontSize: 9.5, paddingTop: 2 }}>{children}</span>;
}
function KvValue({ children }) {
  return <span style={{ fontSize: 13, color: "var(--color-text-primary)", minWidth: 0 }}>{children}</span>;
}

function SummaryRow({ label, value, hint, tone }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      gap: 12, padding: "7px 0",
      borderBottom: "1px dashed var(--color-border-subtle)",
    }}>
      <div className="overline" style={{ fontSize: 10.5 }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <div className="mono num" style={{ fontSize: 16, fontWeight: 500,
          color: tone === "success" ? "var(--success)"
              : tone === "warning" ? "var(--warning)"
              : "var(--fg1)" }}>{value}</div>
        {hint && <div style={{ fontSize: 10.5, color: "var(--fg3)" }}>{hint}</div>}
      </div>
    </div>
  );
}

Object.assign(window, {
  MerchantsListScreen, MerchantDetailScreen, MerchantFormModal,
  NewMerchantScreen, findMerchantById, bumpMerchants,
  // Contract / app / operator helpers exposed for the sibling
  // merchant-apps.jsx + merchant-contracts.jsx modules.
  getMerchantContract, isMerchantDisabled, setMerchantDisabled,
  hasPortalContract, maskEmail, formatContractExpiry,
  defaultMerchantContracts, useMerchantTick,
  // Contract catalog + validators.
  CONTRACT_CATALOG, getContractDef, isValidEmail, COUNTRY_PHONE_CODES,
  // Shared visual atoms used across the merchant tab files.
  MerchantAvatar, TagChip, TagFilterDropdown, KvLabel, KvValue, SummaryRow,
});
