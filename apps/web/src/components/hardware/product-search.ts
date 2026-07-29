export type ProductSearchEntry = {
  brandName?: string | null | undefined;
  categoryName?: string | null | undefined;
  keywords?: string[] | undefined;
  label: string;
  salesPriceCents?: number | undefined;
  sku?: string | null | undefined;
};

type SearchFieldKind = "brand" | "category" | "keyword" | "label" | "price" | "sku";

type SearchToken = {
  kind: SearchFieldKind;
  token: string;
  weight: number;
};

const FIELD_WEIGHTS: Record<SearchFieldKind, number> = {
  brand: 0.92,
  category: 0.84,
  keyword: 0.8,
  label: 1,
  price: 0.65,
  sku: 0.98,
};

const ALIAS_GROUPS = [
  ["basin", "sink"],
  ["toilet", "commode", "wc", "western"],
  ["tap", "faucet", "cock", "nal", "toti"],
  ["cistern", "flush", "tank"],
  ["elbow", "bend"],
  ["vanity", "cabinet"],
  ["geyser", "waterheater"],
] as const;

const ALIAS_LOOKUP = new Map<string, ReadonlySet<string>>(
  ALIAS_GROUPS.flatMap((group) => {
    const values = new Set(group);
    return group.map((token) => [token, values] as const);
  }),
);

export function normalizeProductSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/([\p{L}])([\p{N}])/gu, "$1 $2")
    .replace(/([\p{N}])([\p{L}])/gu, "$1 $2")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

export function rankProductSearchEntry(entry: ProductSearchEntry, rawQuery: string) {
  const query = normalizeProductSearchText(rawQuery);
  if (!query) return 0;

  const label = normalizeProductSearchText(entry.label);
  const sku = normalizeProductSearchText(entry.sku ?? "");
  const compactQuery = compact(query);
  const compactLabel = compact(label);
  const compactSku = compact(sku);

  if (label === query) return 1_500;
  if (sku && sku === query) return 1_450;
  if (compactLabel && compactLabel === compactQuery) return 1_400;
  if (compactSku && compactSku === compactQuery) return 1_350;
  if (label.startsWith(query)) return 1_300;
  if (sku && sku.startsWith(query)) return 1_250;
  if (label.includes(query)) return 1_200;

  const queryTokens = unique(query.split(" ").filter(Boolean));
  const candidateTokens = buildCandidateTokens(entry);
  if (!queryTokens.length || !candidateTokens.length) return 0;

  let matchedTokens = 0;
  let weightedSimilarityTotal = 0;
  let exactTokenMatches = 0;
  let prefixTokenMatches = 0;
  let labelTokenMatches = 0;

  for (const queryToken of queryTokens) {
    let bestSimilarity = 0;
    let bestWeightedSimilarity = 0;
    let bestKind: SearchFieldKind | null = null;

    for (const candidate of candidateTokens) {
      const similarity = tokenSimilarity(queryToken, candidate.token);
      const weightedSimilarity = similarity * candidate.weight;
      if (weightedSimilarity > bestWeightedSimilarity) {
        bestSimilarity = similarity;
        bestWeightedSimilarity = weightedSimilarity;
        bestKind = candidate.kind;
      }
    }

    if (bestWeightedSimilarity < minimumAcceptedSimilarity(queryToken)) continue;

    matchedTokens += 1;
    weightedSimilarityTotal += bestWeightedSimilarity;
    if (bestSimilarity === 1) exactTokenMatches += 1;
    if (bestSimilarity >= 0.9 && bestSimilarity < 1) prefixTokenMatches += 1;
    if (bestKind === "label") labelTokenMatches += 1;
  }

  const coverage = matchedTokens / queryTokens.length;
  if (matchedTokens === 0) return 0;
  if (queryTokens.length === 1 && coverage < 1) return 0;
  if (queryTokens.length > 1 && coverage < 0.66) return 0;

  const averageSimilarity = weightedSimilarityTotal / queryTokens.length;
  if (averageSimilarity < 0.48) return 0;

  const phraseSimilarity = stringSimilarity(compactQuery, compactLabel);
  const score = Math.round(
    averageSimilarity * 760
      + coverage * 260
      + exactTokenMatches * 45
      + prefixTokenMatches * 25
      + labelTokenMatches * 20
      + (phraseSimilarity >= 0.78 ? phraseSimilarity * 120 : 0),
  );

  return score >= 520 ? score : 0;
}

