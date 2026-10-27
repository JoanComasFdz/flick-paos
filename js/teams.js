// Barça's possible rivals in 2026-27, for the rival picker and the team badges.
// Checked on 27 Oct 2026 against Wikipedia's 2026-27 La Liga and Champions
// League pages. Update `comps` each season. Any other rival (e.g. a Copa del
// Rey team) can still be typed by hand.
//
// name:    shown and saved as the rival (Spanish).
// aliases: other names the search and the badge lookup recognise.
// code, colors, text, accent: the badge (one colour = plain, two = stripes).

export const COMPETITIONS = [
  { id: "laliga", label: "LaLiga 2026-27" },
  { id: "ucl", label: "Champions League 2026-27" },
  // Easter egg: only found by searching for it, never in the full list.
  { id: "cartoon", label: "Campeones: Oliver y Benji", hidden: true },
];

export const TEAMS = [
  // LaLiga 2026-27 (Barça's 19 rivals). Atlético, Real Madrid and Real Sociedad are also in the 2027 Supercopa.
  { name: "Alavés", aliases: ["deportivo alaves"], comps: ["laliga"], code: "ALA", colors: ["#0761AF", "#FFFFFF"], text: "#FFFFFF", accent: "#0761AF" },
  { name: "Athletic Club", aliases: ["athletic bilbao", "athletic", "bilbao"], comps: ["laliga"], code: "ATH", colors: ["#E2231A", "#FFFFFF"], text: "#111111", accent: "#111111" },
  { name: "Atlético de Madrid", aliases: ["atletico madrid", "atletico", "atleti"], comps: ["laliga", "ucl"], code: "ATM", colors: ["#CB3524", "#FFFFFF"], text: "#FFFFFF", accent: "#272E61" },
  { name: "Celta", aliases: ["celta de vigo", "celta vigo"], comps: ["laliga"], code: "CEL", colors: ["#8AC3EE"], text: "#FFFFFF", accent: "#E5254E" },
  { name: "Deportivo", aliases: ["deportivo de la coruna", "deportivo la coruna", "depor"], comps: ["laliga"], code: "DEP", colors: ["#1B4D9A", "#FFFFFF"], text: "#FFFFFF", accent: "#1B4D9A" },
  { name: "Elche", aliases: [], comps: ["laliga"], code: "ELC", colors: ["#FFFFFF"], text: "#05642C", accent: "#05642C" },
  { name: "Espanyol", aliases: ["rcd espanyol"], comps: ["laliga"], code: "ESP", colors: ["#007FC8", "#FFFFFF"], text: "#FFFFFF", accent: "#007FC8" },
  { name: "Getafe", aliases: [], comps: ["laliga"], code: "GET", colors: ["#005999"], text: "#FFFFFF", accent: "#FFFFFF" },
  { name: "Levante", aliases: [], comps: ["laliga"], code: "LEV", colors: ["#004F9F", "#B4053F"], text: "#FFFFFF", accent: "#B4053F" },
  { name: "Málaga", aliases: ["malaga cf"], comps: ["laliga"], code: "MAL", colors: ["#5AB4E5", "#FFFFFF"], text: "#FFFFFF", accent: "#003A70" },
  { name: "Osasuna", aliases: [], comps: ["laliga"], code: "OSA", colors: ["#D91A21"], text: "#FFFFFF", accent: "#0A346F" },
  { name: "Racing de Santander", aliases: ["racing santander", "racing"], comps: ["laliga"], code: "RAC", colors: ["#FFFFFF"], text: "#00843D", accent: "#00843D" },
  { name: "Rayo Vallecano", aliases: ["rayo"], comps: ["laliga"], code: "RAY", colors: ["#FFFFFF"], text: "#E53027", accent: "#E53027" },
  { name: "Real Betis", aliases: ["betis"], comps: ["laliga", "ucl"], code: "BET", colors: ["#00954C", "#FFFFFF"], text: "#FFFFFF", accent: "#00954C" },
  { name: "Real Madrid", aliases: ["r. madrid", "r madrid"], comps: ["laliga", "ucl"], code: "RMA", colors: ["#FFFFFF"], text: "#00529F", accent: "#FEBE10" },
  { name: "Real Sociedad", aliases: ["la real", "sociedad"], comps: ["laliga"], code: "RSO", colors: ["#0067B1", "#FFFFFF"], text: "#FFFFFF", accent: "#0067B1" },
  { name: "Sevilla", aliases: ["sevilla fc"], comps: ["laliga"], code: "SEV", colors: ["#FFFFFF"], text: "#D71920", accent: "#D71920" },
  { name: "Valencia", aliases: ["valencia cf"], comps: ["laliga"], code: "VCF", colors: ["#FFFFFF"], text: "#111111", accent: "#EE7814" },
  { name: "Villarreal", aliases: [], comps: ["laliga", "ucl"], code: "VIL", colors: ["#FFE667"], text: "#005187", accent: "#005187" },

  // Champions League 2026-27 league phase (Barça's opponents in it: City, PSG, Aston Villa, Sporting, Feyenoord, Galatasaray, Como, Sabah).
  { name: "AEK Atenas", aliases: ["aek athens", "aek"], comps: ["ucl"], code: "AEK", colors: ["#FFD200"], text: "#111111", accent: "#111111" },
  { name: "Arsenal", aliases: [], comps: ["ucl"], code: "ARS", colors: ["#EF0107"], text: "#FFFFFF", accent: "#FFFFFF" },
  { name: "Aston Villa", aliases: ["villa"], comps: ["ucl"], code: "AVL", colors: ["#670E36"], text: "#95BFE5", accent: "#95BFE5" },
  { name: "Bayern de Múnich", aliases: ["bayern munich", "bayern munchen", "bayern"], comps: ["ucl"], code: "BAY", colors: ["#DC052D"], text: "#FFFFFF", accent: "#0066B2" },
  { name: "Bodø/Glimt", aliases: ["bodo glimt", "bodo/glimt", "bodo"], comps: ["ucl"], code: "BOD", colors: ["#FFE500"], text: "#111111", accent: "#111111" },
  { name: "Borussia Dortmund", aliases: ["dortmund", "bvb"], comps: ["ucl"], code: "BVB", colors: ["#FDE100"], text: "#111111", accent: "#111111" },
  { name: "Club Brujas", aliases: ["club brugge", "brugge", "brujas"], comps: ["ucl"], code: "BRU", colors: ["#0069B4", "#000000"], text: "#FFFFFF", accent: "#0069B4" },
  { name: "Como", aliases: ["como 1907"], comps: ["ucl"], code: "COM", colors: ["#003A70"], text: "#FFFFFF", accent: "#FFFFFF" },
  { name: "Fenerbahçe", aliases: ["fenerbahce"], comps: ["ucl"], code: "FEN", colors: ["#163962", "#FFED00"], text: "#FFFFFF", accent: "#163962" },
  { name: "Feyenoord", aliases: [], comps: ["ucl"], code: "FEY", colors: ["#E30613", "#FFFFFF"], text: "#FFFFFF", accent: "#111111" },
  { name: "Galatasaray", aliases: ["gala"], comps: ["ucl"], code: "GAL", colors: ["#A90432", "#FDB912"], text: "#FFFFFF", accent: "#A90432" },
  { name: "Inter de Milán", aliases: ["inter milan", "internazionale", "inter"], comps: ["ucl"], code: "INT", colors: ["#0068A8", "#111111"], text: "#FFFFFF", accent: "#111111" },
  { name: "LASK", aliases: ["lask linz"], comps: ["ucl"], code: "LASK", colors: ["#111111", "#FFFFFF"], text: "#FFFFFF", accent: "#111111" },
  { name: "Lens", aliases: ["rc lens"], comps: ["ucl"], code: "RCL", colors: ["#FFE500", "#E2001A"], text: "#FFFFFF", accent: "#E2001A" },
  { name: "Lille", aliases: ["losc"], comps: ["ucl"], code: "LIL", colors: ["#E01E13"], text: "#FFFFFF", accent: "#24216A" },
  { name: "Liverpool", aliases: [], comps: ["ucl"], code: "LIV", colors: ["#C8102E"], text: "#FFFFFF", accent: "#F6EB61" },
  { name: "Manchester City", aliases: ["man city", "city"], comps: ["ucl"], code: "MCI", colors: ["#6CABDD"], text: "#FFFFFF", accent: "#1C2C5B" },
  { name: "Manchester United", aliases: ["man united", "man utd", "united"], comps: ["ucl"], code: "MUN", colors: ["#DA291C"], text: "#FFFFFF", accent: "#FBE122" },
  { name: "Nápoles", aliases: ["napoli", "napoles"], comps: ["ucl"], code: "NAP", colors: ["#12A0D7"], text: "#FFFFFF", accent: "#FFFFFF" },
  { name: "Oporto", aliases: ["porto", "fc porto"], comps: ["ucl"], code: "POR", colors: ["#00428C", "#FFFFFF"], text: "#FFFFFF", accent: "#00428C" },
  { name: "Paris Saint-Germain", aliases: ["psg", "paris sg", "paris"], comps: ["ucl"], code: "PSG", colors: ["#004170"], text: "#FFFFFF", accent: "#DA291C" },
  { name: "PSV Eindhoven", aliases: ["psv"], comps: ["ucl"], code: "PSV", colors: ["#ED1C24", "#FFFFFF"], text: "#FFFFFF", accent: "#ED1C24" },
  { name: "RB Leipzig", aliases: ["leipzig"], comps: ["ucl"], code: "RBL", colors: ["#FFFFFF"], text: "#DD0741", accent: "#001F47" },
  { name: "Roma", aliases: ["as roma"], comps: ["ucl"], code: "ROM", colors: ["#8E1F2F"], text: "#F0BC42", accent: "#F0BC42" },
  { name: "Sabah", aliases: ["sabah fc"], comps: ["ucl"], code: "SAB" },
  { name: "Shakhtar Donetsk", aliases: ["shakhtar"], comps: ["ucl"], code: "SHA", colors: ["#F26522", "#000000"], text: "#FFFFFF", accent: "#F26522" },
  { name: "Slavia de Praga", aliases: ["slavia prague", "slavia praga", "slavia"], comps: ["ucl"], code: "SLA", colors: ["#FFFFFF", "#D2232A"], text: "#FFFFFF", accent: "#D2232A" },
  { name: "Slovan Bratislava", aliases: ["slovan"], comps: ["ucl"], code: "SLO", colors: ["#6CB4E4"], text: "#FFFFFF", accent: "#0B2A5B" },
  { name: "Sporting de Portugal", aliases: ["sporting cp", "sporting lisboa", "sporting"], comps: ["ucl"], code: "SCP", colors: ["#008057", "#FFFFFF"], text: "#FFFFFF", accent: "#008057" },
  { name: "Stuttgart", aliases: ["vfb stuttgart"], comps: ["ucl"], code: "VFB", colors: ["#FFFFFF"], text: "#E32219", accent: "#E32219" },
  { name: "Viking", aliases: ["viking fk"], comps: ["ucl"], code: "VIK", colors: ["#002F6C"], text: "#FFFFFF", accent: "#FFFFFF" },

  // Easter egg.
  { name: "Dream Team", aliases: ["oliver y benji", "oliver", "benji", "campeones", "captain tsubasa", "tsubasa"], comps: ["cartoon"], code: "DT", colors: ["#FFFFFF", "#1E5BB8"], text: "#FFFFFF", accent: "#E4002B" },

  // Badges only: past or possible rivals not in a 2026-27 list.
  { name: "Girona", aliases: [], comps: [], code: "GIR", colors: ["#CD2534", "#FFFFFF"], text: "#FFFFFF", accent: "#CD2534" },
  { name: "Mallorca", aliases: [], comps: [], code: "MLL", colors: ["#E20613"], text: "#FFFFFF", accent: "#111111" },
  { name: "Real Oviedo", aliases: ["oviedo"], comps: [], code: "OVI", colors: ["#0055A5"], text: "#FFFFFF", accent: "#FFFFFF" },
  { name: "Las Palmas", aliases: [], comps: [], code: "LPA", colors: ["#FFE400"], text: "#0055A5", accent: "#0055A5" },
  { name: "Leganés", aliases: [], comps: [], code: "LEG", colors: ["#1B4A9C", "#FFFFFF"], text: "#FFFFFF", accent: "#1B4A9C" },
  { name: "Valladolid", aliases: [], comps: [], code: "VLL", colors: ["#5C2D82", "#FFFFFF"], text: "#FFFFFF", accent: "#5C2D82" },
  { name: "Juventus", aliases: ["juve"], comps: [], code: "JUV", colors: ["#111111", "#FFFFFF"], text: "#FFFFFF", accent: "#111111" },
  { name: "Milan", aliases: ["ac milan"], comps: [], code: "MIL", colors: ["#FB090B", "#111111"], text: "#FFFFFF", accent: "#111111" },
  { name: "Benfica", aliases: [], comps: [], code: "BEN", colors: ["#E83030"], text: "#FFFFFF", accent: "#FFFFFF" },
  { name: "Chelsea", aliases: [], comps: [], code: "CHE", colors: ["#034694"], text: "#FFFFFF", accent: "#FFFFFF" },
];

