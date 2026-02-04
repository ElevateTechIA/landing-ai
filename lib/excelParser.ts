/**
 * Excel File Parser for Contact Import
 *
 * Parses xlsx and csv files to extract contact information
 */

import * as XLSX from 'xlsx';
import { formatPhoneNumber } from './whatsapp';

export interface ParsedContact {
  phoneNumber: string;
  name: string;
  email?: string;
  tags?: string[];
}

export interface ParseResult {
  success: boolean;
  contacts: ParsedContact[];
  errors: string[];
  skipped: number;
}

// Column name mappings (flexible naming support)
const PHONE_COLUMNS = ['phone', 'phone_number', 'telefono', 'numero', 'tel', 'mobile', 'celular', 'whatsapp'];
const NAME_COLUMNS = ['name', 'nombre', 'full_name', 'fullname', 'nombre_completo', 'contact', 'contacto'];
const EMAIL_COLUMNS = ['email', 'correo', 'mail', 'e-mail', 'correo_electronico'];
const TAGS_COLUMNS = ['tags', 'grupo', 'group', 'category', 'categoria', 'etiquetas'];

/**
 * Find column index by checking multiple possible names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => h?.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const index = normalizedHeaders.findIndex(h => h === normalizedName || h?.includes(normalizedName));
    if (index !== -1) return index;
  }

  return -1;
}

/**
 * Validate phone number format
 */
function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Must have at least 10 digits
  const digits = cleaned.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Parse Excel buffer and extract contacts
 */
export function parseExcelBuffer(buffer: Buffer, filename: string): ParseResult {
  const errors: string[] = [];
  const contacts: ParsedContact[] = [];
  let skipped = 0;

  try {
    // Read workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        contacts: [],
        errors: ['No sheets found in the file'],
        skipped: 0,
      };
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

    if (data.length < 2) {
      return {
        success: false,
        contacts: [],
        errors: ['File must have at least a header row and one data row'],
        skipped: 0,
      };
    }

    // Get headers from first row
    const headers = (data[0] as unknown[]).map(h => String(h || ''));

    // Find column indices
    const phoneIndex = findColumnIndex(headers, PHONE_COLUMNS);
    const nameIndex = findColumnIndex(headers, NAME_COLUMNS);
    const emailIndex = findColumnIndex(headers, EMAIL_COLUMNS);
    const tagsIndex = findColumnIndex(headers, TAGS_COLUMNS);

    if (phoneIndex === -1) {
      return {
        success: false,
        contacts: [],
        errors: ['Could not find phone number column. Expected columns: ' + PHONE_COLUMNS.join(', ')],
        skipped: 0,
      };
    }

    if (nameIndex === -1) {
      return {
        success: false,
        contacts: [],
        errors: ['Could not find name column. Expected columns: ' + NAME_COLUMNS.join(', ')],
        skipped: 0,
      };
    }

    // Process data rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];

      if (!row || row.length === 0) {
        skipped++;
        continue;
      }

      const rawPhone = String(row[phoneIndex] || '').trim();
      const name = String(row[nameIndex] || '').trim();

      // Skip rows without phone or name
      if (!rawPhone || !name) {
        skipped++;
        continue;
      }

      // Validate phone number
      if (!isValidPhoneNumber(rawPhone)) {
        errors.push(`Row ${i + 1}: Invalid phone number "${rawPhone}"`);
        skipped++;
        continue;
      }

      // Format phone number to E.164
      const phoneNumber = formatPhoneNumber(rawPhone);

      // Get optional fields
      const email = emailIndex !== -1 ? String(row[emailIndex] || '').trim() : undefined;
      const tagsRaw = tagsIndex !== -1 ? String(row[tagsIndex] || '').trim() : undefined;
      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : undefined;

      contacts.push({
        phoneNumber,
        name,
        email: email || undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
      });
    }

    return {
      success: true,
      contacts,
      errors,
      skipped,
    };
  } catch (error) {
    console.error('[EXCEL PARSER] Error:', error);
    return {
      success: false,
      contacts: [],
      errors: [error instanceof Error ? error.message : 'Failed to parse file'],
      skipped: 0,
    };
  }
}

/**
 * Validate file type
 */
export function isValidFileType(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return ['xlsx', 'xls', 'csv'].includes(extension || '');
}
