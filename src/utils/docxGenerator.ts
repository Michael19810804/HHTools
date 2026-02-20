import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { ContractData } from './excelParser';

// 加载本地模板文件 (需要将模板放在 public 目录下)
const loadTemplate = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load template from ${url}`);
  }
  return await response.arrayBuffer();
};

export const generateContract = async (data: ContractData, templatePath: string = '/templates/Lease agreement-SAMPLE.docx') => {
  try {
    // 1. 加载模板
    const content = await loadTemplate(templatePath);
    
    // 2. 解压 zip
    const zip = new PizZip(content);
    
    // 3. 创建 docxtemplater 实例
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // 4. 准备渲染数据 (映射到 Python 模板的变量名)
    // Python context:
    // "property": { "full_address": val_full_addr },
    // "tenant": { "name": val_tenant_name, "id_no": val_tenant_id },
    // "landlord": { "name": val_owner_name, "id_no": val_owner_id, "bank_details": val_bank },
    // "financials": { "monthly_rent": val_rent, "deposit_amount": val_deposit },
    // "lease_term": { "start_date": val_start, "end_date": val_end },
    // "rules": { "cleaning_fee": val_c_fee, "ac_cleaning_fee": val_a_fee, "late_penalty_daily": val_penalty }
    
    const renderData = {
      property: { full_address: data.fullAddress },
      tenant: { name: data.tenantName, id_no: data.tenantId },
      landlord: { name: data.ownerName, id_no: data.ownerId, bank_details: data.bankInfo },
      financials: { monthly_rent: data.rentFormatted, deposit_amount: data.depositFormatted },
      lease_term: { start_date: data.checkIn, end_date: data.checkOut },
      rules: {
        cleaning_fee: data.cleaningFeeFormatted,
        ac_cleaning_fee: data.acFeeFormatted,
        late_penalty_daily: data.latePenaltyFormatted
      },
      // 表格数据通常需要特殊的 docxtemplater 语法，这里先简化处理
      // 假设模板里有 {#schedule} ... {/schedule} 循环
      schedule: data.schedule
    };
    
    // 5. 渲染文档
    doc.render(renderData);
    
    // 6. 生成 blob
    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // 7. 下载文件
    const fileName = `Lease_${data.project}_${data.tenantName}.docx`;
    saveAs(out, fileName);
    
    return true;
  } catch (error) {
    console.error('Error generating contract:', error);
    throw error;
  }
};