/** Lower case, no accents, single spaces: for matching what people type. */
export function normalize(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const searchKeys = (team) => [team.name, ...team.aliases].map(normalize);

/**
 * The team a rival name refers to: an exact name or alias first, then the
 * longest alias contained in it ("Real Madrid CF" → Real Madrid). Null when unknown.
 */
export function findTeam(name) {
  const n = normalize(name);
  if (!n) return null;
  const exact = TEAMS.find((t) => searchKeys(t).includes(n));
  if (exact) return exact;
  let best = null;
  let bestLength = 0;
  for (const t of TEAMS) {
    for (const key of searchKeys(t)) {
      if (key.length > bestLength && new RegExp(`\\b${escapeRegExp(key)}\\b`).test(n)) {
        best = t;
        bestLength = key.length;
      }
    }
  }
  return best;
}

const hiddenComps = new Set(COMPETITIONS.filter((c) => c.hidden).map((c) => c.id));

/**
 * Teams whose name or alias contains every word of the query, in competition
 * order. A hidden competition's teams need a query of 3 letters or more.
 */
export function searchTeams(query) {
  const words = normalize(query).split(" ").filter(Boolean);
  const longEnough = words.join("").length >= 3;
  return TEAMS.filter((t) => t.comps.length
    && (longEnough || !t.comps.every((c) => hiddenComps.has(c)))
    && words.every((w) => searchKeys(t).some((k) => k.includes(w))));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}
