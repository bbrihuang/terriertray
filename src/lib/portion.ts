/**
 * Turns BU's serving text ("1 each", "1/8 cut", "4 ozw") into words a student uses in line
 * ("1 muffin", "1 slice", "4 oz on a plate"). Display only: nutrition math still uses the
 * official serving, and `servings` multiplies it exactly as before.
 *
 * BU halls serve on plates, bowls and mini bowls. Assumed: a mini bowl holds a small side or
 * soup up to about 5 fl oz / ½ cup; a bowl holds soup, stew or cereal-style dishes beyond that.
 */
export type Dish = "plate" | "bowl" | "mini bowl" | "cup";
export type Portion = { amount: string; dish: Dish | null };

type Item = { name: string; servingText: string | null };

// Name keyword -> countable noun [singular, plural]. First match wins, so specific beats generic.
const NOUNS: [RegExp, string, string, Dish?][] = [
  [/\bbowl\b/i, "bowl", "bowls", "bowl"],
  [/cobbler|crisp\b|br[uû]l[eé]e|pudding|mousse|parfait|trifle|fruit cup/i, "mini bowl", "mini bowls", "mini bowl"],
  [/juice|smoothie|lemonade/i, "cup", "cups", "cup"],
  [/pizza|flatbread/i, "slice", "slices"],
  [/donut bites?/i, "bite", "bites"],
  [/pancake/i, "pancake", "pancakes"],
  [/waffle/i, "waffle", "waffles"],
  [/cupcake/i, "cupcake", "cupcakes"],
  [/brownie/i, "brownie", "brownies"],
  [/blondie/i, "blondie", "blondies"],
  [/\bbars?\b|crispy treat/i, "bar", "bars"],
  [/cake|focaccia|bread\b|french toast|\btoast\b|loaf|pie\b|quiche|lasagna|tart\b|torte/i, "slice", "slices"],
  [/cookie/i, "cookie", "cookies"],
  [/muffin/i, "muffin", "muffins"],
  [/donut|doughnut/i, "donut", "donuts"],
  [/rangoon|dumpling|potsticker|gyoza|egg roll|spring roll/i, "piece", "pieces"],
  [/egg\b|eggs\b/i, "egg", "eggs"],
  [/tender|strip/i, "tender", "tenders"],
  [/nugget/i, "nugget", "nuggets"],
  [/wing/i, "wing", "wings"],
  [/meatball/i, "meatball", "meatballs"],
  [/kofta|kebab|skewer/i, "skewer", "skewers"],
  [/sushi|maki/i, "piece", "pieces"],
  [/croissant/i, "croissant", "croissants"],
  [/bagel/i, "bagel", "bagels"],
  [/biscuit/i, "biscuit", "biscuits"],
  [/\broll|\bbun\b|brioche/i, "roll", "rolls"],
  [/taco/i, "taco", "tacos"],
  [/burrito/i, "burrito", "burritos"],
  [/wrap/i, "wrap", "wraps"],
  [/sandwich|\bsub\b|panini|ciabatta|burger|melt\b|cheesesteak|grilled cheese|banh mi|torta|hoagie|po.?boy/i, "sandwich", "sandwiches"],
  [/hot dog/i, "hot dog", "hot dogs"],
  [/quesadilla/i, "quesadilla", "quesadillas"],
  [/drumstick/i, "drumstick", "drumsticks"],
  [/\bchop\b/i, "chop", "chops"],
  [/falafel/i, "falafel", "falafel"],
  [/cannoli/i, "cannoli", "cannoli"],
  [/churro/i, "churro", "churros"],
  [/baguette/i, "baguette", "baguettes"],
  [/baked .*potato/i, "potato", "potatoes"],
  [/baklava/i, "piece", "pieces"],
  [/macaroon/i, "macaroon", "macaroons"],
  [/corn on the cob/i, "ear of corn", "ears of corn"],
  [/fresca|lemonade/i, "cup", "cups", "cup"],
  [/\bflan\b/i, "mini bowl", "mini bowls", "mini bowl"],
  [/tortilla/i, "tortilla", "tortillas"],
  [/breadstick/i, "breadstick", "breadsticks"],
  [/salmon|\bfish\b|cod\b|haddock|tilapia/i, "fillet", "fillets"],
  [/hash brown/i, "patty", "patties"],
  [/frittata|casserole|moussaka|tres leches/i, "slice", "slices"],
  [/calzone/i, "calzone", "calzones"],
  [/naan/i, "naan", "naan"],
  [/sloppy joe/i, "sandwich", "sandwiches"],
  [/sausage/i, "link", "links"],
  [/wedge/i, "wedge", "wedges"],
  [/pastry|danish|scone|turnover/i, "pastry", "pastries"],
  [/nori|sheet/i, "sheet", "sheets"],
  [/^(fresh |whole )?(apple|banana|orange|pear|peach|plum)s?$/i, "piece of fruit", "pieces of fruit"],
];

// Units that already name a countable thing.
const COUNT_UNITS: Record<string, [string, string]> = {
  slice: ["slice", "slices"], cookie: ["cookie", "cookies"], muffin: ["muffin", "muffins"], link: ["link", "links"],
  patty: ["patty", "patties"], roll: ["roll", "rolls"], sandwich: ["sandwich", "sandwiches"], wedge: ["wedge", "wedges"],
};

