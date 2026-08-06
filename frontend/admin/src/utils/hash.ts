export interface ProductCsvRow {
  productId: string | number;
  description: string;
  isWeightable: boolean;
  categoryId: string | number;
  categoryName: string;
  subCategoryId: string | number;
  subCategoryName: string;
  imageUrl: string;
  price: string | number;
}

/**
 * Deterministic FNV-1a hash producing a positive 31-bit integer.
 */
export function generateCategoryHash(name: string): number | '' {
  if (!name || !name.trim()) return '';
  const str = name.trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positiveInt = (hash >>> 0) % 2147483647;
  return positiveInt === 0 ? 1 : positiveInt;
}

/**
 * Generates a stable unique numeric ID for new products.
 */
export function generateProductId(): number {
  // Generates a 6-digit to 8-digit positive integer ID
  return Math.floor(100000 + Math.random() * 900000);
}

/**
 * Escape CSV cell string according to standard CSV rules.
 */
function escapeCsvCell(val: string | number | boolean | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates formatted CSV text adhering to sample-products.csv column headers:
 * ProductID,description,IsWeightable,CategoryID,CategoryName,SubCategoryID,SubCategoryName,ImageURL,Price
 */
export function generateProductsCsv(rows: ProductCsvRow[]): string {
  const headers = [
    'ProductID',
    'description',
    'IsWeightable',
    'CategoryID',
    'CategoryName',
    'SubCategoryID',
    'SubCategoryName',
    'ImageURL',
    'Price',
  ];

  const lines = [headers.join(',')];

  for (const row of rows) {
    const categoryId = generateCategoryHash(row.categoryName);
    const subCategoryId = row.subCategoryName ? generateCategoryHash(row.subCategoryName) : '';

    const line = [
      escapeCsvCell(row.productId),
      escapeCsvCell(row.description),
      escapeCsvCell(row.isWeightable),
      escapeCsvCell(categoryId),
      escapeCsvCell(row.categoryName),
      escapeCsvCell(subCategoryId),
      escapeCsvCell(row.subCategoryName),
      escapeCsvCell(row.imageUrl),
      escapeCsvCell(row.price),
    ].join(',');

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Simple CSV parser handling quotes and commas.
 */
export function parseCsvText(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Parses existing CSV text into ProductCsvRow array.
 */
export function parseProductsCsv(csvText: string): ProductCsvRow[] {
  const parsedLines = parseCsvText(csvText);
  if (parsedLines.length === 0) return [];

  const rawHeaders = parsedLines[0].map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const getIndex = (name: string) => rawHeaders.findIndex((h) => h === name.toLowerCase());

  const idxProductId = getIndex('productid');
  const idxDesc = getIndex('description');
  const idxWeightable = getIndex('isweightable');
  const idxCatId = getIndex('categoryid');
  const idxCatName = getIndex('categoryname');
  const idxSubCatId = getIndex('subcategoryid');
  const idxSubCatName = getIndex('subcategoryname');
  const idxImage = getIndex('imageurl');
  const idxPrice = getIndex('price');

  const rows: ProductCsvRow[] = [];

  for (let i = 1; i < parsedLines.length; i++) {
    const line = parsedLines[i];
    if (line.length === 0) continue;

    const desc = idxDesc !== -1 ? line[idxDesc] ?? '' : '';
    if (!desc && line.every((c) => !c)) continue;

    const prodIdRaw = idxProductId !== -1 ? line[idxProductId] : '';
    const productId = prodIdRaw ? prodIdRaw : generateProductId();
    const weightableRaw = idxWeightable !== -1 ? line[idxWeightable]?.toLowerCase() : '';
    const isWeightable = weightableRaw === 'true' || weightableRaw === '1' || weightableRaw === 'yes';

    const categoryName = idxCatName !== -1 ? line[idxCatName] ?? '' : '';
    const categoryId = idxCatId !== -1 && line[idxCatId] ? line[idxCatId] : generateCategoryHash(categoryName);

    const subCategoryName = idxSubCatName !== -1 ? line[idxSubCatName] ?? '' : '';
    const subCategoryId =
      idxSubCatId !== -1 && line[idxSubCatId]
        ? line[idxSubCatId]
        : subCategoryName
        ? generateCategoryHash(subCategoryName)
        : '';

    const imageUrl = idxImage !== -1 ? line[idxImage] ?? '' : '';
    const price = idxPrice !== -1 ? line[idxPrice] ?? '' : '';

    rows.push({
      productId,
      description: desc,
      isWeightable,
      categoryId,
      categoryName,
      subCategoryId,
      subCategoryName,
      imageUrl,
      price,
    });
  }

  return rows;
}
