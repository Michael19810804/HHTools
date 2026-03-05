import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  Input,
  Button,
  Upload,
  Select,
  Card,
  Typography,
  Steps,
  message,
  Space,
  List,
  Tag,
  Divider,
  Spin,
  Tooltip
} from 'antd';
import { 
  InboxOutlined, 
  MinusCircleOutlined, 
  PlusOutlined, 
  UserOutlined,
  FilePdfOutlined,
  DragOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/authStore';
import { FIXED_VIEWERS, LANGUAGES } from '../utils/constants';
import { sendInviteEmails } from '../utils/emailService';
import { getDocument } from '../utils/pdfWorker';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const { Option } = Select;

interface Field {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'signature';
  signerIndex: number;
}

const UploadPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // PDF State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pageWidths, setPageWidths] = useState<number[]>([]);
  
  // Fields State
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedSignerIndex, setSelectedSignerIndex] = useState<number>(0);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load PDF when file is selected
  useEffect(() => {
    const loadPdf = async () => {
      if (fileList.length === 0) {
        setPdfDoc(null);
        setNumPages(0);
        return;
      }

      try {
        setLoadingPdf(true);
        const file = fileList[0].originFileObj as File;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        
        // Pre-calculate page widths for rendering
        const widths: number[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.0 });
          widths.push(viewport.width);
        }
        setPageWidths(widths);

      } catch (error) {
        console.error('Error loading PDF', error);
        message.error('无法加载 PDF 文件预览');
      } finally {
        setLoadingPdf(false);
      }
    };

    loadPdf();
  }, [fileList]);

  // Render PDF pages
  useEffect(() => {
    if (!pdfDoc || currentStep !== 2) return;

    const renderPages = async () => {
      for (let i = 1; i <= numPages; i++) {
        const canvas = document.getElementById(`pdf-page-${i}`) as HTMLCanvasElement;
        if (!canvas) continue;

        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 }); // Adjust scale as needed
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      }
    };

    renderPages();
  }, [pdfDoc, numPages, currentStep]);

  const addField = () => {
    const newField: Field = {
      id: Math.random().toString(36).substr(2, 9),
      page: 1, // Default to page 1
      x: 100,
      y: 100,
      width: 240, // Doubled from 120
      height: 120, // Doubled from 60
      type: 'signature',
      signerIndex: selectedSignerIndex,
    };
    setFields([...fields, newField]);
  };

  const updateFieldPosition = (id: string, x: number, y: number) => {
    setFields(fields.map(f => f.id === id ? { ...f, x, y } : f));
  };
  
  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedField(id);
    e.dataTransfer.effectAllowed = 'move';
    // Calculate offset inside the element
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    }));
  };

  const handleDragOver = (e: React.DragEvent, pageIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, pageIndex: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    const { id, offsetX, offsetY } = JSON.parse(data);
    const container = containerRefs.current[pageIndex];
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left - offsetX;
    const y = e.clientY - containerRect.top - offsetY;

    setFields(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, page: pageIndex + 1, x: Math.max(0, x), y: Math.max(0, y) };
      }
      return f;
    }));
    setDraggedField(null);
  };

  const handleUpload = async (values: any) => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    if (fileList.length === 0) {
      message.error('请上传PDF文件');
      return;
    }

    // Check if all signers have at least one field
    const signers = form.getFieldValue('signers') || [];
    if (signers.length > 0) {
      for (let i = 0; i < signers.length; i++) {
        // Skip viewers
        if (signers[i].role === 'viewer') continue;

        const hasField = fields.some(f => f.signerIndex === i);
        if (!hasField) {
          message.warning(`签字人 ${signers[i].name || (i + 1)} 还没有分配签字区域`);
          return;
        }
      }
    }

    setUploading(true);
    try {
      const file = fileList[0].originFileObj as File;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // 1. Upload file to Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Create Document Record
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: values.title,
          file_url: fileName, 
          email_subject: values.email_subject,
          email_body: values.email_body,
          language: values.language,
          status: 'pending',
        })
        .select()
        .single();

      if (docError) throw docError;

      // 3. Create Signers Records with Fields
      
      // Filter only signers for index calculation (viewers have index 0)
      let signerCounter = 0;

      const allSigners = signers.map((s: any) => {
        const isSigner = s.role === 'signer';
        const currentIndex = isSigner ? ++signerCounter : 0;
        
        // Find the original index in the form list to match fields
        // We need to be careful here if the user reordered or deleted items.
        // But since we use fields.filter(f => f.signerIndex === index), 'index' refers to the array index in 'signers'.
        // Let's find the index of this signer object in the 'signers' array.
        const originalIndex = signers.indexOf(s);

        return {
          document_id: docData.id,
          email: s.email,
          name: s.name,
          role: s.role,
          order_index: currentIndex,
          token: Math.random().toString(36).substring(2) + Date.now().toString(36), 
          status: 'pending',
          fields: isSigner ? fields.filter(f => f.signerIndex === originalIndex) : [], // Add fields only if signer
          language: s.language || 'en'
        };
      });

      const { error: signersError } = await supabase
        .from('signers')
        .insert(allSigners);

      if (signersError) throw signersError;

      // 4. Send Invite Emails
      await sendInviteEmails(docData.id);

      message.success('文档创建成功并已发送邮件！');
      navigate('/tools/sign');

    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(error.message || '创建失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
      setPdfDoc(null);
    },
    beforeUpload: (file: File) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error('只能上传 PDF 文件!');
        return Upload.LIST_IGNORE;
      }
      const uploadFile: UploadFile = {
        uid: Date.now().toString(),
        name: file.name,
        status: 'done',
        originFileObj: file as RcFile,
      };
      setFileList([uploadFile]);
      
      // Auto-fill title with filename (without extension)
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      form.setFieldsValue({ 
        title: fileNameWithoutExt,
        email_subject: fileNameWithoutExt // Auto-fill email subject
      });
      
      return false;
    },
    fileList,
  };

  const getSignerName = (index: number) => {
    const signers = form.getFieldValue('signers');
    return signers && signers[index] ? signers[index].name : `签字人 ${index + 1}`;
  };

  const getSignerRole = (index: number) => {
    const signers = form.getFieldValue('signers');
    return signers && signers[index] ? signers[index].role : 'signer';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-5xl mx-auto shadow-md">
        <div className="mb-8">
          <Button onClick={() => navigate('/tools/sign')} className="mb-4">
            返回电子签字
          </Button>
          <Steps current={currentStep} items={[
            { title: '上传文档' },
            { title: '设置信息' },
            { title: '指定位置' },
            { title: '完成' },
          ]} />
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
          initialValues={{ 
            signers: [
              ...FIXED_VIEWERS.map(v => ({ name: v.name, email: v.email, role: 'viewer', language: 'en' })),
              {}, // Empty signer for user to fill
            ],
            email_body: "Dear user, welcome to the MXL-HH Signature Service System. You can sign documents directly via email. Once completed, the system will automatically collect all signatories' information and send the final text to you as a backup."
          }}
        >
          {/* Step 0: File Upload */}
          <div className={currentStep === 0 ? 'block' : 'hidden'}>
            <Form.Item
              name="title"
              label="文档标题"
              rules={[{ required: true, message: '请输入文档标题' }]}
            >
              <Input placeholder="例如：2024年度销售合同" size="large" />
            </Form.Item>

            <Form.Item label="上传PDF" required>
              <Dragger {...uploadProps} height={200}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">仅支持 PDF 格式文件</p>
              </Dragger>
            </Form.Item>

            <Button type="primary" onClick={() => {
               if (fileList.length > 0 && form.getFieldValue('title')) {
                 setCurrentStep(1);
               } else {
                 message.warning('请填写标题并上传文件');
               }
            }} block size="large" className="mt-4">
              下一步：设置信息
            </Button>
          </div>

          {/* Step 1: Signer Settings */}
          <div className={currentStep === 1 ? 'block' : 'hidden'}>
            <Divider style={{ borderColor: '#e5e7eb' }}>邮件通知设置</Divider>
            
            <Form.Item
              name="email_subject"
              label="邮件主题"
              rules={[{ required: true, message: '请输入邮件主题' }]}
            >
              <Input placeholder="请签署..." />
            </Form.Item>

            <Form.Item
              name="email_body"
              label="邮件内容"
            >
              <TextArea rows={4} placeholder="请输入给签字人的留言..." />
            </Form.Item>

            {/* 签字人列表 */}
            <Divider>签字人管理</Divider>
            <Form.List name="signers">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'role']}
                        initialValue="signer"
                        rules={[{ required: true, message: '选择角色' }]}
                      >
                        <Select style={{ width: 100 }} options={[
                          { label: '签字人', value: 'signer' },
                          { label: '阅览者', value: 'viewer' }
                        ]} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '缺少姓名' }]}
                      >
                        <Input placeholder="姓名" prefix={<UserOutlined />} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'email']}
                        rules={[{ required: true, message: '缺少邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
                      >
                        <Input placeholder="邮箱地址" style={{ width: 250 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'language']}
                        initialValue="en"
                        rules={[{ required: true, message: '选择语言' }]}
                      >
                        <Select style={{ width: 100 }} options={LANGUAGES} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      )}
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加签字人
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <div className="flex gap-4 mt-8">
              <Button onClick={() => setCurrentStep(0)} block size="large">
                上一步
              </Button>
              <Button type="primary" onClick={() => {
                form.validateFields().then(() => {
                  setCurrentStep(2);
                }).catch(() => {
                  message.error('请填写完整的表单信息');
                });
              }} block size="large">
                下一步：指定签字位置
              </Button>
            </div>
          </div>

          {/* Step 2: Place Fields */}
          <div className={currentStep === 2 ? 'block' : 'hidden'}>
             <div className="flex gap-6 h-[70vh]">
               {/* Left Sidebar: Tools */}
               <div className="w-64 flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm overflow-y-auto">
                 <Title level={5}>配置工具</Title>
                 
                 <div>
                   <label className="text-gray-600 text-sm mb-2 block">选择签字人</label>
                   <Select 
                     value={selectedSignerIndex} 
                     onChange={setSelectedSignerIndex} 
                     className="w-full"
                   >
                     {form.getFieldValue('signers')?.map((signer: any, index: number) => {
                       // Only show actual signers, not viewers
                       if (signer.role === 'viewer') return null;
                       
                       return (
                         <Option key={index} value={index}>
                           <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full bg-${['blue','green','orange','purple'][index % 4]}-500`}></div>
                             {signer.name || `签字人 ${index + 1}`}
                           </div>
                         </Option>
                       );
                     })}
                   </Select>
                 </div>

                 <Button 
                   type="primary" 
                   icon={<EditOutlined />} 
                   onClick={addField}
                   className="w-full h-12 flex items-center justify-center"
                 >
                   添加签字区域
                 </Button>

                 <div className="text-xs text-gray-400 mt-2">
                   点击上方按钮添加签字框，然后拖拽到PDF页面上的正确位置。
                 </div>

                 <Divider />
                 
                 <div className="flex-1 overflow-y-auto">
                   <Title level={5} className="text-sm">已添加区域</Title>
                   <List
                     size="small"
                     dataSource={fields}
                     renderItem={item => (
                       <List.Item
                         className="bg-gray-50 mb-2 rounded border border-gray-200"
                         actions={[<DeleteOutlined key="del" onClick={() => removeField(item.id)} className="text-red-500 cursor-pointer" />]}
                       >
                         <div className="text-xs">
                           <span className={`inline-block w-2 h-2 rounded-full mr-2 bg-${['blue','green','orange','purple'][item.signerIndex % 4]}-500`}></span>
                           P{item.page}: {getSignerName(item.signerIndex)}
                         </div>
                       </List.Item>
                     )}
                   />
                 </div>
               </div>

               {/* Right: PDF Preview */}
               <div className="flex-1 bg-gray-200 overflow-y-auto p-4 rounded-lg relative flex flex-col items-center gap-4">
                 {loadingPdf ? (
                   <Spin size="large" tip="加载文档中..." className="mt-20" />
                 ) : (
                   Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                     <div 
                       key={pageNum} 
                       className="relative shadow-lg bg-white"
                       ref={el => containerRefs.current[pageNum - 1] = el}
                       onDragOver={(e) => handleDragOver(e, pageNum - 1)}
                       onDrop={(e) => handleDrop(e, pageNum - 1)}
                     >
                       <canvas id={`pdf-page-${pageNum}`} className="block" />
                       
                       {/* Render Fields for this page */}
                       {fields.filter(f => f.page === pageNum).map((field) => (
                         <div
                           key={field.id}
                           draggable
                           onDragStart={(e) => handleDragStart(e, field.id)}
                           style={{
                             position: 'absolute',
                             left: field.x,
                             top: field.y,
                             width: field.width,
                             height: field.height,
                             backgroundColor: `rgba(${['37, 99, 235', '22, 163, 74', '249, 115, 22', '147, 51, 234'][field.signerIndex % 4]}, 0.2)`,
                             border: `2px solid rgb(${['37, 99, 235', '22, 163, 74', '249, 115, 22', '147, 51, 234'][field.signerIndex % 4]})`,
                             cursor: 'move',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             color: `rgb(${['37, 99, 235', '22, 163, 74', '249, 115, 22', '147, 51, 234'][field.signerIndex % 4]})`,
                             fontWeight: 'bold',
                             fontSize: '12px',
                             zIndex: 10
                           }}
                         >
                           签字: {getSignerName(field.signerIndex)}
                           <div 
                             className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-red-600"
                             onClick={(e) => {
                               e.stopPropagation();
                               removeField(field.id);
                             }}
                           >
                             <DeleteOutlined style={{ fontSize: '10px' }} />
                           </div>
                         </div>
                       ))}
                     </div>
                   ))
                 )}
               </div>
             </div>

             <div className="flex gap-4 mt-8">
              <Button onClick={() => setCurrentStep(1)} block size="large">
                上一步
              </Button>
              <Button type="primary" htmlType="submit" loading={uploading} block size="large">
                创建文档并发送
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default UploadPage;