const BOWL_FOOD = /soup|stew|(?<!sweet )\bchili\b(?!\s*(sauce|oil|crisp|lime|glaze|garlic|chocolate))|chowder|bisque|broth|oatmeal|\boats\b|porridge|congee|curry|laksa|pho\b|ramen|sorbet|ice cream|gelato|yogurt|parfait|acai|cereal|mac (and|&) cheese/i;
const DRINK = /smoothie|shake|hot chocolate|cocoa|juice|lemonade|milk\b|coffee|latte|tea\b|cider/i;

const FRACTIONS: [number, string][] = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];

/** 0.5 -> "½", 1.5 -> "1½", 3 -> "3"; other decimals to one place. */
export function formatQty(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  if (rest < 1e-6) return String(whole);
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.02);
  if (frac) return `${whole || ""}${frac[1]}`;
  return String(Math.round(n * 10) / 10);
}

function parseQty(s: string): number | null {
  const [a, b] = s.split("/");
  const n = b === undefined ? Number(a) : Number(a) / Number(b);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const count = (n: number, [one, many]: [string, string] | readonly [string, string]) => `${formatQty(n)} ${n > 1 ? many : one}`;
const nounFor = (name: string) => NOUNS.find(([re]) => re.test(name));

/** Friendly amount for `servings` official servings of an item, plus the dish it goes in. */
export function portion(item: Item, servings = 1): Portion {
  const text = item.servingText?.trim();
  const m = text?.match(/^([\d.]+(?:\/\d+)?)\s*(.*)$/);
  const qty = m ? parseQty(m[1]!) : null;
  if (!m || qty === null) {
    if (BOWL_FOOD.test(item.name)) return { amount: count(servings, ["bowl", "bowls"]), dish: "bowl" };
    return { amount: count(servings, ["serving", "servings"]), dish: null };
  }
  const unit = m[2]!.toLowerCase().replace(/\.$/, "").trim();
  const name = item.name;
  const total = qty * servings;
  const keyed = nounFor(name);

  const halvable = keyed && /wrap|sandwich/.test(keyed[1]);
  // Fractions of a tray, loaf or sheet ("1/8 cut", "1/24 each"): one serving is one slice or bar.
  if (/^(cut|loaf|loaves)$/.test(unit) || (unit === "each" && qty < 1 && !halvable)) {
    return { amount: count(servings, keyed ? [keyed[1], keyed[2]] : ["slice", "slices"]), dish: "plate" };
  }
  const singular = unit.replace(/ies$/, "y").replace(/(ch|sh)es$/, "$1").replace(/s$/, "");
  const known = COUNT_UNITS[unit] ?? COUNT_UNITS[singular];
  if (known) return { amount: count(total, known), dish: "plate" };
  const drink = DRINK.test(name);
  const bowlFood = BOWL_FOOD.test(name);
  if (/^(each|piece|pieces|portion|serving|servings)$/.test(unit)) {
    if (keyed) return { amount: count(total, [keyed[1], keyed[2]]), dish: keyed[3] ?? "plate" };
    if (drink) return { amount: count(total, ["cup", "cups"]), dish: "cup" };
    if (bowlFood) return { amount: count(total, ["bowl", "bowls"]), dish: "bowl" };
    return { amount: count(total, ["serving", "servings"]), dish: "plate" };
  }

  // Measured foods: say the measure and the dish.
  if (/^(fl ?oz|fluid ounces?)$/.test(unit)) {
    if (drink) return { amount: `${formatQty(total)} fl oz`, dish: "cup" };
    if (total <= 2) return { amount: `${formatQty(total * 2)} tbsp`, dish: null }; // sauces and dressings
    return { amount: `${formatQty(total)} fl oz`, dish: total <= 5 ? "mini bowl" : "bowl" };
  }
  if (/^(tbsp|tablespoons?)$/.test(unit)) return { amount: `${formatQty(total)} tbsp`, dish: null };
  if (/^(cups?)$/.test(unit)) {
    const amount = `${formatQty(total)} cup${total > 1 ? "s" : ""}`;
    if (drink) return { amount, dish: "cup" };
    if (bowlFood) return { amount, dish: total <= 0.5 ? "mini bowl" : "bowl" };
    return { amount, dish: "plate" };
  }
  if (/^(ounces?|oz|ozw)$/.test(unit)) {
    if (total <= 1) return { amount: `${formatQty(total)} oz`, dish: null }; // toppings, cheese, crumbs
    return { amount: `${formatQty(total)} oz`, dish: bowlFood ? (total <= 5 ? "mini bowl" : "bowl") : "plate" };
  }
  if (/^(pounds?|lbs?)$/.test(unit)) return { amount: `${formatQty(total * 16)} oz`, dish: bowlFood ? "bowl" : "plate" };
  return { amount: `${formatQty(total)} ${unit}`, dish: null };
}

/** One-line label: "2 slices", "½ cup · mini bowl". */
export function portionLabel(item: Item, servings = 1): string {
  const { amount, dish } = portion(item, servings);
  return dish && !amount.includes(dish) ? `${amount} · ${dish}` : amount;
}
