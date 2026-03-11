import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import _ from 'lodash';

// 类型定义
export interface ContractData {
  project: string;
  room: string;
  location: string;
  fullAddress: string;
  
  ownerName: string;
  ownerId: string;
  bankInfo: string;
  
  tenantName: string;
  tenantId: string;
  
  rent: number;
  rentFormatted: string;
  
  deposit: number;
  depositFormatted: string;
  
  cleaningFee: number;
  cleaningFeeFormatted: string;
  
  acFee: number;
  acFeeFormatted: string;
  
  latePenalty: number;
  latePenaltyFormatted: string;
  
  checkIn: string;
  checkOut: string;
  
  // 图片数据 (ArrayBuffer)
  ownerPassportImage?: ArrayBuffer | null;
  tenantPassportImage?: ArrayBuffer | null;
  
  schedule: PaymentItem[];
}

export interface PaymentItem {
  item: string;
  notes: string;
  date: string;
  amount: string;
}

const asRow = (row: any): any[] => Array.isArray(row) ? row : [];
const safeIncludes = (value: any, keyword: string): boolean => String(value ?? '').includes(keyword);

// 辅助函数：提取字段
const extractField = (df: any[], keyword: string, offsetCol: number = 1): string => {
  try {
    const lowerKeyword = keyword.toLowerCase();
    
    // 寻找最大列数，而不是依赖第一行
    let maxCols = 0;
    // 扫描前20行来估算列数，避免遍历整个大文件
    for (let i = 0; i < Math.min(df.length, 20); i++) {
      const row = asRow(df[i]);
      if (row.length > maxCols) {
        maxCols = row.length;
      }
    }
    // 如果还没找到，默认给一个较大值 (比如 26 列 A-Z)
    if (maxCols < 26) maxCols = 26;

    // 遍历每一列寻找关键字
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      // 在该列中寻找匹配的行
      const rowIdx = df.findIndex((row: any) => {
        const arr = asRow(row);
        if (colIdx >= arr.length) return false;
        const cellVal = String(arr[colIdx] || '').trim().toLowerCase();
        return cellVal === lowerKeyword;
      });
      
      if (rowIdx !== -1) {
        // 找到关键字，向右偏移 offsetCol 列获取值
        const targetRow = asRow(df[rowIdx]);
        if (targetRow && (colIdx + offsetCol) < targetRow.length) {
          const targetVal = targetRow[colIdx + offsetCol];
          if (targetVal === undefined || targetVal === null) return "";
          return String(targetVal).trim();
        }
      }
    }
  } catch (e) {
    console.error("Error extracting field:", keyword, e);
  }
  return "";
};

// 辅助函数：清理数字
const cleanNumber = (val: any): number => {
  if (!val) return 0;
  const s = String(val).replace(/,/g, '');
  const match = s.match(/\d+(\.\d+)?/);
  if (match) {
    return parseFloat(match[0]);
  }
  return 0;
};

// 辅助函数：格式化数字 (1,000)
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

// 辅助函数：解析日期
const parseDateStr = (val: any): string => {
  if (!val) return "";
  
  // 如果是纯数字字符串，先转为数字
  if (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim())) {
    const num = parseFloat(val);
    // Excel 日期通常 > 20000 (1954年) 且 < 100000 (2173年)
    // 简单的阈值判断，避免把普通数字误判为日期
    if (num > 20000 && num < 100000) {
      val = num;
    }
  }

  // 如果是 Excel 的序列号日期 (比如 44567)
  if (typeof val === 'number') {
    // Excel 的基准日期是 1899-12-30
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    // 加上时区偏移
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() + offset * 60 * 1000);
    return dayjs(adjustedDate).format('YYYY.MM.DD');
  }
  
  // 尝试直接解析
  const d = dayjs(val);
  if (d.isValid()) {
    // 排除纯数字被误解析为年份的情况 (dayjs("2000") -> 2000-01-01)
    // 如果原始值是类似 "2023.05.01" 或 "2023-05-01" 则保留
    if (String(val).includes('.') || String(val).includes('-') || String(val).includes('/')) {
        return d.format('YYYY.MM.DD');
    }
    // 如果是其他格式，如 "May 1, 2023"
    return d.format('YYYY.MM.DD');
  }
  
  return String(val).trim();
};

