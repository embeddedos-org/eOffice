import type { Cell, Sheet, CellFormat } from './types';
import { generateId } from './utils';

export class SpreadsheetModel {
  public sheets: Sheet[];
  public activeSheetId: string;

  constructor() {
    const defaultSheet = this.createSheet('Sheet 1');
    this.sheets = [defaultSheet];
    this.activeSheetId = defaultSheet.id;
  }

  // ── Sheet management ──────────────────────────────────────────────

  private createSheet(name: string): Sheet {
    return {
      id: generateId(),
      name,
      cells: {},
      columnWidths: {},
      rowHeights: {},
    };
  }

  addSheet(name: string): Sheet {
    const sheet = this.createSheet(name);
    this.sheets.push(sheet);
    return sheet;
  }

  removeSheet(id: string): boolean {
    if (this.sheets.length <= 1) return false;
    const index = this.sheets.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.sheets.splice(index, 1);
    if (this.activeSheetId === id) {
      this.activeSheetId = this.sheets[0].id;
    }
    return true;
  }

  renameSheet(id: string, name: string): boolean {
    const sheet = this.getSheet(id);
    if (!sheet) return false;
    sheet.name = name;
    return true;
  }

  getSheet(id: string): Sheet | undefined {
    return this.sheets.find((s) => s.id === id);
  }

  getActiveSheet(): Sheet {
    return this.sheets.find((s) => s.id === this.activeSheetId)!;
  }

  // ── Cell operations ───────────────────────────────────────────────

  setCell(sheetId: string, row: number, col: number, value: string): void {
    const sheet = this.getSheet(sheetId);
    if (!sheet) return;

    const key = this.cellKey(row, col);
    const existing = sheet.cells[key];

    if (value.startsWith('=')) {
      sheet.cells[key] = {
        value,
        formula: value,
        computedValue: undefined,
        format: existing?.format,
      };
    } else {
      sheet.cells[key] = {
        value,
        formula: undefined,
        computedValue: undefined,
        format: existing?.format,
      };
    }

    this.recalculate();
  }

  getCell(sheetId: string, row: number, col: number): Cell | undefined {
    const sheet = this.getSheet(sheetId);
    if (!sheet) return undefined;
    return sheet.cells[this.cellKey(row, col)];
  }

  clearCell(sheetId: string, row: number, col: number): void {
    const sheet = this.getSheet(sheetId);
    if (!sheet) return;
    delete sheet.cells[this.cellKey(row, col)];
    this.recalculate();
  }

