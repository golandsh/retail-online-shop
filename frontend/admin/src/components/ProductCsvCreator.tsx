import React, { useRef, useState } from 'react';
import {
  generateCategoryHash,
  generateProductId,
  generateProductsCsv,
  parseProductsCsv,
} from '../utils/hash';
import type { ProductCsvRow } from '../utils/hash';
import { t } from '../strings';
import './ProductCsvCreator.scss';

interface ProductCsvCreatorProps {
  onUploadFile: (file: File) => void;
  uploading: boolean;
}

const SAMPLE_PRODUCTS: ProductCsvRow[] = [
  {
    productId: 1001,
    description: 'Milk 3 Percent',
    isWeightable: false,
    categoryId: generateCategoryHash('Dairy Products'),
    categoryName: 'Dairy Products',
    subCategoryId: generateCategoryHash('Milk'),
    subCategoryName: 'Milk',
    imageUrl: 'https://example.com/milk.jpg',
    price: 7.50,
  },
  {
    productId: 1002,
    description: 'White Bread',
    isWeightable: false,
    categoryId: generateCategoryHash('Bakery'),
    categoryName: 'Bakery',
    subCategoryId: '',
    subCategoryName: '',
    imageUrl: '',
    price: 6.90,
  },
  {
    productId: 1003,
    description: 'Bananas',
    isWeightable: true,
    categoryId: generateCategoryHash('Produce'),
    categoryName: 'Produce',
    subCategoryId: generateCategoryHash('Fruits and Vegetables'),
    subCategoryName: 'Fruits and Vegetables',
    imageUrl: 'https://example.com/bananas.jpg',
    price: 4.20,
  },
  {
    productId: 1004,
    description: 'Tomatoes',
    isWeightable: true,
    categoryId: generateCategoryHash('Produce'),
    categoryName: 'Produce',
    subCategoryId: generateCategoryHash('Vegetables'),
    subCategoryName: 'Vegetables',
    imageUrl: '',
    price: 5.80,
  },
  {
    productId: 1005,
    description: 'Eggs 12 Pack',
    isWeightable: false,
    categoryId: generateCategoryHash('Dairy Products'),
    categoryName: 'Dairy Products',
    subCategoryId: generateCategoryHash('Eggs'),
    subCategoryName: 'Eggs',
    imageUrl: '',
    price: 14.90,
  },
];