// 辅助函数：提取付款计划表
const extractFixedTable = (df: any[]): PaymentItem[] => {
    // console.log('[ExcelParser] Total Rows in DF:', df.length);
    const normalizeHeader = (val: any): string => String(val || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeIncludes = (text: string, sub: string): boolean => {
      if (text === undefined || text === null) return false;
      return String(text).indexOf(sub) !== -1;
    };
    const isItemHeader = (h: string): boolean => {
      if (safeIncludes(h, 'item')) return true;
      if (safeIncludes(h, 'iten')) return true; // 兼容拼写错误 ItenNo
      if (safeIncludes(h, 'no') && !safeIncludes(h, 'notes')) return true; // No. 且不是 Notes
      if (safeIncludes(h, '序号')) return true;
      if (safeIncludes(h, '期数')) return true;
      return false;
    };
    const isDateHeader = (h: string): boolean =>
    h === 'date' ||
    safeIncludes(h, 'paydate') ||
    safeIncludes(h, 'duedate') ||
    safeIncludes(h, 'rentpaydate') ||
    (safeIncludes(h, 'date') && (safeIncludes(h, 'pay') || safeIncludes(h, 'rent') || safeIncludes(h, 'due')));
  const isAmountHeader = (h: string): boolean =>
    h === 'amount' ||
    h === 'rent' ||
    safeIncludes(h, 'amount') ||
    safeIncludes(h, 'payment') ||
    safeIncludes(h, 'rentamount');
  const isNotesHeader = (h: string): boolean => h === 'notes' || safeIncludes(h, 'remark') || safeIncludes(h, 'notes');
  const isTitleLike = (row: any[]): boolean => {
    const rowStr = asRow(row).map((c: any) => String(c || '').toLowerCase()).join(' ');
    return rowStr.includes('payment') && rowStr.includes('sched');
  };
  const isLikelyDateValue = (val: any): boolean => {
    if (val === undefined || val === null || String(val).trim() === '') return false;
    const text = String(val).trim();
    if (/^\d+(\.\d+)?$/.test(text)) {
      const n = parseFloat(text);
      return n > 20000 && n < 100000;
    }
    return parseDateStr(val) !== '';
  };

  const headerCandidates: Array<{ rowIdx: number; itemColIdx: number; notesColIdx: number; dateColIdx: number; amountColIdx: number }> = [];

  for (let i = 0; i < df.length; i++) {
    const row = asRow(df[i]);
    const normalized = row.map((c: any) => normalizeHeader(c));
    const itemIdx = normalized.findIndex((c: string) => isItemHeader(c));
    const dateIdx = normalized.findIndex((c: string) => isDateHeader(c));
    const amountIdx = normalized.findIndex((c: string) => isAmountHeader(c));
    if (itemIdx === -1 || dateIdx === -1 || amountIdx === -1) {
      if (itemIdx === -1) {
        // 如果找不到 Item 列，但能找到 Date 和 Amount，可以尝试“盲猜”第一列，或者找包含 No. 的列
        // 这里暂时不强行补全，交给 extractByTitlePattern 兜底
      }
      continue;
    }
    const notesIdx = normalized.findIndex((c: string) => isNotesHeader(c));
    const minCore = Math.min(itemIdx, dateIdx, amountIdx);
    const maxCore = Math.max(itemIdx, dateIdx, amountIdx);
    const resolvedNotesIdx = notesIdx !== -1 ? notesIdx : (minCore + 1 < maxCore ? minCore + 1 : itemIdx);
    headerCandidates.push({
      rowIdx: i,
      itemColIdx: itemIdx,
      notesColIdx: resolvedNotesIdx,
      dateColIdx: dateIdx,
      amountColIdx: amountIdx
    });
  }

  const titleRows = df
    .map((row, idx) => ({ row: asRow(row), idx }))
    .filter(({ row }) => isTitleLike(row))
    .map(({ idx }) => idx);

  if (headerCandidates.length === 0 && titleRows.length === 0) return [];

  const extractScheduleByHeader = (candidate: { rowIdx: number; itemColIdx: number; notesColIdx: number; dateColIdx: number; amountColIdx: number }): PaymentItem[] => {
    const schedule: PaymentItem[] = [];
    let emptyRowCount = 0;

    for (let i = candidate.rowIdx + 1; i < df.length; i++) {
      const row = asRow(df[i]);

      if (isTitleLike(row)) {
        if (schedule.length > 0) {
          // console.log(`[ExcelParser] Row ${i} BREAK (TitleLike):`, row);
          break;
        }
        continue;
      }

      const nonEmptyCells = row
        .map((value, idx) => ({ value, idx, text: String(value ?? '').trim() }))
        .filter((cell) => cell.text !== '');

      if (nonEmptyCells.length === 0) {
        // if (i < candidate.rowIdx + 30) { console.log(...) }
        emptyRowCount += 1;
        if (emptyRowCount >= 20 && schedule.length > 0) break;
        continue;
      }

      emptyRowCount = 0;

      let col0 = row[candidate.itemColIdx];
      let col1 = row[candidate.notesColIdx];
      let col2 = row[candidate.dateColIdx];
      let col3 = row[candidate.amountColIdx];

      const pickFirstBy = (predicate: (val: any, idx: number) => boolean): any => {
        const found = nonEmptyCells.find((cell) => predicate(cell.value, cell.idx));
        return found ? found.value : undefined;
      };
      const pickAmountByPriority = (): any => {
        const withAmount = nonEmptyCells
          .filter(cell => cell.idx !== candidate.dateColIdx) // 排除已知的日期列
          .map((cell) => ({ ...cell, num: cleanNumber(cell.value) }))
          .filter((cell) => cell.num > 0);
        if (withAmount.length === 0) return undefined;
        withAmount.sort((a, b) => {
          if (a.idx !== b.idx) return b.idx - a.idx;
          return b.num - a.num;
        });
        return withAmount[0].value;
      };

      if (!col0 || String(col0).trim() === '') {
        // 智能回退策略：只有当其他列的数字符合“预期序号”时才抓取，防止抓到无关数字（如 Notes 里的 "2"）
        let expectedNum = schedule.length + 1;
        if (schedule.length > 0) {
           const lastItemStr = schedule[schedule.length - 1].item;
           const lastNum = parseInt(lastItemStr, 10);
           if (!isNaN(lastNum)) {
              expectedNum = lastNum + 1;
           }
        }

        const foundExpected = nonEmptyCells.find(cell => {
           if (cell.idx === candidate.dateColIdx || cell.idx === candidate.amountColIdx) return false;
           return cleanNumber(cell.value) === expectedNum;
        });

        if (foundExpected) {
           col0 = foundExpected.value;
        }
        // 如果没找到预期的序号，就保持 col0 为空，交给后续的 auto-fill 逻辑（它会填入 expectedNum）
        // 这样就彻底排除了“预期13却抓到2”的情况
      }
      if (!isLikelyDateValue(col2)) {
        col2 = pickFirstBy((val) => isLikelyDateValue(val));
      }
      if (!(String(col3 ?? '').trim() !== '' || cleanNumber(col3) > 0)) {
        col3 = pickAmountByPriority();
      }
      if (!col1 || String(col1).trim() === '') {
        const textCell = nonEmptyCells.find((cell) => {
          const text = String(cell.value ?? '').trim();
          return !/^\d+(\.\d+)?$/.test(text) && !isLikelyDateValue(cell.value);
        });
        col1 = textCell ? textCell.value : '';
      }

      const rowContent = (String(col0) + String(col1) + String(col2) + String(col3)).toLowerCase();
      if (
        rowContent.includes('审验') ||
        rowContent.includes('通过') ||
        rowContent.includes('verifier') ||
        rowContent.includes('approved') ||
        (rowContent.includes('item') && rowContent.includes('date') && (rowContent.includes('amount') || rowContent.includes('rent')))
      ) {
        continue;
      }

      const itemText = String(col0 ?? '').trim();
      const parsedDate = parseDateStr(col2);
      const rawAmountText = String(col3 ?? '').trim();
      const amountNumber = cleanNumber(col3);
      const hasNumericItem = /^\d+(\.0+)?$/.test(itemText);
      const hasAmount = rawAmountText !== '' || amountNumber > 0;
      const hasDate = parsedDate !== '';
      if (!hasNumericItem && !(hasDate && hasAmount)) {
        // if (i < candidate.rowIdx + 30) { console.log(...) }
        continue;
      }

      // if (i < candidate.rowIdx + 30) { console.log(...) }

      const finalItem = col0 ? String(col0).replace('.0', '').trim() : String(schedule.length + 1);
      
      // 修正序号逻辑：如果前一行是 12，当前自动补全不应是 schedule.length+1，而应尝试接续
      // 但 schedule.length + 1 其实就是接续逻辑（0->1, 1->2）。
      // 这里的核心问题是：如果中间有的行自带了序号（比如 5, 6...），有的行没带（需要补），
      // 混合使用时 schedule.length + 1 可能会和已有的重复或乱序。
      // 更好的策略：如果当前行没序号，且上一行有序号，则上一行序号+1；否则用 schedule.length + 1。
      
      let calculatedItem = finalItem;
      if (!col0 && schedule.length > 0) {
        const lastItem = schedule[schedule.length - 1].item;
        const lastNum = parseInt(lastItem, 10);
        if (!isNaN(lastNum)) {
          calculatedItem = String(lastNum + 1);
        }
      }

      // Sequence Enforcer: 强制检查序号连续性
      // 如果当前序号比上一行序号小（例如上一行是12，当前行是2），且我们已经有一定数量的行（>5），
      // 则判定为“垃圾数据”或“误读”，强制修正为上一行+1。
      if (schedule.length > 5) {
        const lastItemStr = schedule[schedule.length - 1].item;
        const lastNum = parseInt(lastItemStr, 10);
        const currentNum = parseInt(calculatedItem, 10);
        
        if (!isNaN(lastNum) && !isNaN(currentNum)) {
          // Sequence Enforcer: 只要序号发生回退（current < lastNum），且不是重置为1，就视为异常，强制递增
          // 这样可以应对任意长度列表中的误读（如 23 -> 2, 23 -> 12 等）
          if (currentNum < lastNum && currentNum !== 1) {
             console.log(`[ExcelParser] Sequence Enforcer Triggered at row ${i}: ${currentNum} -> ${lastNum + 1}`);
             calculatedItem = String(lastNum + 1);
          }
        }
      }

      schedule.push({
        item: calculatedItem,
        notes: col1 ? String(col1).trim() : "",
        date: parsedDate,
        amount: col3 ? formatNumber(cleanNumber(col3)) : ""
      });
    }

    return schedule;
  };

  let bestSchedule: PaymentItem[] = [];
  for (const candidate of headerCandidates) {
    const currentSchedule = extractScheduleByHeader(candidate);
    if (currentSchedule.length > bestSchedule.length) {
      bestSchedule = currentSchedule;
    }
  }

  const extractByTitlePattern = (titleRowIdx: number): PaymentItem[] => {
    const sampleRows = [];
    for (let i = titleRowIdx + 1; i <= Math.min(df.length - 1, titleRowIdx + 35); i++) {
      sampleRows.push(asRow(df[i]));
    }

    let maxCols = 0;
    for (const row of sampleRows) {
      if (row.length > maxCols) maxCols = row.length;
    }
    if (maxCols === 0) return [];

    let itemColIdx = 0;
    let dateColIdx = 0;
    let amountColIdx = 0;
    let bestItemScore = -1;
    let bestDateScore = -1;
    let bestAmountScore = -1;

    for (let c = 0; c < maxCols; c++) {
      let itemScore = 0;
      let dateScore = 0;
      let amountScore = 0;
      for (const row of sampleRows) {
        const value = row[c];
        const text = String(value ?? '').trim();
        if (/^\d+(\.0+)?$/.test(text)) itemScore += 1;
        if (isLikelyDateValue(value)) dateScore += 1;
        if (cleanNumber(value) > 0) amountScore += 1;
      }
      if (itemScore > bestItemScore) {
        bestItemScore = itemScore;
        itemColIdx = c;
      }
      if (dateScore > bestDateScore) {
        bestDateScore = dateScore;
        dateColIdx = c;
      }
      if (amountScore > bestAmountScore) {
        bestAmountScore = amountScore;
        amountColIdx = c;
      }
    }

    if (bestDateScore === 0 && bestAmountScore === 0) return [];
    
    // 如果日期列和金额列重合，优先信任日期列（因为日期格式更特殊），然后重新找金额列
    if (dateColIdx === amountColIdx) {
      let secondBestAmountScore = -1;
      let secondBestAmountCol = -1;
      for (let c = 0; c < maxCols; c++) {
        if (c === dateColIdx) continue;
        let amountScore = 0;
        for (const row of sampleRows) {
           if (cleanNumber(row[c]) > 0) amountScore += 1;
        }
        if (amountScore > secondBestAmountScore) {
          secondBestAmountScore = amountScore;
          secondBestAmountCol = c;
        }
      }
      if (secondBestAmountCol !== -1) {
        amountColIdx = secondBestAmountCol;
      }
    }

    // 如果 Item 列和日期/金额列重合，且 Item 得分不高，则尝试避让
    if ((itemColIdx === dateColIdx || itemColIdx === amountColIdx) && bestItemScore < 5) {
      itemColIdx = Math.max(0, Math.min(dateColIdx, amountColIdx) - 1);
    }
    
    const minCore = Math.min(itemColIdx, dateColIdx, amountColIdx);
    const maxCore = Math.max(itemColIdx, dateColIdx, amountColIdx);
    const notesColIdx = minCore + 1 < maxCore ? minCore + 1 : Math.min(maxCols - 1, itemColIdx + 1);

    const patternCandidate = { rowIdx: titleRowIdx + 1, itemColIdx, notesColIdx, dateColIdx, amountColIdx };
    const schedule = extractScheduleByHeader(patternCandidate);
    return schedule;
  };

  for (const titleRowIdx of titleRows) {
    const scheduleFromTitle = extractByTitlePattern(titleRowIdx);
    if (scheduleFromTitle.length > bestSchedule.length) {
      bestSchedule = scheduleFromTitle;
    }
  }
  console.log('[ExcelParser] Selected Schedule Rows:', bestSchedule.length);
  if (bestSchedule.length > 0) {
     const last = bestSchedule[bestSchedule.length - 1];
     console.log('[ExcelParser] Last Item Raw:', {
       item: last.item,
       date: last.date,
       amount: last.amount
     });
  }

  return bestSchedule;
};

// 主解析函数
export const parseExcelData = async (file: File): Promise<ContractData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      let stage = '读取 Excel 文件';
      try {
        stage = '解析二进制内容';
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        stage = '读取工作簿';
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel 中没有可用工作表');
        }

        stage = '提取工作表数据';
        const allSheetData = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) {
            return { sheetName, data: [] as any[][] };
          }
          // 强制重新计算 range，防止 !ref 元数据不准确导致读取截断
          if (worksheet['!ref']) {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            // 扫描实际存在的最大行列
            let maxRow = range.e.r;
            let maxCol = range.e.c;
            Object.keys(worksheet).forEach(key => {
              if (key[0] === '!') return;
              const cellRef = XLSX.utils.decode_cell(key);
              if (cellRef.r > maxRow) maxRow = cellRef.r;
              if (cellRef.c > maxCol) maxCol = cellRef.c;
            });
            worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
          }
          
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          return { sheetName, data: sheetData };
        });

        const isNonEmptySheet = (rows: any[][]) => rows.some((row) => asRow(row).some((cell) => String(cell ?? '').trim() !== ""));
        const primarySheet = allSheetData.find((sheet) => isNonEmptySheet(sheet.data)) || allSheetData[0];
        const jsonData = primarySheet.data;
        
        // --- 开始提取数据 ---
        
        // 1. 基本信息
        const rawProject = extractField(jsonData, "ProjectName");
        const rawRoom = extractField(jsonData, "RoomNo");
        const rawLocation = extractField(jsonData, "Location");
        
        const addressParts = [rawProject, rawRoom ? `Room ${rawRoom}` : '', rawLocation].filter(Boolean);
        const valFullAddr = addressParts.join(", ");
        
        // 2. 房东信息
        const rawBank = extractField(jsonData, "bankInfo");
        const valBank = rawBank || "KBank: XXX-XXX-XXXX";
        
        // Debug: 打印银行信息提取结果
        console.log('[ExcelParser] Bank Info Extraction:', {
          keyword: 'bankInfo',
          extracted: rawBank,
          final: valBank
        });

        const valOwnerName = extractField(jsonData, "Owner"); // TODO: 拼音转换暂时忽略，直接用原名
        const valOwnerId = extractField(jsonData, "ownerpassportNum") || extractField(jsonData, "OwnerPassportNum");
        
        // 3. 租客信息
        const valTenantName = extractField(jsonData, "TenantName");
        const valTenantId = extractField(jsonData, "tenantPassportNum");
        
        // 4. 财务信息
        const numRent = cleanNumber(extractField(jsonData, "Rent"));
        const numDeposit = numRent * 2;
        const numCFee = cleanNumber(extractField(jsonData, "roomCleanFee")) || 1000;
        const numAFee = cleanNumber(extractField(jsonData, "airCleanFee")) || 1000;
        
        // 滞纳金
        let numPenalty = cleanNumber(extractField(jsonData, "latePenalty"));
        if (numPenalty === 0) numPenalty = cleanNumber(extractField(jsonData, "LatePenalty"));
        const valPenalty = numPenalty > 0 ? numPenalty : 500; // 默认 500
        
        // 5. 日期
        const valStart = parseDateStr(extractField(jsonData, "CheckIn"));
        const valEnd = parseDateStr(extractField(jsonData, "CheckOut"));
        
        // 6. 付款计划
        stage = '提取付款计划';
        let scheduleData = extractFixedTable(jsonData);
        for (const sheet of allSheetData) {
          try {
            const currentData = sheet.data;
            if (!currentData || currentData.length === 0) continue;
            const currentSchedule = extractFixedTable(currentData);
            if (currentSchedule.length > scheduleData.length) {
              scheduleData = currentSchedule;
            }
          } catch (error) {
            console.warn(`[ExcelParser] 跳过无法解析的工作表: ${sheet.sheetName}`, error);
          }
        }
        
        // 组装结果
        const result: ContractData = {
          project: rawProject,
          room: rawRoom,
          location: rawLocation,
          fullAddress: valFullAddr,
          
          ownerName: valOwnerName,
          ownerId: valOwnerId,
          bankInfo: valBank,
          
          tenantName: valTenantName,
          tenantId: valTenantId,
          
          rent: numRent,
          rentFormatted: formatNumber(numRent),
          
          deposit: numDeposit,
          depositFormatted: formatNumber(numDeposit),
          
          cleaningFee: numCFee,
          cleaningFeeFormatted: formatNumber(numCFee),
          
          acFee: numAFee,
          acFeeFormatted: formatNumber(numAFee),
          
          latePenalty: valPenalty,
          latePenaltyFormatted: formatNumber(valPenalty),
          
          checkIn: valStart,
          checkOut: valEnd,
          
          schedule: scheduleData
        };
        
        resolve(result);
        
      } catch (error) {
        const baseMessage = error instanceof Error ? error.message : String(error);
        reject(new Error(`[${stage}] ${baseMessage}`));
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
