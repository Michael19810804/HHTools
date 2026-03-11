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

// 辅助函数：提取字段
const extractField = (df: any[], keyword: string, offsetCol: number = 1): string => {
  try {
    const lowerKeyword = keyword.toLowerCase();
    
    // 寻找最大列数，而不是依赖第一行
    let maxCols = 0;
    // 扫描前20行来估算列数，避免遍历整个大文件
    for (let i = 0; i < Math.min(df.length, 20); i++) {
      if (df[i] && df[i].length > maxCols) {
        maxCols = df[i].length;
      }
    }
    // 如果还没找到，默认给一个较大值 (比如 26 列 A-Z)
    if (maxCols < 26) maxCols = 26;

    // 遍历每一列寻找关键字
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      // 在该列中寻找匹配的行
      const rowIdx = df.findIndex((row: any[]) => {
        if (!row || colIdx >= row.length) return false;
        const cellVal = String(row[colIdx] || '').trim().toLowerCase();
        return cellVal === lowerKeyword;
      });
      
      if (rowIdx !== -1) {
        // 找到关键字，向右偏移 offsetCol 列获取值
        const targetRow = df[rowIdx];
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
  let startRowIdx = -1;
  
  // 寻找表头 "Payment Schedule"
  for (let i = 0; i < df.length; i++) {
    const rowStr = df[i].map((c: any) => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('payment schedual') || rowStr.includes('payment schedule')) {
      startRowIdx = i;
      break;
    }
  }
  
  if (startRowIdx === -1) return [];
  
  const dataStartRow = startRowIdx + 2; // 跳过标题和表头
  const schedule: PaymentItem[] = [];
  let emptyRowCount = 0;
  
  for (let i = dataStartRow; i < df.length; i++) {
    const row = df[i] || [];
    
    const col0 = row[0]; // Item
    const col1 = row[1]; // Notes
    const col2 = row[2]; // Date
    const col3 = row[3]; // Amount
    
    // 检查是否结束（假设 Item, Date, Amount 都为空则结束）
    const isC0Empty = !col0 || String(col0).trim() === "";
    const isC2Empty = !col2 || String(col2).trim() === "";
    const isC3Empty = !col3 || String(col3).trim() === "";
    
    if (isC0Empty && isC2Empty && isC3Empty) {
      emptyRowCount += 1;
      if (emptyRowCount >= 2) break;
      continue;
    }

    emptyRowCount = 0;

    // 过滤掉包含“审验”、“审验人”、“通过”等关键词的行
    const rowContent = (String(col0) + String(col1) + String(col2) + String(col3)).toLowerCase();
    if (rowContent.includes('审验') || rowContent.includes('通过') || rowContent.includes('verifier') || rowContent.includes('approved')) {
      continue;
    }
    
    schedule.push({
      item: col0 ? String(col0).replace('.0', '').trim() : "",
      notes: col1 ? String(col1).trim() : "",
      date: parseDateStr(col2),
      amount: col3 ? formatNumber(cleanNumber(col3)) : ""
    });
  }
  
  return schedule;
};

// 主解析函数
export const parseExcelData = async (file: File): Promise<ContractData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 读取第一个 Sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 转换为二维数组 (header: 1 表示返回数组的数组)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
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
        const scheduleData = extractFixedTable(jsonData);
        
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
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
