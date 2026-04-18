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
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/authStore';
import { FIXED_VIEWERS, LANGUAGES } from '../utils/constants';
import { sendEmail } from '../utils/emailService';
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

const AppendSigner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [docData, setDocData] = useState<any>(null);
  const [existingSigners, setExistingSigners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch existing document and signers
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Get Document
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single();
        
        if (docError || !doc) throw new Error('无法获取文档信息');
        setDocData(doc);
        
        // Get existing signers
        const { data: signers, error: signersError } = await supabase
          .from('signers')
          .select('*')
          .eq('document_id', id)
          .order('order_index', { ascending: true });
          
        if (signersError) throw signersError;
        setExistingSigners(signers || []);

        // Load PDF File
        setLoadingPdf(true);
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(doc.file_url);

        if (fileError) throw fileError;

        const arrayBuffer = await fileData.arrayBuffer();
        const loadingTask = getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);

        const widths: number[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.0 });
          widths.push(viewport.width);
        }
        setPageWidths(widths);

      } catch (error: any) {
        console.error('Error fetching data:', error);
        message.error(error.message || '加载失败');
      } finally {
        setLoading(false);
        setLoadingPdf(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Render PDF pages
  useEffect(() => {
    if (!pdfDoc || currentStep !== 1) return;

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

  const handleAppend = async (values: any) => {
    if (!user) {
      message.error('请先登录');
      return;
    }

    const signers = form.getFieldValue('signers') || [];
    if (signers.length === 0) {
      message.warning('请添加至少一个新签字人');
      return;
    }

    for (let i = 0; i < signers.length; i++) {
      if (signers[i].role === 'viewer') continue;

      const hasField = fields.some(f => f.signerIndex === i);
      if (!hasField) {
        message.warning(`新签字人 ${signers[i].name || (i + 1)} 还没有分配签字区域`);
        return;
      }
    }

    setUploading(true);
    try {
      // Find the max order_index of existing signers
      const existingSignersCount = existingSigners.filter(s => s.role === 'signer').length;
      let signerCounter = existingSignersCount;

      const allSigners = signers.map((s: any) => {
        const isSigner = s.role === 'signer';
        const currentIndex = isSigner ? ++signerCounter : 0;
        const originalIndex = signers.indexOf(s);

        return {
          document_id: docData.id,
          email: s.email,
          name: s.name,
          role: s.role,
          order_index: currentIndex,
          token: Math.random().toString(36).substring(2) + Date.now().toString(36), 
          status: 'pending',
          fields: isSigner ? fields.filter(f => f.signerIndex === originalIndex) : [],
          language: s.language || 'en'
        };
      });

      const { data: insertedSigners, error: signersError } = await supabase
        .from('signers')
        .insert(allSigners)
        .select();

      if (signersError) throw signersError;

      // Update document status to pending if it was completed
      if (docData.status === 'completed') {
        const { error: docUpdateError } = await supabase
          .from('documents')
          .update({ status: 'pending' })
          .eq('id', docData.id);
        if (docUpdateError) throw docUpdateError;
      }

      // Send emails to the new signers
      let senderName = 'HH Tools User';
      if (docData.user_id) {
        const { data: userRecord } = await supabase.from('users').select('name').eq('id', docData.user_id).single();
        if (userRecord?.name) senderName = userRecord.name;
      }

      const PRODUCTION_URL = 'https://sign.mxlhhfamily.com';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? PRODUCTION_URL : window.location.origin;

      for (const signer of insertedSigners || []) {
        const link = `${baseUrl}/sign/${signer.token}`;
        await sendEmail({
          to: signer.email,
          templateType: 'invite',
          language: 'en',
          data: {
            name: signer.name,
            title: docData.title,
            sender: senderName,
            link: link,
            customMessage: docData.email_body || ''
          }
        });
      }

      message.success('新签字人添加成功并已发送邮件！');
      navigate('/tools/sign');

    } catch (error: any) {
      console.error('Append error:', error);
      message.error(error.message || '添加失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // Clean up unused upload logic and set initial form values
  useEffect(() => {
    if (docData) {
      form.setFieldsValue({
        title: docData.title,
        email_subject: docData.email_subject,
        email_body: docData.email_body,
        language: docData.language
      });
    }
  }, [docData, form]);

  const getSignerName = (index: number) => {
    const signers = form.getFieldValue('signers');
    return signers && signers[index] ? signers[index].name : `新签字人 ${index + 1}`;
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
            { title: '添加新签字人' },
            { title: '指定签字位置' },
            { title: '完成' },
          ]} />
        </div>

        {loading ? (
          <div className="flex justify-center p-20"><Spin size="large" /></div>
        ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAppend}
          initialValues={{ 
            signers: [{}] // Start with one empty signer
          }}
        >
          {/* Step 0: Add New Signers */}
          <div className={currentStep === 0 ? 'block' : 'hidden'}>
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
              <Title level={5} className="text-blue-800 m-0 mb-2">文档信息</Title>
              <p className="m-0 text-blue-600"><strong>标题：</strong> {docData?.title}</p>
              <p className="m-0 text-blue-600 mt-1"><strong>当前状态：</strong> {docData?.status}</p>
            </div>

            <Divider>已有签字人 (不可修改)</Divider>
            <List
              dataSource={existingSigners}
              renderItem={(item) => (
                <List.Item className="bg-gray-50 mb-2 px-4 rounded border border-gray-200">
                  <Space>
                    <Tag color={item.role === 'viewer' ? 'default' : 'blue'}>{item.role === 'viewer' ? '阅览者' : '签字人'}</Tag>
                    <Text strong>{item.name}</Text>
                    <Text type="secondary">({item.email})</Text>
                    <Tag color={item.status === 'signed' ? 'green' : 'orange'}>{item.status === 'signed' ? '已签署' : '等待中'}</Tag>
                  </Space>
                </List.Item>
              )}
            />

            <Divider>添加新签字人</Divider>
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
                      <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500 hover:text-red-700 ml-2" />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加新签字人
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <div className="flex justify-end mt-8">
              <Button type="primary" onClick={() => {
                form.validateFields().then(() => {
                  const currentSigners = form.getFieldValue('signers') || [];
                  if (currentSigners.length === 0) {
                    message.warning('请至少添加一个新签字人');
                    return;
                  }
                  setCurrentStep(1);
                }).catch(() => {
                  message.error('请填写完整的表单信息');
                });
              }} size="large" className="w-48">
                下一步：指定签字位置
              </Button>
            </div>
          </div>

          {/* Step 1: Place Fields */}
          <div className={currentStep === 1 ? 'block' : 'hidden'}>
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
                      
                      {/* Render Existing Fields */}
                      {existingSigners.map((signer) => 
                        (signer.fields || []).filter((f: any) => f.page === pageNum).map((field: any) => (
                          <div
                            key={field.id}
                            style={{
                              position: 'absolute',
                              left: field.x,
                              top: field.y,
                              width: field.width,
                              height: field.height,
                              backgroundColor: 'rgba(156, 163, 175, 0.2)',
                              border: '2px dashed rgb(156, 163, 175)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'rgb(107, 114, 128)',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              zIndex: 5
                            }}
                          >
                            [已分配] {signer.name}
                          </div>
                        ))
                      )}

                      {/* Render New Fields for this page */}
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
               <Button onClick={() => setCurrentStep(0)} block size="large">
                 上一步
               </Button>
               <Button type="primary" htmlType="submit" loading={uploading} block size="large">
                 添加并发送邮件
               </Button>
             </div>
           </div>
         </Form>
         )}
       </Card>
     </div>
   );
 };

export default AppendSigner;