export function isStrongProductSearchMatch(score: number) {
  return score >= 700;
}

function buildCandidateTokens(entry: ProductSearchEntry) {
  const fields: Array<{ kind: SearchFieldKind; value: string }> = [
    { kind: "label", value: entry.label },
    { kind: "sku", value: entry.sku ?? "" },
    { kind: "brand", value: entry.brandName ?? "" },
    { kind: "category", value: entry.categoryName ?? "" },
    ...((entry.keywords ?? []).map((value) => ({ kind: "keyword" as const, value }))),
  ];

  if (typeof entry.salesPriceCents === "number") {
    fields.push({ kind: "price", value: String(entry.salesPriceCents / 100) });
  }

  const tokens: SearchToken[] = [];
  for (const field of fields) {
    const normalized = normalizeProductSearchText(field.value);
    for (const token of tokenize(normalized)) {
      tokens.push({ kind: field.kind, token, weight: FIELD_WEIGHTS[field.kind] });
    }
  }

  return tokens;
}

function tokenize(normalized: string) {
  const words = normalized.split(" ").filter(Boolean);
  const tokens = [...words];

  for (let index = 0; index < words.length - 1; index += 1) {
    tokens.push(`${words[index]}${words[index + 1]}`);
  }

  const joined = words.join("");
  if (joined.length >= 3 && joined.length <= 48) tokens.push(joined);
  return unique(tokens);
}

function tokenSimilarity(queryToken: string, candidateToken: string) {
  if (!queryToken || !candidateToken) return 0;
  if (queryToken === candidateToken) return 1;
  if (areAliases(queryToken, candidateToken)) return 0.94;

  const shorterLength = Math.min(queryToken.length, candidateToken.length);
  if (shorterLength >= 3 && (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken))) {
    const lengthRatio = shorterLength / Math.max(queryToken.length, candidateToken.length);
    return 0.9 + lengthRatio * 0.07;
  }

  if (shorterLength >= 3 && (candidateToken.includes(queryToken) || queryToken.includes(candidateToken))) {
    const lengthRatio = shorterLength / Math.max(queryToken.length, candidateToken.length);
    return 0.82 + lengthRatio * 0.08;
  }

  if (shorterLength <= 2) return 0;

  const distance = damerauLevenshtein(queryToken, candidateToken);
  const maximumLength = Math.max(queryToken.length, candidateToken.length);
  const maximumDistance = maximumAllowedDistance(maximumLength);
  if (distance > maximumDistance) return 0;

  return 1 - distance / maximumLength;
}

function stringSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maximumLength = Math.max(left.length, right.length);
  const distance = damerauLevenshtein(left, right);
  return Math.max(0, 1 - distance / maximumLength);
}

function areAliases(left: string, right: string) {
  const aliases = ALIAS_LOOKUP.get(left);
  return aliases?.has(right) ?? false;
}

function minimumAcceptedSimilarity(queryToken: string) {
  if (queryToken.length <= 2) return 0.78;
  if (queryToken.length <= 4) return 0.62;
  return 0.56;
}

function maximumAllowedDistance(length: number) {
  if (length <= 4) return 1;
  if (length <= 7) return 2;
  if (length <= 11) return 3;
  return 4;
}

function damerauLevenshtein(left: string, right: string) {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row]![0] = row;
  for (let column = 0; column < columns; column += 1) matrix[0]![column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row]![column] = Math.min(
        matrix[row - 1]![column]! + 1,
        matrix[row]![column - 1]! + 1,
        matrix[row - 1]![column - 1]! + substitutionCost,
      );

      if (
        row > 1
        && column > 1
        && left[row - 1] === right[column - 2]
        && left[row - 2] === right[column - 1]
      ) {
        matrix[row]![column] = Math.min(
          matrix[row]![column]!,
          matrix[row - 2]![column - 2]! + substitutionCost,
        );
      }
    }
  }

  return matrix[left.length]![right.length]!;
}

function compact(value: string) {
  return value.replace(/\s+/gu, "");
}

function unique(values: string[]) {
  return [...new Set(values)];
}
