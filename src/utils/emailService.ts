import { supabase, MEMFIRE_FUNCTION_URL, SUPABASE_ANON_KEY } from './supabase';

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
      body: "Hello {{name}},\n\nThe document \"{{title}}\" has been signed by all parties (including viewers).\n\nPlease click the link below to download the final document:\n{{link}}"
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

// For this MVP/Demo, we will call the Supabase Edge Function
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

  // Convert plain text body to simple HTML for better formatting
  const htmlBody = body.replace(/\n/g, '<br>');

  try {
    // MemFire Cloud Function Direct Call
    const response = await fetch(`${MEMFIRE_FUNCTION_URL}/send_email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        to,
        subject,
        text: body,
        html: htmlBody
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return { success: true };

  } catch (error: any) {
    console.error('Failed to send email:', error);
    // Fallback log for development if function fails
    console.log(`Failed Email To: ${to}`);
    return { success: false, error };
  }
};

export const sendInviteEmails = async (documentId: string) => {
  // 1. Fetch document (Remove users join to avoid 400 error if FK is missing)
  const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).single();
  const { data: signers } = await supabase.from('signers').select('*').eq('document_id', documentId);

  if (!doc || !signers) return;

  // 2. Try to fetch sender name manually
  let senderName = 'HH Tools User';
  if (doc.user_id) {
    const { data: user } = await supabase.from('users').select('name').eq('id', doc.user_id).single();
    if (user?.name) senderName = user.name;
  }
  
  // Use production URL if in development environment to ensure recipients get a valid link
  // Or use window.location.origin if it's already deployed
  const PRODUCTION_URL = 'https://trae58e0l77j.vercel.app';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocal ? PRODUCTION_URL : window.location.origin;

  // 3. Send emails
  for (const signer of signers) {
    // Determine language: Viewer -> 'en', Signer -> 'en' (Always English as requested)
    const lang = 'en';
    
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
