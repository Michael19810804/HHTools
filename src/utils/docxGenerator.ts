import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { ContractData } from './excelParser';

export const generateContract = async (data: ContractData) => {
  // 使用新的无空格文件名
  const templatePath = '/Lease_agreement_SAMPLE.docx';
  
  try {
    console.log(`[ContractGen] Attempting to load template from: ${templatePath}`);
    
    // 1. 加载模板
    const response = await fetch(templatePath);
    
    if (!response.ok) {
      console.error(`[ContractGen] Failed to load template. Status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to load template from ${templatePath} (Status: ${response.status})`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`[ContractGen] Server returned HTML instead of DOCX. Check file path or server configuration.`);
      throw new Error(`Template path returned HTML (likely 404 fallback). Path: ${templatePath}`);
    }
    
    const content = await response.arrayBuffer();
    console.log(`[ContractGen] Template loaded successfully. Size: ${content.byteLength} bytes`);
    
    // 2. 解压 zip
    const zip = new PizZip(content);
    
    // 3. 创建 docxtemplater 实例
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // 强制使用简单的定界符配置，防止复杂的 XML 干扰
      delimiters: { start: '{{', end: '}}' },
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
    
    // Debug: 打印渲染数据结构，特别是数组部分
    console.log('[ContractGen] Render Data:', {
      PaymentSchedule: data.schedule,
      IsArray: Array.isArray(data.schedule),
      Length: data.schedule?.length
    });
    
    // 5. 渲染文档
    doc.render({
      ...renderData,
      // 兼容旧模板中的变量名 (直接使用 excelParser 的字段名)
      ProjectName: data.project,
      RoomNo: data.room,
      Location: data.location,
      FullAddress: data.fullAddress,
      Owner: data.ownerName,
      OwnerPassportNum: data.ownerId,
      BankInfo: data.bankInfo,
      TenantName: data.tenantName,
      TenantPassportNum: data.tenantId,
      Rent: data.rentFormatted,
      Deposit: data.depositFormatted,
      CheckIn: data.checkIn,
      CheckOut: data.checkOut,
      CleaningFee: data.cleaningFeeFormatted,
      ACFee: data.acFeeFormatted,
      LatePenalty: data.latePenaltyFormatted,
      // 兼容付款计划表
      PaymentSchedule: data.schedule
    });
    
    // 6. 生成 blob
    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // 7. 下载文件
    const fileName = `Lease_${data.project}_${data.tenantName}.docx`;
    saveAs(out, fileName);
    
    return true;
  } catch (error: any) {
    console.error('Error generating contract:', error);
    
    // 处理 docxtemplater 的 MultiError
    if (error.properties && error.properties.errors) {
      console.error('--- Docxtemplater MultiError Details ---');
      error.properties.errors.forEach((err: any, i: number) => {
        console.error(`Error ${i + 1}:`, err);
        // 尝试从错误对象中提取具体的标签名
        if (err.properties && err.properties.explanation) {
             console.error(`Explanation: ${err.properties.explanation}`);
        }
        if (err.properties && err.properties.id) {
             console.error(`Error ID: ${err.properties.id}`);
        }
        if (err.properties && err.properties.context) {
             console.error(`Context: ${JSON.stringify(err.properties.context)}`);
        }
      });
      console.error('----------------------------------------');
      
      // 抛出更友好的错误信息
      const firstError = error.properties.errors[0];
      const explanation = firstError?.properties?.explanation || error.message;
      throw new Error(`模板变量错误: ${explanation}`);
    }
    
    throw error;
  }
};