  clearRange(
    sheetId: string,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): void {
    const sheet = this.getSheet(sheetId);
    if (!sheet) return;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        delete sheet.cells[this.cellKey(r, c)];
      }
    }
    this.recalculate();
  }

  setCellFormat(
    sheetId: string,
    row: number,
    col: number,
    format: CellFormat,
  ): void {
    const sheet = this.getSheet(sheetId);
    if (!sheet) return;

    const key = this.cellKey(row, col);
    const cell = sheet.cells[key];
    if (cell) {
      cell.format = { ...cell.format, ...format };
    } else {
      sheet.cells[key] = { value: '', format };
    }
  }

  // ── Formula engine ────────────────────────────────────────────────

  private recalculate(): void {
    const formulaCells: {
      sheetId: string;
      key: string;
      cell: Cell;
    }[] = [];

    for (const sheet of this.sheets) {
      for (const [key, cell] of Object.entries(sheet.cells)) {
        if (cell.formula) {
          formulaCells.push({ sheetId: sheet.id, key, cell });
        }
      }
    }

    if (formulaCells.length === 0) return;

    const adjacency = new Map<string, string[]>();
    const cellLookup = new Map<
      string,
      { sheetId: string; key: string; cell: Cell }
    >();

    for (const entry of formulaCells) {
      const nodeId = `${entry.sheetId}:${entry.key}`;
      cellLookup.set(nodeId, entry);
      const deps = this.extractDependencies(entry.cell.formula!, entry.sheetId);
      adjacency.set(nodeId, deps);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const sorted: string[] = [];
    const circular = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adjacency.get(node) || [];
      for (const dep of neighbors) {
        if (!visited.has(dep)) {
          if (dfs(dep)) {
            circular.add(node);
            return true;
          }
        } else if (recStack.has(dep)) {
          circular.add(node);
          circular.add(dep);
          return true;
        }
      }

      recStack.delete(node);
      sorted.push(node);
      return false;
    };

    for (const nodeId of adjacency.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    for (const nodeId of circular) {
      const circEntry = cellLookup.get(nodeId);
      if (circEntry) {
        circEntry.cell.computedValue = '#CIRCULAR!';
      }
    }
    for (const nodeId of sorted) {
      const entry = cellLookup.get(nodeId);
      if (!entry) continue;

      if (circular.has(nodeId)) {
        entry.cell.computedValue = '#CIRCULAR!';
      } else {
        entry.cell.computedValue = this.evaluateFormula(
          entry.cell.formula!,
          entry.sheetId,
        );
      }
    }
  }

  private extractDependencies(formula: string, sheetId: string): string[] {
    const deps: string[] = [];
    const expr = formula.startsWith('=') ? formula.slice(1) : formula;

    const crossSheetRange = /(\w+)!([A-Z]+\d+):([A-Z]+\d+)/gi;
    let match: RegExpExecArray | null;
    match = crossSheetRange.exec(expr);
    while (match !== null) {
      const targetSheet = this.sheets.find((s) => s.name === match![1]);
      if (targetSheet) {
        const start = this.parseCellRef(match[2]);
        const end = this.parseCellRef(match[3]);
        if (start && end) {
          for (let r = start.row; r <= end.row; r++) {
            for (let c = start.col; c <= end.col; c++) {
              deps.push(`${targetSheet.id}:${this.cellKey(r, c)}`);
            }
          }
        }
      }
      match = crossSheetRange.exec(expr);
    }

    const crossSheetRef = /(\w+)!([A-Z]+\d+)(?!:)/gi;
    match = crossSheetRef.exec(expr);
    while (match !== null) {
      const targetSheet = this.sheets.find((s) => s.name === match![1]);
      if (targetSheet) {
        const ref = this.parseCellRef(match[2]);
        if (ref) {
          deps.push(`${targetSheet.id}:${this.cellKey(ref.row, ref.col)}`);
        }
      }
      match = crossSheetRef.exec(expr);
    }

    const rangePattern = /(?<!\w!)([A-Z]+\d+):([A-Z]+\d+)/gi;
    match = rangePattern.exec(expr);
    while (match !== null) {
      const start = this.parseCellRef(match[1]);
      const end = this.parseCellRef(match[2]);
      if (start && end) {
        for (let r = start.row; r <= end.row; r++) {
          for (let c = start.col; c <= end.col; c++) {
            deps.push(`${sheetId}:${this.cellKey(r, c)}`);
          }
        }
      }
      match = rangePattern.exec(expr);
    }

    const singleRef = /(?<!\w!)(?<![A-Z])([A-Z]+\d+)(?!:)(?!\d)/gi;
    match = singleRef.exec(expr);
    while (match !== null) {
      const ref = this.parseCellRef(match[1]);
      if (ref) {
        deps.push(`${sheetId}:${this.cellKey(ref.row, ref.col)}`);
      }
      match = singleRef.exec(expr);
    }

    return deps;
  }

  private evaluateFormula(formula: string, sheetId: string): string | number {
    try {
      const expr = formula.startsWith('=') ? formula.slice(1).trim() : formula.trim();
      return this.evalExpression(expr, sheetId);
    } catch {
      return '#ERROR!';
    }
  }

  private evalExpression(expr: string, sheetId: string): string | number {
    const funcMatch = expr.match(/^([A-Z]+)\((.+)\)$/i);
    if (funcMatch) {
      const funcName = funcMatch[1].toUpperCase();
      const argsStr = funcMatch[2];
      return this.evalFunction(funcName, argsStr, sheetId);
    }

    const ifMatch = expr.match(/^IF\((.+)\)$/i);
    if (ifMatch) {
      return this.evalFunction('IF', ifMatch[1], sheetId);
    }

    return this.evalSimpleExpression(expr, sheetId);
  }

  private evalFunction(
    name: string,
    argsStr: string,
    sheetId: string,
  ): string | number {
    switch (name) {
      case 'SUM': {
        const values = this.resolveRangeOrArgs(argsStr, sheetId);
        return values.reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
      }
      case 'AVG':
      case 'AVERAGE': {
        const values = this.resolveRangeOrArgs(argsStr, sheetId);
        const nums = values.filter((v): v is number => typeof v === 'number');
        if (nums.length === 0) return 0;
        return nums.reduce((sum, v) => sum + v, 0) / nums.length;
      }
      case 'COUNT': {
        const values = this.resolveRangeOrArgs(argsStr, sheetId);
        return values.filter((v) => typeof v === 'number').length;
      }
      case 'MIN': {
        const values = this.resolveRangeOrArgs(argsStr, sheetId);
        const nums = values.filter((v): v is number => typeof v === 'number');
        if (nums.length === 0) return 0;
        return Math.min(...nums);
      }
      case 'MAX': {
        const values = this.resolveRangeOrArgs(argsStr, sheetId);
        const nums = values.filter((v): v is number => typeof v === 'number');
        if (nums.length === 0) return 0;
        return Math.max(...nums);
      }
      case 'IF': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 3) return '#ERROR!';
        const condition = this.evalCondition(parts[0].trim(), sheetId);
        const trueBranch = parts[1].trim();
        const falseBranch = parts[2].trim();
        const branch = condition ? trueBranch : falseBranch;
        return this.resolveValue(branch, sheetId);
      }
      case 'CONCATENATE': {
        const parts = this.splitTopLevelCommas(argsStr);
        return parts
          .map((p) => {
            const v = this.resolveValue(p.trim(), sheetId);
            return String(v);
          })
          .join('');
      }
      case 'VLOOKUP': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 3) return '#ERROR!';
        const searchVal = this.resolveValue(parts[0].trim(), sheetId);
        const rangeMatch = parts[1].trim().match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
        if (!rangeMatch) return '#ERROR!';
        const colIndex = Number(this.resolveValue(parts[2].trim(), sheetId));
        const exactMatch = parts.length > 3 ? this.resolveValue(parts[3].trim(), sheetId) === 0 : true;

        const start = this.parseCellRef(rangeMatch[1]);
        const end = this.parseCellRef(rangeMatch[2]);
        if (!start || !end) return '#ERROR!';

        const sheet = this.getSheet(sheetId);
        if (!sheet) return '#REF!';

        for (let r = start.row; r <= end.row; r++) {
          const cell = sheet.cells[this.cellKey(r, start.col)];
          const cellVal = cell ? (cell.computedValue !== undefined ? cell.computedValue : cell.value) : '';
          const sv = typeof searchVal === 'number' ? searchVal : String(searchVal);
          const cv = typeof cellVal === 'number' ? cellVal : (isNaN(Number(cellVal)) ? String(cellVal) : Number(cellVal));
          if (String(sv).toLowerCase() === String(cv).toLowerCase()) {
            const targetCol = start.col + colIndex - 1;
            if (targetCol > end.col) return '#REF!';
            const targetCell = sheet.cells[this.cellKey(r, targetCol)];
            if (!targetCell) return '';
            const v = targetCell.computedValue !== undefined ? targetCell.computedValue : targetCell.value;
            const n = Number(v);
            return isNaN(n) ? String(v) : n;
          }
        }
        return '#N/A';
      }
      case 'HLOOKUP': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 3) return '#ERROR!';
        const searchVal = this.resolveValue(parts[0].trim(), sheetId);
        const rangeMatch = parts[1].trim().match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
        if (!rangeMatch) return '#ERROR!';
        const rowIndex = Number(this.resolveValue(parts[2].trim(), sheetId));

        const start = this.parseCellRef(rangeMatch[1]);
        const end = this.parseCellRef(rangeMatch[2]);
        if (!start || !end) return '#ERROR!';

        const sheet = this.getSheet(sheetId);
        if (!sheet) return '#REF!';

        for (let c = start.col; c <= end.col; c++) {
          const cell = sheet.cells[this.cellKey(start.row, c)];
          const cellVal = cell ? (cell.computedValue !== undefined ? cell.computedValue : cell.value) : '';
          if (String(searchVal).toLowerCase() === String(cellVal).toLowerCase()) {
            const targetRow = start.row + rowIndex - 1;
            if (targetRow > end.row) return '#REF!';
            const targetCell = sheet.cells[this.cellKey(targetRow, c)];
            if (!targetCell) return '';
            const v = targetCell.computedValue !== undefined ? targetCell.computedValue : targetCell.value;
            const n = Number(v);
            return isNaN(n) ? String(v) : n;
          }
        }
        return '#N/A';
      }
      case 'INDEX': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 3) return '#ERROR!';
        const rangeMatch = parts[0].trim().match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
        if (!rangeMatch) return '#ERROR!';
        const rowIdx = Number(this.resolveValue(parts[1].trim(), sheetId));
        const colIdx = Number(this.resolveValue(parts[2].trim(), sheetId));

        const start = this.parseCellRef(rangeMatch[1]);
        const end = this.parseCellRef(rangeMatch[2]);
        if (!start || !end) return '#ERROR!';

        const sheet = this.getSheet(sheetId);
        if (!sheet) return '#REF!';
        const targetRow = start.row + rowIdx - 1;
        const targetCol = start.col + colIdx - 1;
        if (targetRow > end.row || targetCol > end.col) return '#REF!';
        const cell = sheet.cells[this.cellKey(targetRow, targetCol)];
        if (!cell) return '';
        const v = cell.computedValue !== undefined ? cell.computedValue : cell.value;
        const n = Number(v);
        return isNaN(n) ? String(v) : n;
      }
      case 'MATCH': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const searchVal = this.resolveValue(parts[0].trim(), sheetId);
        const rangeMatch = parts[1].trim().match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
        if (!rangeMatch) return '#ERROR!';

        const start = this.parseCellRef(rangeMatch[1]);
        const end = this.parseCellRef(rangeMatch[2]);
        if (!start || !end) return '#ERROR!';

        const sheet = this.getSheet(sheetId);
        if (!sheet) return '#REF!';

        const isColumn = start.col === end.col;
        const limit = isColumn ? end.row - start.row + 1 : end.col - start.col + 1;

        for (let i = 0; i < limit; i++) {
          const r = isColumn ? start.row + i : start.row;
          const c = isColumn ? start.col : start.col + i;
          const cell = sheet.cells[this.cellKey(r, c)];
          const cellVal = cell ? (cell.computedValue !== undefined ? cell.computedValue : cell.value) : '';
          if (String(searchVal).toLowerCase() === String(cellVal).toLowerCase()) {
            return i + 1;
          }
        }
        return '#N/A';
      }
      case 'SUMIF': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const rangeValues = this.resolveRangeOrArgs(parts[0].trim(), sheetId);
        const criteria = this.resolveValue(parts[1].trim(), sheetId);
        const sumRange = parts.length > 2 ? this.resolveRangeOrArgs(parts[2].trim(), sheetId) : rangeValues;

        let total = 0;
        for (let i = 0; i < rangeValues.length; i++) {
          if (this.matchesCriteria(rangeValues[i], criteria)) {
            const val = i < sumRange.length ? sumRange[i] : 0;
            total += typeof val === 'number' ? val : (isNaN(Number(val)) ? 0 : Number(val));
          }
        }
        return total;
      }
      case 'COUNTIF': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const rangeValues = this.resolveRangeOrArgs(parts[0].trim(), sheetId);
        const criteria = this.resolveValue(parts[1].trim(), sheetId);
        let count = 0;
        for (const val of rangeValues) {
          if (this.matchesCriteria(val, criteria)) count++;
        }
        return count;
      }
      case 'AVERAGEIF': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const rangeValues = this.resolveRangeOrArgs(parts[0].trim(), sheetId);
        const criteria = this.resolveValue(parts[1].trim(), sheetId);
        const avgRange = parts.length > 2 ? this.resolveRangeOrArgs(parts[2].trim(), sheetId) : rangeValues;

        let total = 0;
        let count = 0;
        for (let i = 0; i < rangeValues.length; i++) {
          if (this.matchesCriteria(rangeValues[i], criteria)) {
            const val = i < avgRange.length ? avgRange[i] : 0;
            const num = typeof val === 'number' ? val : Number(val);
            if (!isNaN(num)) { total += num; count++; }
          }
        }
        return count > 0 ? total / count : '#DIV/0!';
      }
      case 'LEFT': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const text = String(this.resolveValue(parts[0].trim(), sheetId));
        const numChars = parts.length > 1 ? Number(this.resolveValue(parts[1].trim(), sheetId)) : 1;
        return text.substring(0, numChars);
      }
      case 'RIGHT': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const text = String(this.resolveValue(parts[0].trim(), sheetId));
        const numChars = parts.length > 1 ? Number(this.resolveValue(parts[1].trim(), sheetId)) : 1;
        return text.substring(text.length - numChars);
      }
      case 'MID': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 3) return '#ERROR!';
        const text = String(this.resolveValue(parts[0].trim(), sheetId));
        const startPos = Number(this.resolveValue(parts[1].trim(), sheetId));
        const numChars = Number(this.resolveValue(parts[2].trim(), sheetId));
        return text.substring(startPos - 1, startPos - 1 + numChars);
      }
      case 'LEN': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        return String(this.resolveValue(parts[0].trim(), sheetId)).length;
      }
      case 'TRIM': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        return String(this.resolveValue(parts[0].trim(), sheetId)).trim().replace(/\s+/g, ' ');
      }
      case 'UPPER': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        return String(this.resolveValue(parts[0].trim(), sheetId)).toUpperCase();
      }
      case 'LOWER': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        return String(this.resolveValue(parts[0].trim(), sheetId)).toLowerCase();
      }
      case 'PROPER': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const text = String(this.resolveValue(parts[0].trim(), sheetId));
        return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      }
      case 'NOW': return Date.now();
      case 'TODAY': {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      case 'DATE': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 3) return '#ERROR!';
        const y = Number(this.resolveValue(parts[0].trim(), sheetId));
        const m = Number(this.resolveValue(parts[1].trim(), sheetId));
        const d = Number(this.resolveValue(parts[2].trim(), sheetId));
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      case 'ROUND': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const num = Number(this.resolveValue(parts[0].trim(), sheetId));
        const digits = parts.length > 1 ? Number(this.resolveValue(parts[1].trim(), sheetId)) : 0;
        if (isNaN(num)) return '#ERROR!';
        const factor = Math.pow(10, digits);
        return Math.round(num * factor) / factor;
      }
      case 'ROUNDUP': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const num = Number(this.resolveValue(parts[0].trim(), sheetId));
        const digits = parts.length > 1 ? Number(this.resolveValue(parts[1].trim(), sheetId)) : 0;
        if (isNaN(num)) return '#ERROR!';
        const factor = Math.pow(10, digits);
        return Math.ceil(num * factor) / factor;
      }
      case 'ROUNDDOWN': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const num = Number(this.resolveValue(parts[0].trim(), sheetId));
        const digits = parts.length > 1 ? Number(this.resolveValue(parts[1].trim(), sheetId)) : 0;
        if (isNaN(num)) return '#ERROR!';
        const factor = Math.pow(10, digits);
        return Math.floor(num * factor) / factor;
      }
      case 'ABS': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const num = Number(this.resolveValue(parts[0].trim(), sheetId));
        if (isNaN(num)) return '#ERROR!';
        return Math.abs(num);
      }
      case 'SQRT': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const num = Number(this.resolveValue(parts[0].trim(), sheetId));
        if (isNaN(num) || num < 0) return '#ERROR!';
        return Math.sqrt(num);
      }
      case 'POWER':
      case 'POW': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const base = Number(this.resolveValue(parts[0].trim(), sheetId));
        const exp = Number(this.resolveValue(parts[1].trim(), sheetId));
        if (isNaN(base) || isNaN(exp)) return '#ERROR!';
        return Math.pow(base, exp);
      }
      case 'MOD': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const num = Number(this.resolveValue(parts[0].trim(), sheetId));
        const divisor = Number(this.resolveValue(parts[1].trim(), sheetId));
        if (isNaN(num) || isNaN(divisor) || divisor === 0) return '#ERROR!';
        return num % divisor;
      }
      case 'INT': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const num = Number(this.resolveValue(parts[0].trim(), sheetId));
        if (isNaN(num)) return '#ERROR!';
        return Math.floor(num);
      }
      case 'COUNTA': {
        const values = this.resolveRangeOrArgs(argsStr, sheetId);
        return values.filter((v) => v !== '' && v !== 0).length;
      }
      case 'COUNTBLANK': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        const rangeMatch = parts[0].trim().match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
        if (!rangeMatch) return '#ERROR!';
        const start = this.parseCellRef(rangeMatch[1]);
        const end = this.parseCellRef(rangeMatch[2]);
        if (!start || !end) return '#ERROR!';
        const sheet = this.getSheet(sheetId);
        if (!sheet) return '#REF!';
        let blankCount = 0;
        for (let r = start.row; r <= end.row; r++) {
          for (let c = start.col; c <= end.col; c++) {
            const cell = sheet.cells[this.cellKey(r, c)];
            if (!cell || cell.value === '') blankCount++;
          }
        }
        return blankCount;
      }
      case 'SUBSTITUTE': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 3) return '#ERROR!';
        const text = String(this.resolveValue(parts[0].trim(), sheetId));
        const oldText = String(this.resolveValue(parts[1].trim(), sheetId));
        const newText = String(this.resolveValue(parts[2].trim(), sheetId));
        return text.split(oldText).join(newText);
      }
      case 'FIND':
      case 'SEARCH': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const findText = String(this.resolveValue(parts[0].trim(), sheetId));
        const withinText = String(this.resolveValue(parts[1].trim(), sheetId));
        const startNum = parts.length > 2 ? Number(this.resolveValue(parts[2].trim(), sheetId)) - 1 : 0;
        const pos = name === 'FIND'
          ? withinText.indexOf(findText, startNum)
          : withinText.toLowerCase().indexOf(findText.toLowerCase(), startNum);
        return pos >= 0 ? pos + 1 : '#VALUE!';
      }
      case 'TEXT': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const val = this.resolveValue(parts[0].trim(), sheetId);
        const format = String(this.resolveValue(parts[1].trim(), sheetId));
        if (format === '0.00') return Number(val).toFixed(2);
        if (format === '0%') return (Number(val) * 100).toFixed(0) + '%';
        if (format === '0.00%') return (Number(val) * 100).toFixed(2) + '%';
        if (format === '#,##0') return Number(val).toLocaleString();
        return String(val);
      }
      case 'IFERROR': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 2) return '#ERROR!';
        const val = this.resolveValue(parts[0].trim(), sheetId);
        if (String(val).startsWith('#')) {
          return this.resolveValue(parts[1].trim(), sheetId);
        }
        return val;
      }
      case 'AND': {
        const parts = this.splitTopLevelCommas(argsStr);
        for (const p of parts) {
          if (!this.evalCondition(p.trim(), sheetId)) return 0;
        }
        return 1;
      }
      case 'OR': {
        const parts = this.splitTopLevelCommas(argsStr);
        for (const p of parts) {
          if (this.evalCondition(p.trim(), sheetId)) return 1;
        }
        return 0;
      }
      case 'NOT': {
        const parts = this.splitTopLevelCommas(argsStr);
        if (parts.length < 1) return '#ERROR!';
        return this.evalCondition(parts[0].trim(), sheetId) ? 0 : 1;
      }
      default:
        return '#ERROR!';
    }
  }

  private matchesCriteria(value: string | number, criteria: string | number): boolean {
    const strCriteria = String(criteria);
    const strValue = String(value);

    if (strCriteria.startsWith('>') && !strCriteria.startsWith('>=')) {
      return Number(value) > Number(strCriteria.slice(1));
    }
    if (strCriteria.startsWith('>=')) {
      return Number(value) >= Number(strCriteria.slice(2));
    }
    if (strCriteria.startsWith('<') && !strCriteria.startsWith('<=') && !strCriteria.startsWith('<>')) {
      return Number(value) < Number(strCriteria.slice(1));
    }
    if (strCriteria.startsWith('<=')) {
      return Number(value) <= Number(strCriteria.slice(2));
    }
    if (strCriteria.startsWith('<>') || strCriteria.startsWith('!=')) {
      return strValue.toLowerCase() !== strCriteria.slice(2).toLowerCase();
    }
    if (strCriteria.includes('*') || strCriteria.includes('?')) {
      const regex = new RegExp('^' + strCriteria.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      return regex.test(strValue);
    }
    return strValue.toLowerCase() === strCriteria.toLowerCase();
  }

  private splitTopLevelCommas(str: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of str) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts;
  }

  private resolveRangeOrArgs(
    argsStr: string,
    sheetId: string,
  ): (string | number)[] {
    const parts = this.splitTopLevelCommas(argsStr);
    const values: (string | number)[] = [];

    for (const part of parts) {
      const trimmed = part.trim();

      const crossSheetRange = trimmed.match(/^(\w+)!([A-Z]+\d+):([A-Z]+\d+)$/i);
      if (crossSheetRange) {
        const targetSheet = this.sheets.find((s) => s.name === crossSheetRange[1]);
        if (!targetSheet) {
          values.push('#REF!' as string);
          continue;
        }
        values.push(
          ...this.expandRange(crossSheetRange[2], crossSheetRange[3], targetSheet.id),
        );
        continue;
      }

      const rangeMatch = trimmed.match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
      if (rangeMatch) {
        values.push(...this.expandRange(rangeMatch[1], rangeMatch[2], sheetId));
        continue;
      }

      values.push(this.resolveValue(trimmed, sheetId));
    }

    return values;
  }

  private expandRange(
    startRef: string,
    endRef: string,
    sheetId: string,
  ): (string | number)[] {
    const start = this.parseCellRef(startRef);
    const end = this.parseCellRef(endRef);
    if (!start || !end) return [];

    const sheet = this.getSheet(sheetId);
    if (!sheet) return [];

    const values: (string | number)[] = [];
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const cell = sheet.cells[this.cellKey(r, c)];
        if (cell) {
          const v =
            cell.computedValue !== undefined ? cell.computedValue : cell.value;
          const num = Number(v);
          values.push(isNaN(num) ? String(v) : num);
        }
      }
    }
    return values;
  }

  private resolveValue(token: string, sheetId: string): string | number {
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return token.slice(1, -1);
    }

    const num = Number(token);
    if (!isNaN(num) && token.length > 0) return num;

    const crossRef = token.match(/^(\w+)!([A-Z]+\d+)$/i);
    if (crossRef) {
      const targetSheet = this.sheets.find((s) => s.name === crossRef[1]);
      if (!targetSheet) return '#REF!';
      const ref = this.parseCellRef(crossRef[2]);
      if (!ref) return '#REF!';
      const cell = targetSheet.cells[this.cellKey(ref.row, ref.col)];
      if (!cell) return 0;
      const v =
        cell.computedValue !== undefined ? cell.computedValue : cell.value;
      const n = Number(v);
      return isNaN(n) ? String(v) : n;
    }

    const ref = this.parseCellRef(token);
    if (ref) {
      const sheet = this.getSheet(sheetId);
      if (!sheet) return '#REF!';
      const cell = sheet.cells[this.cellKey(ref.row, ref.col)];
      if (!cell) return 0;
      const v =
        cell.computedValue !== undefined ? cell.computedValue : cell.value;
      const n = Number(v);
      return isNaN(n) ? String(v) : n;
    }

    return token;
  }

  private evalCondition(condition: string, sheetId: string): boolean {
    const operators = ['>=', '<=', '!=', '<>', '>', '<', '='] as const;

    for (const op of operators) {
      const idx = condition.indexOf(op);
      if (idx !== -1) {
        const left = this.resolveValue(
          condition.slice(0, idx).trim(),
          sheetId,
        );
        const right = this.resolveValue(
          condition.slice(idx + op.length).trim(),
          sheetId,
        );
        const l = typeof left === 'number' ? left : Number(left);
        const r = typeof right === 'number' ? right : Number(right);

        switch (op) {
          case '>':
            return l > r;
          case '<':
            return l < r;
          case '>=':
            return l >= r;
          case '<=':
            return l <= r;
          case '!=':
          case '<>':
            return l !== r;
          case '=':
            return l === r;
        }
      }
    }
    return false;
  }

  private evalSimpleExpression(expr: string, sheetId: string): string | number {
    const trimmed = expr.trim();

    const ref = this.parseCellRef(trimmed);
    if (ref) {
      return this.resolveValue(trimmed, sheetId);
    }

    const num = Number(trimmed);
    if (!isNaN(num) && trimmed.length > 0) return num;

    // Addition/subtraction (lowest precedence — split here first)
    // Find the rightmost + or - that isn't inside a leading position
    for (let i = trimmed.length - 1; i > 0; i--) {
      const ch = trimmed[i];
      if (ch === '+' || ch === '-') {
        const left = trimmed.slice(0, i);
        const right = trimmed.slice(i + 1);
        if (left.trim() && right.trim()) {
          const l = this.evalSimpleExpression(left, sheetId);
          const r = this.evalSimpleExpression(right, sheetId);
          const ln = typeof l === 'number' ? l : Number(l);
          const rn = typeof r === 'number' ? r : Number(r);
          if (isNaN(ln) || isNaN(rn)) return '#ERROR!';
          return ch === '+' ? ln + rn : ln - rn;
        }
      }
    }

    // Multiplication/division (higher precedence)
    for (let i = trimmed.length - 1; i > 0; i--) {
      const ch = trimmed[i];
      if (ch === '*' || ch === '/') {
        const left = trimmed.slice(0, i);
        const right = trimmed.slice(i + 1);
        if (left.trim() && right.trim()) {
          const l = this.evalSimpleExpression(left, sheetId);
          const r = this.evalSimpleExpression(right, sheetId);
          const ln = typeof l === 'number' ? l : Number(l);
          const rn = typeof r === 'number' ? r : Number(r);
          if (isNaN(ln) || isNaN(rn)) return '#ERROR!';
          if (ch === '/' && rn === 0) return '#ERROR!';
          return ch === '*' ? ln * rn : ln / rn;
        }
      }
    }

    return this.resolveValue(trimmed, sheetId);
  }

  // ── Helper methods ────────────────────────────────────────────────

  private cellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private parseCellRef(ref: string): { col: number; row: number } | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    const col = this.colLetterToIndex(match[1].toUpperCase());
    const row = parseInt(match[2], 10) - 1;
    if (row < 0) return null;
    return { col, row };
  }

  private colToLetter(col: number): string {
    let result = '';
    let c = col;
    while (c >= 0) {
      result = String.fromCharCode((c % 26) + 65) + result;
      c = Math.floor(c / 26) - 1;
    }
    return result;
  }

  private colLetterToIndex(letters: string): number {
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.charCodeAt(i) - 64);
    }
    return result - 1;
  }

  getCellAddress(row: number, col: number): string {
    return `${this.colToLetter(col)}${row + 1}`;
  }

  // ── Statistics ────────────────────────────────────────────────────

  getCellCount(): number {
    let count = 0;
    for (const sheet of this.sheets) {
      for (const cell of Object.values(sheet.cells)) {
        if (cell.value !== '' || cell.formula) {
          count++;
        }
      }
    }
    return count;
  }

  getSheetCount(): number {
    return this.sheets.length;
  }

  // ── CSV ───────────────────────────────────────────────────────────

  exportCSV(sheetId?: string): string {
    const sheet = sheetId ? this.getSheet(sheetId) : this.getActiveSheet();
    if (!sheet) return '';

    let maxRow = -1;
    let maxCol = -1;
    for (const key of Object.keys(sheet.cells)) {
      const [r, c] = key.split(':').map(Number);
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    }

    if (maxRow < 0 || maxCol < 0) return '';

    const rows: string[] = [];
    for (let r = 0; r <= maxRow; r++) {
      const cols: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const cell = sheet.cells[this.cellKey(r, c)];
        if (cell) {
          const val =
            cell.computedValue !== undefined
              ? String(cell.computedValue)
              : cell.value;
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            cols.push(`"${val.replace(/"/g, '""')}"`);
          } else {
            cols.push(val);
          }
        } else {
          cols.push('');
        }
      }
      rows.push(cols.join(','));
    }
    return rows.join('\n');
  }

  importCSV(csv: string, sheetId?: string): void {
    const sheet = sheetId ? this.getSheet(sheetId) : this.getActiveSheet();
    if (!sheet) return;

    sheet.cells = {};

    const lines = csv.split('\n');
    for (let r = 0; r < lines.length; r++) {
      const values = this.parseCSVLine(lines[r]);
      for (let c = 0; c < values.length; c++) {
        const val = values[c];
        if (val !== '') {
          sheet.cells[this.cellKey(r, c)] = { value: val };
        }
      }
    }

    this.recalculate();
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  // ── JSON serialization ───────────────────────────────────────────

  toJSON(): object {
    return {
      sheets: this.sheets.map((sheet) => ({
        id: sheet.id,
        name: sheet.name,
        cells: sheet.cells,
        columnWidths: sheet.columnWidths,
        rowHeights: sheet.rowHeights,
      })),
      activeSheetId: this.activeSheetId,
    };
  }

  static fromJSON(json: {
    sheets: Sheet[];
    activeSheetId: string;
  }): SpreadsheetModel {
    const model = new SpreadsheetModel();
    model.sheets = json.sheets.map((s) => ({
      id: s.id,
      name: s.name,
      cells: { ...s.cells },
      columnWidths: s.columnWidths ? { ...s.columnWidths } : {},
      rowHeights: s.rowHeights ? { ...s.rowHeights } : {},
    }));
    model.activeSheetId = json.activeSheetId;
    return model;
  }
}
