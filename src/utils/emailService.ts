import { supabase } from './supabase';

const EMAIL_TEMPLATES: Record<string, any> = {
  zh: {
    invite: {
      subject: "请签署文档：{{title}}",
      body: "您好 {{name}}，\n\n{{sender}} 邀请您签署文档《{{title}}》。\n\n请点击以下链接进行签署：\n{{link}}\n\n留言：\n{{customMessage}}"
    },
    complete: {
      subject: "文档签署完成：{{title}}",
      body: "您好 {{name}}，\n\n文档《{{title}}》已完成所有签署。\n\n请点击以下链接下载最终文档：\n{{link}}"
    }
  },
  en: {
    invite: {
      subject: "Please sign: {{title}}",
      body: "Hello {{name}},\n\n{{sender}} has invited you to sign the document \"{{title}}\".\n\nPlease click the link below to sign:\n{{link}}\n\nMessage:\n{{customMessage}}"
    },
    complete: {
      subject: "Document Completed: {{title}}",
      body: "Hello {{name}},\n\nThe document \"{{title}}\" has been signed by all parties.\n\nPlease click the link below to download the final document:\n{{link}}"
    }
  },
  th: {
    invite: {
      subject: "กรุณาลงนาม: {{title}}",
      body: "สวัสดี {{name}},\n\n{{sender}} ได้เชิญคุณลงนามในเอกสาร \"{{title}}\"\n\nกรุณาคลิกลิงก์ด้านล่างเพื่อลงนาม:\n{{link}}\n\nข้อความ:\n{{customMessage}}"
    },
    complete: {
      subject: "เอกสารเสร็จสมบูรณ์: {{title}}",
      body: "สวัสดี {{name}},\n\nเอกสาร \"{{title}}\" ได้รับการลงนามเรียบร้อยแล้ว\n\nกรุณาคลิกลิงก์ด้านล่างเพื่อดาวน์โหลดเอกสารฉบับสมบูรณ์:\n{{link}}"
    }
  }
};

interface SendEmailParams {
  to: string;
  templateType: 'invite' | 'complete';
  language: string;
  data: {
    name: string;
    title: string;
    sender: string;
    link: string;
    customMessage?: string;
  };
}

// In a real production app, this would call a Supabase Edge Function or backend API.
// For this MVP/Demo, we will simulate the email sending and log it to the console,
// and potentially store it in a 'notifications' table if we had one.
export const sendEmail = async ({ to, templateType, language, data }: SendEmailParams) => {
  // Fallback to English if language not supported
  const lang = EMAIL_TEMPLATES[language] ? language : 'en';
  const template = EMAIL_TEMPLATES[lang][templateType];

  let subject = template.subject;
  let body = template.body;

  // Replace variables
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value || '');
    body = body.replace(regex, value || '');
  });

  console.log('--- SIMULATING EMAIL SENDING ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log('--------------------------------');

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return { success: true };
};

export const sendInviteEmails = async (documentId: string) => {
  // 1. Fetch document and signers
  const { data: doc } = await supabase.from('documents').select('*, users(name)').eq('id', documentId).single();
  const { data: signers } = await supabase.from('signers').select('*').eq('document_id', documentId);

  if (!doc || !signers) return;

  const senderName = doc.users?.name || 'HH Tools User';
  const baseUrl = window.location.origin;

  // 2. Send emails
  for (const signer of signers) {
    // Determine language: Viewer -> 'en', Signer -> doc.language
    const lang = signer.role === 'viewer' ? 'en' : doc.language;
    
    const link = `${baseUrl}/sign/${signer.token}`;

    await sendEmail({
      to: signer.email,
      templateType: 'invite',
      language: lang,
      data: {
        name: signer.name,
        title: doc.title,
        sender: senderName,
        link: link,
        customMessage: doc.email_body
      }
    });
  }
};
