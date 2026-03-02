import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spin, message, Modal, Tabs } from 'antd';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../utils/supabase';
import { getDocument } from '../utils/pdfWorker';
import { SaveOutlined, ClearOutlined, LeftOutlined, RightOutlined, CheckCircleOutlined } from '@ant-design/icons';

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

const Sign: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [docData, setDocData] = useState<any>(null);
  const [signerData, setSignerData] = useState<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const renderTaskRef = useRef<any>(null);

  // Fetch document and signer info by token
  const fetchDocInfo = async () => {
    if (!token) return;

    try {
      // 1. Get signer info by token
      const { data: signer, error: signerError } = await supabase
        .from('signers')
        .select('*')
        .eq('token', token)
        .single();

      if (signerError || !signer) throw new Error('无效的签字链接');
      setSignerData(signer);

      // 2. Get document info
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', signer.document_id)
        .single();

      if (docError || !doc) throw new Error('文档不存在');
      setDocData(doc);

      // 3. Get existing signatures
      const { data: sigs, error: sigsError } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', signer.document_id)
        .eq('signer_id', signer.id);
        
      if (sigs) setSignatures(sigs);

      // 4. Download PDF file
      // Check if we already have the PDF loaded to avoid re-downloading on every refresh
      if (!pdfDoc) {
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(doc.file_url);

        if (fileError) throw fileError;

        // 5. Load PDF
        const arrayBuffer = await fileData.arrayBuffer();
        const loadingTask = getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      }

      // 6. If user is a viewer, we wait for manual confirmation
    } catch (error: any) {
      console.error('Error loading document:', error);
      message.error(error.message || '加载文档失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocInfo();
  }, [token]);

  // Render PDF Page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel previous render if any
      if (renderTaskRef.current) {
        await renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('Render error:', error);
        }
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  const handleFieldClick = (field: Field) => {
    // Check if already signed
    if (signatures.some(s => s.field_id === field.id)) {
      message.info('该区域已签字');
      return;
    }
    setActiveFieldId(field.id);
    setSignModalVisible(true);
  };

  // Check if all signers (including viewers) have signed/read
  const checkAllCompleted = async (docId: string) => {
    try {
      const { data: allSigners, error } = await supabase
        .from('signers')
        .select('status')
        .eq('document_id', docId);

      if (error) throw error;

      const allDone = allSigners?.every(s => s.status === 'signed');
      if (allDone) {
        // Update document status to completed
        const { error: docUpdateError } = await supabase
          .from('documents')
          .update({ status: 'completed' })
          .eq('id', docId);
        
        if (docUpdateError) throw docUpdateError;

        message.success('文档已全部完成！');
      }
    } catch (err) {
      console.error('Error checking completion:', err);
    }
  };

  const handleSignSubmit = async () => {
    if (sigCanvas.current?.isEmpty()) {
      message.warning('请先签名');
      return;
    }

    if (!activeFieldId) return;

    const signatureData = sigCanvas.current?.toDataURL(); // Base64 image
    const currentField = signerData.fields.find((f: Field) => f.id === activeFieldId);
    
    try {
      setLoading(true);
      // 1. Save signature record
      const { error: sigError } = await supabase
        .from('signatures')
        .insert({
          document_id: docData.id,
          signer_id: signerData.id,
          signature_data: signatureData,
          signature_type: 'draw',
          position: currentField ? { page: currentField.page, x: currentField.x, y: currentField.y } : { page: pageNum, x: 100, y: 100 },
          field_id: activeFieldId
        });

      if (sigError) throw sigError;

      // Update local signatures state
      setSignatures([...signatures, { field_id: activeFieldId, signature_data: signatureData }]);

      // 2. Check if all fields are signed
      const allFields = signerData.fields || [];
      const signedFieldIds = new Set([...signatures.map(s => s.field_id), activeFieldId]);
      const allSigned = allFields.every((f: Field) => signedFieldIds.has(f.id));

      if (allSigned) {
        const { error: updateError } = await supabase
          .from('signers')
          .update({ status: 'signed' })
          .eq('id', signerData.id);

        if (updateError) throw updateError;
        
        // Update local signer data
        setSignerData({ ...signerData, status: 'signed' });
        message.success('所有签字已完成！');
        
        // Check global completion
        await checkAllCompleted(docData.id);
      } else {
        message.success('签字保存成功，请继续签署剩余区域');
      }

      setSignModalVisible(false);
      
    } catch (error: any) {
      console.error('Submit error:', error);
      message.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleViewerRead = async () => {
    try {
      setLoading(true);
      const { error: updateError } = await supabase
        .from('signers')
        .update({ status: 'signed' })
        .eq('id', signerData.id);

      if (updateError) throw updateError;

      setSignerData({ ...signerData, status: 'signed' });
      message.success('已确认为已读');
      
      // Check global completion
      await checkAllCompleted(docData.id);

    } catch (error: any) {
      console.error('Update error:', error);
      message.error('确认失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !pdfDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="正在加载文档..." />
      </div>
    );
  }

  const fieldsOnPage = signerData?.fields?.filter((f: Field) => f.page === pageNum) || [];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{docData?.title || '文档签署'}</h1>
          <p className="text-sm text-gray-500">
            {signerData?.role === 'viewer' ? '您是阅览者' : `签署人: ${signerData?.name}`}
          </p>
        </div>
        <div className="flex gap-4">
           {/* Pagination Controls */}
           <div className="flex items-center gap-2 mr-4 bg-gray-50 rounded-lg px-2">
            <Button 
              type="text" 
              icon={<LeftOutlined />} 
              disabled={pageNum <= 1} 
              onClick={() => setPageNum(p => p - 1)}
            />
            <span className="text-gray-600 font-medium">
              {pageNum} / {numPages}
            </span>
            <Button 
              type="text" 
              icon={<RightOutlined />} 
              disabled={pageNum >= numPages} 
              onClick={() => setPageNum(p => p + 1)}
            />
          </div>

          {signerData?.status === 'signed' ? (
             <Button type="primary" disabled icon={<CheckCircleOutlined />}>已完成签署</Button>
          ) : signerData?.role === 'viewer' ? (
             <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleViewerRead}>确认已读</Button>
          ) : null}
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="flex-1 overflow-auto p-8 flex justify-center">
        <div className="relative shadow-lg">
           <canvas ref={canvasRef} className="bg-white" />
           
           {/* Render Fields Overlay */}
           {fieldsOnPage.map((field: Field) => {
             const signature = signatures.find(s => s.field_id === field.id);
             return (
               <div
                 key={field.id}
                 style={{
                   position: 'absolute',
                   left: field.x,
                   top: field.y,
                   width: field.width,
                   height: field.height,
                   border: signature ? '2px solid #22c55e' : '2px dashed #2563eb',
                   backgroundColor: signature ? 'rgba(34, 197, 94, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                 }}
                 onClick={() => handleFieldClick(field)}
               >
                 {signature ? (
                   <img src={signature.signature_data} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                 ) : (
                   <div className="text-blue-600 font-bold text-sm">点击签字</div>
                 )}
               </div>
             );
           })}
        </div>
      </main>

      {/* Signature Modal */}
      <Modal
        title="请在下方签名"
        open={signModalVisible}
        onCancel={() => setSignModalVisible(false)}
        footer={[
          <Button key="clear" icon={<ClearOutlined />} onClick={() => sigCanvas.current?.clear()}>
            清除
          </Button>,
          <Button key="submit" type="primary" icon={<SaveOutlined />} onClick={handleSignSubmit} loading={loading}>
            确认并提交
          </Button>,
        ]}
        width={600}
      >
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              width: 550,
              height: 300,
              className: 'cursor-crosshair'
            }}
            backgroundColor="rgba(255, 255, 255, 0)"
          />
        </div>
        <p className="text-center text-gray-400 mt-2 text-sm">
          使用鼠标或触控板在上方区域书写您的签名
        </p>
      </Modal>
    </div>
  );
};

export default Sign;
