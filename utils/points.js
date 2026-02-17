// point_niveau mapping: L1=10, L2=10*50, L3=10*50*50, M1=10*50^3, M2=10*50^4
function calcPointNiveau(niveau) {
  if (!niveau) return 0;
  const map = {
    'L1': 0,
    'L2': 1,
    'L3': 2,
    'M1': 3,
    'M2': 4
  };
  // Normalise
  const key = niveau.toUpperCase().replace(/\s+/g, '');
  const exponent = map[key];
  if (exponent === undefined) {
    // Si texte libre, essaye de reconnaître L1..M2, sinon 0
    return 0;
  }
  return 10 * Math.pow(50, exponent);
}

// point for durations given in months: 1mois=3, 2mois=3*3 = 3^2, etc.
// Accept durations like "3", "3mois", "3 months"
function parseMonths(duree) {
  if (!duree) return 0;
  const s = String(duree).toLowerCase();
  const m = s.match(/(\d+)/);
  if (!m) return 0;
  return parseInt(m[1], 10);
}

function calcPointByMonths(months) {
  if (!months || months <= 0) return 0;
  return Math.pow(3, months);
}

module.exports = {
  calcPointNiveau,
  parseMonths,
  calcPointByMonths
};