export const ProductCsvCreator: React.FC<ProductCsvCreatorProps> = ({
  onUploadFile,
  uploading,
}) => {
  const [fileName, setFileName] = useState<string>('sample-products.csv');
  const [rows, setRows] = useState<ProductCsvRow[]>(SAMPLE_PRODUCTS);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRowChange = (index: number, field: keyof ProductCsvRow, value: string | boolean | number) => {
    setRows((prevRows) => {
      const newRows = [...prevRows];
      const updatedRow = { ...newRows[index], [field]: value };

      // Dynamically recalculate category hashes on name changes
      if (field === 'categoryName') {
        updatedRow.categoryId = generateCategoryHash(String(value));
      }
      if (field === 'subCategoryName') {
        updatedRow.subCategoryId = value ? generateCategoryHash(String(value)) : '';
      }

      newRows[index] = updatedRow;
      return newRows;
    });
  };

  const handleAddRow = () => {
    const newRow: ProductCsvRow = {
      productId: generateProductId(),
      description: '',
      isWeightable: false,
      categoryId: '',
      categoryName: '',
      subCategoryId: '',
      subCategoryName: '',
      imageUrl: '',
      price: '',
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleDuplicateRow = (index: number) => {
    const source = rows[index];
    const duplicated: ProductCsvRow = {
      ...source,
      productId: generateProductId(),
    };
    setRows((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLoadSample = () => {
    setRows(SAMPLE_PRODUCTS.map((item) => ({ ...item })));
    setStatusMessage({ text: t('csvLoadSuccess', { count: SAMPLE_PRODUCTS.length }), isError: false });
  };

  const handleOpenFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseProductsCsv(text);
        if (parsed.length > 0) {
          setRows(parsed);
          setStatusMessage({ text: t('csvLoadSuccess', { count: parsed.length }), isError: false });
        } else {
          setStatusMessage({ text: t('csvLoadError'), isError: true });
        }
      } catch (err) {
        console.error("Failed to parse CSV:", err);
        setStatusMessage({ text: t('csvLoadError'), isError: true });
      }
    };
    reader.readAsText(file);

    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateRows = (): boolean => {
    if (rows.length === 0) {
      setStatusMessage({ text: t('emptyRowsError'), isError: true });
      return false;
    }

    const invalid = rows.some(
      (r) => !r.description.trim() || String(r.price).trim() === ''
    );
    if (invalid) {
      setStatusMessage({ text: t('emptyRowsError'), isError: true });
      return false;
    }

    setStatusMessage(null);
    return true;
  };

  const createCsvFileObject = (): File => {
    const csvContent = generateProductsCsv(rows);
    const sanitizedFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return new File([blob], sanitizedFileName, { type: 'text/csv' });
  };

  const handleDownloadCsv = async () => {
    if (!validateRows()) return;
    const sanitizedFileName = fileName.trim().endsWith('.csv') ? fileName.trim() : `${fileName.trim()}.csv`;
    const csvContent = generateProductsCsv(rows);

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: sanitizedFileName,
          types: [
            {
              description: 'CSV Files',
              accept: { 'text/csv': ['.csv'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(csvContent);
        await writable.close();

        if (handle.name) {
          setFileName(handle.name);
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker error:', err);
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], sanitizedFileName, { type: 'text/csv' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAndUpload = () => {
    if (!validateRows()) return;
    const file = createCsvFileObject();
    onUploadFile(file);
  };

  return (
    <div className="product-csv-creator">
      <div className="creator-header">
        <div className="filename-container">
          <label htmlFor="csv-filename">{t('csvFileNameLabel')}</label>
          <input
            id="csv-filename"
            type="text"
            className="input-filename"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder={t('csvFileNamePlaceholder')}
          />
        </div>

        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleOpenFileClick}
            disabled={uploading}
          >
            📂 {t('openExistingCsvBtn')}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleLoadSample}
            disabled={uploading}
          >
            ✨ {t('loadSampleDataBtn')}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`creator-alert ${statusMessage.isError ? 'error' : 'success'}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th className="th-id">{t('colProductId')}</th>
              <th className="th-desc">{t('colDescription')}</th>
              <th className="th-weight">{t('colIsWeightable')}</th>
              <th className="th-cat-name">{t('colCategoryName')}</th>
              <th className="th-cat-id">{t('colCategoryId')}</th>
              <th className="th-subcat-name">{t('colSubCategoryName')}</th>
              <th className="th-subcat-id">{t('colSubCategoryId')}</th>
              <th className="th-image">{t('colImageUrl')}</th>
              <th className="th-price">{t('colPrice')}</th>
              <th className="th-actions">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-state">
                  {t('noProductsInTable')}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const catId = row.categoryName ? generateCategoryHash(row.categoryName) : '';
                const subCatId = row.subCategoryName ? generateCategoryHash(row.subCategoryName) : '';

                return (
                  <tr key={index}>
                    <td>
                      <span className="id-badge" title="Stable Unique ID">
                        {row.productId}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-input"
                        value={row.description}
                        onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                        placeholder="תיאור מוצר"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={row.isWeightable}
                        onChange={(e) => handleRowChange(index, 'isWeightable', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-input"
                        value={row.categoryName}
                        onChange={(e) => handleRowChange(index, 'categoryName', e.target.value)}
                        placeholder="שם קטגוריה"
                      />
                    </td>
                    <td>
                      <span className={`hash-badge ${catId ? 'active' : ''}`}>
                        {catId || '-'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-input"
                        value={row.subCategoryName}
                        onChange={(e) => handleRowChange(index, 'subCategoryName', e.target.value)}
                        placeholder="תת קטגוריה (אופציונלי)"
                      />
                    </td>
                    <td>
                      <span className={`hash-badge ${subCatId ? 'active' : ''}`}>
                        {subCatId || '-'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-input"
                        value={row.imageUrl}
                        onChange={(e) => handleRowChange(index, 'imageUrl', e.target.value)}
                        placeholder="https://..."
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="table-input input-price"
                        value={row.price}
                        onChange={(e) => handleRowChange(index, 'price', e.target.value)}
                        placeholder="7.50"
                      />
                    </td>
                    <td className="td-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleDuplicateRow(index)}
                        title={t('duplicateRowTooltip')}
                        disabled={uploading}
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={() => handleDeleteRow(index)}
                        title={t('deleteRowTooltip')}
                        disabled={uploading}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="creator-footer">
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleAddRow}
          disabled={uploading}
        >
          ➕ {t('addProductRowBtn')}
        </button>

        <div className="footer-right-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadCsv}
            disabled={uploading || rows.length === 0}
          >
            💾 {t('saveCsvBtn')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveAndUpload}
            disabled={uploading || rows.length === 0}
          >
            🚀 {t('uploadServiceBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
