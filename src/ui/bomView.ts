import { billOfMaterialsToCsv, type BillOfMaterials } from '../bom/billOfMaterials';
import { createSection, downloadTextFile, el, formatMetres } from './widgets';

/** Nomenclature table plus the board / offcut summary. */
export class BomView {
  private readonly summary = el('div', 'summary-grid');
  private readonly tableBody = el('tbody');
  private bill: BillOfMaterials | null = null;

  constructor(parent: HTMLElement) {
    const section = createSection(parent, 'Nomenclature bois');

    const scroll = el('div', 'bom-scroll');
    const table = el('table', 'bom');
    const head = el('thead');
    const headRow = el('tr');
    for (const [label, alignRight] of [
      ['Élément', false],
      ['Section', false],
      ['Long.', true],
      ['Qté', true],
      ['Total', true]
    ] as const) {
      const cell = el('th', alignRight ? 'num' : undefined, label);
      headRow.append(cell);
    }
    head.append(headRow);
    table.append(head, this.tableBody);
    scroll.append(table);

    const exportButton = el('button', undefined, 'Exporter en CSV');
    exportButton.type = 'button';
    exportButton.addEventListener('click', () => {
      if (this.bill) {
        downloadTextFile('nomenclature-sauna.csv', billOfMaterialsToCsv(this.bill), 'text/csv;charset=utf-8');
      }
    });

    const note = el(
      'div',
      'note',
      "Estimation simplifiée : les pièces sont imbriquées ligne par ligne dans une planche standard, sans imbrication entre lignes ni trait de scie. Les lignes en jaune dépassent la longueur standard et demandent un aboutage."
    );

    section.append(this.summary, scroll, el('div', 'field'), exportButton, note);
  }

  update(bill: BillOfMaterials): void {
    this.bill = bill;
    const { totals } = bill;

    this.summary.replaceChildren();
    const rows: Array<[string, string]> = [
      ['Pièces bois', String(totals.pieceCount)],
      ['Longueur totale', formatMetres(totals.totalLengthMm)],
      [`Planches ${bill.standardSection} de ${bill.standardBoardLengthMm} mm`, String(totals.standardBoards)],
      ['Longueur achetée', formatMetres(totals.purchasedLengthMm)],
      ['Chutes estimées', `${formatMetres(totals.offcutLengthMm)} (${(totals.offcutRatio * 100).toFixed(0)} %)`],
      ['Sections hors module', formatMetres(totals.nonStandardLengthMm)]
    ];
    for (const [key, value] of rows) {
      this.summary.append(el('span', 'key', key), el('span', 'value', value));
    }

    this.tableBody.replaceChildren();
    for (const line of bill.lines) {
      const row = el('tr', line.spliced ? 'spliced' : undefined);
      row.append(
        el('td', undefined, line.name),
        el('td', undefined, line.section),
        el('td', 'num', String(line.lengthMm)),
        el('td', 'num', String(line.quantity)),
        el('td', 'num', formatMetres(line.totalLengthMm))
      );
      this.tableBody.append(row);
    }
  }
}
