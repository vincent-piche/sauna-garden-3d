import type { SaunaConfig } from '../config/saunaConfig';
import type { WoodPartRecord } from '../model/buildContext';

export interface BomLine {
  name: string;
  /** Normalised section, larger dimension first, e.g. "80 × 40". */
  section: string;
  lengthMm: number;
  quantity: number;
  totalLengthMm: number;
  /** Standard boards needed for this line, assuming no nesting between lines. */
  standardBoards: number;
  /** True when a single piece is longer than a standard board and has to be spliced. */
  spliced: boolean;
  /** True when the section is exactly the standard timber module. */
  standardSection: boolean;
}

export interface BomTotals {
  pieceCount: number;
  totalLengthMm: number;
  standardBoards: number;
  purchasedLengthMm: number;
  offcutLengthMm: number;
  offcutRatio: number;
  /** Length of the pieces whose section is not the standard module. */
  nonStandardLengthMm: number;
}

export interface BillOfMaterials {
  standardBoardLengthMm: number;
  standardSection: string;
  lines: BomLine[];
  totals: BomTotals;
}

function formatSection(widthMm: number, thicknessMm: number): string {
  const larger = Math.max(widthMm, thicknessMm);
  const smaller = Math.min(widthMm, thicknessMm);
  return `${larger} × ${smaller}`;
}

/**
 * Cut list of every timber piece of the model.
 *
 * The board count is a first order estimate: pieces are nested inside a standard board
 * line by line, without any nesting between different lines and without kerf.
 * A real cutting optimisation will replace this later.
 */
export function generateBillOfMaterials(
  parts: Iterable<WoodPartRecord>,
  config: SaunaConfig
): BillOfMaterials {
  const standardLength = config.standardWoodLength;
  const standardSection = formatSection(config.standardWoodWidth, config.standardWoodThickness);

  const lines: BomLine[] = [];
  for (const part of parts) {
    const section = formatSection(part.widthMm, part.thicknessMm);
    const spliced = part.lengthMm > standardLength;
    const standardBoards = spliced
      ? part.quantity * Math.ceil(part.lengthMm / standardLength)
      : Math.ceil(part.quantity / Math.max(1, Math.floor(standardLength / part.lengthMm)));

    lines.push({
      name: part.name,
      section,
      lengthMm: part.lengthMm,
      quantity: part.quantity,
      totalLengthMm: part.lengthMm * part.quantity,
      standardBoards,
      spliced,
      standardSection: section === standardSection
    });
  }

  lines.sort((a, b) => a.name.localeCompare(b.name, 'fr') || b.lengthMm - a.lengthMm);

  const totals = lines.reduce<BomTotals>(
    (accumulator, line) => {
      accumulator.pieceCount += line.quantity;
      accumulator.totalLengthMm += line.totalLengthMm;
      if (line.standardSection) {
        accumulator.standardBoards += line.standardBoards;
      } else {
        accumulator.nonStandardLengthMm += line.totalLengthMm;
      }
      return accumulator;
    },
    {
      pieceCount: 0,
      totalLengthMm: 0,
      standardBoards: 0,
      purchasedLengthMm: 0,
      offcutLengthMm: 0,
      offcutRatio: 0,
      nonStandardLengthMm: 0
    }
  );

  const standardUsefulLength = totals.totalLengthMm - totals.nonStandardLengthMm;
  totals.purchasedLengthMm = totals.standardBoards * standardLength;
  totals.offcutLengthMm = Math.max(0, totals.purchasedLengthMm - standardUsefulLength);
  totals.offcutRatio = totals.purchasedLengthMm > 0 ? totals.offcutLengthMm / totals.purchasedLengthMm : 0;

  return { standardBoardLengthMm: standardLength, standardSection, lines, totals };
}

/** Bill of materials as CSV, for a spreadsheet or a timber merchant. */
export function billOfMaterialsToCsv(bill: BillOfMaterials): string {
  const header = 'Élément;Section (mm);Longueur (mm);Quantité;Longueur totale (mm);Planches standard';
  const rows = bill.lines.map((line) =>
    [line.name, line.section, line.lengthMm, line.quantity, line.totalLengthMm, line.standardBoards].join(';')
  );
  return [header, ...rows].join('\n');
}
