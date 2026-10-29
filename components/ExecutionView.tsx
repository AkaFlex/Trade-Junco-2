
import React, { useState, useEffect } from 'react';
import { TradeRequest } from '../types';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { savePaymentInfo } from '../services/tradeService';
import { uploadFiles, acceptAttr } from '../services/uploadService';
import { useToast } from './shared/Toast';
import { Camera, ArrowLeft, UploadCloud, CheckCircle, Clock, Image as ImageIcon, Lock, Wallet } from 'lucide-react';

interface Props {
  request: TradeRequest;
  onBack: () => void;
}

export const ExecutionView: React.FC<Props> = ({ request: initialRequest, onBack }) => {
  const [request, setRequest] = useState<TradeRequest>(initialRequest);
  
  const [pixData, setPixData] = useState({ 
      key: initialRequest.pixKey || '', 
      holder: initialRequest.pixHolder || '', 
      cpf: initialRequest.pixCpf || '' 
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(initialRequest.photoUrls || (initialRequest.photoUrl ? [initialRequest.photoUrl] : []));
  const [uploadedReceipts, setUploadedReceipts] = useState<string[]>(initialRequest.receiptUrls || (initialRequest.receiptUrl ? [initialRequest.receiptUrl] : []));

  const toast = useToast();
  const isReadOnly = request.status !== 'approved';

  useEffect(() => {
    const fetchLatest = async () => {
        try {
            const docRef = doc(db, "requests", initialRequest.id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() } as TradeRequest;
                setRequest(data);
                
                const photos = data.photoUrls || (data.photoUrl ? [data.photoUrl] : []);
                const receipts = data.receiptUrls || (data.receiptUrl ? [data.receiptUrl] : []);
                
                setUploadedPhotos(photos);
                setUploadedReceipts(receipts);

                if(data.pixKey) setPixData(p => ({...p, key: data.pixKey!}));
                if(data.pixHolder) setPixData(p => ({...p, holder: data.pixHolder!}));
                if(data.pixCpf) setPixData(p => ({...p, cpf: data.pixCpf!}));
            }
        } catch (e) {
            console.error("Erro ao atualizar dados da solicitação", e);
        }
    };
    fetchLatest();
  }, [initialRequest.id]);

  const currentReports = request.salesReports || [];
  
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    
    setPixData({...pixData, cpf: v});
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'receipt') => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (isReadOnly || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const { urls, failures } = await uploadFiles(
        files,
        type === 'photo' ? 'reembolso-fotos' : 'reembolso-notas',
        type === 'photo' ? ['image'] : ['image', 'pdf'],
        (done, total) => setUploadProgress(total ? (done / total) * 100 : 100),
      );

      if (urls.length) {
        const field = type === 'photo' ? 'photoUrls' : 'receiptUrls';
        await updateDoc(doc(db, "requests", request.id), { [field]: arrayUnion(...urls) });
        if (type === 'photo') setUploadedPhotos(prev => [...prev, ...urls]);
        else setUploadedReceipts(prev => [...prev, ...urls]);
        toast.success(`${urls.length} arquivo(s) enviado(s)!`);
      }
      failures.forEach(f => toast.error('Arquivo não enviado', f.reason));
    } catch (err: any) {
      toast.error('Erro ao salvar os arquivos.', err?.message);
    } finally {
      setUploading(false);
    }
  };

  const finishRequest = async () => {
    const hasPhoto = uploadedPhotos.length > 0;
    const hasReceipt = uploadedReceipts.length > 0;

    if (!hasPhoto) return toast.warning("Pelo menos uma Foto da Ação é obrigatória.");
    if (!hasReceipt) return toast.warning("Pelo menos um Comprovante/Nota Fiscal é obrigatório.");
    if (!pixData.key) return toast.warning("Preencha a chave PIX.");
    if (!pixData.holder) return toast.warning("Preencha o titular do PIX.");
    if (!pixData.cpf) return toast.warning("Preencha o CPF do titular.");

    const latest = await getDoc(doc(db, "requests", request.id)).catch(() => null);
    if (latest?.exists() && latest.data().status !== 'approved') {
      setRequest({ id: latest.id, ...latest.data() } as TradeRequest);
      return toast.error("Esta solicitação não está mais em execução.", "Ela pode ter vencido ou sido alterada pelo gestor.");
    }

    const payment = { pixKey: pixData.key, pixHolder: pixData.holder, pixCpf: pixData.cpf };
    try {
        try {
            await savePaymentInfo(request.id, payment);
        } catch {
            // Regras antigas (antes da publicação das novas) não conhecem o subdocumento.
            await updateDoc(doc(db, "requests", request.id), payment);
        }
        await updateDoc(doc(db, "requests", request.id), { status: 'completed' });
        toast.success("Solicitação finalizada!", "Aguardando pagamento pelo setor financeiro.");
        onBack();
    } catch (e) {
        toast.error("Erro ao finalizar solicitação.");
    }
  };

  const done = request.status === 'completed' || request.status === 'paid';

  const UploadBox: React.FC<{ type: 'photo' | 'receipt'; title: string; hint: string; icon: React.ReactNode; urls: string[]; label: string }> = ({ type, title, hint, icon, urls, label }) => (
    <div className="card p-5">
      <h3 className="section-title flex items-center gap-2 mb-1">{icon}{title}</h3>
      <p className="hint mb-3">{hint}</p>
      {!isReadOnly && (
        <label className={`flex items-center justify-center gap-2 border border-dashed border-line rounded bg-paper p-4 text-navy cursor-pointer transition-colors duration-150 hover:border-navy ${uploading ? 'opacity-60 cursor-default' : ''}`}>
          <input
            type="file"
            className="sr-only"
            accept={type === 'photo' ? acceptAttr(['image']) : acceptAttr(['image', 'pdf'])}
            multiple
            disabled={uploading}
            onChange={(e) => handleFileUpload(e, type)}
          />
          <UploadCloud size={18} />
          <span className="font-condensed font-bold text-[12.5px] uppercase tracking-[.3px]">Selecionar arquivos</span>
        </label>
      )}
      {urls.length > 0 && (
        <div className="mt-3">
          <span className="badge-ok mb-2"><CheckCircle size={12} /> {urls.length} enviado(s)</span>
          <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {urls.map((url, i) => (
              <li key={url + i}>
                <a href={url} target="_blank" rel="noreferrer" className="text-[13px] hover:underline flex items-center gap-1.5"><ImageIcon size={13} /> {label} {i + 1}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-narrow view-in space-y-4">
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="iconbtn mt-1" aria-label="Voltar"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="page-title flex items-center gap-2 flex-wrap">
            Solicitar reembolso
            {isReadOnly && <span className="badge-dark"><Lock size={11} /> Travado</span>}
          </h1>
          <p className="page-sub">{request.tradeCode} · Parceiro {request.partnerCode} · {request.region}</p>
        </div>
      </div>

      {isReadOnly && (
        done ? (
          <div className="notice-ok" role="status">
            <p className="font-semibold">Solicitação finalizada</p>
            <p>Você já enviou todos os dados. Agora é só aguardar o pagamento pelo setor financeiro.</p>
          </div>
        ) : (
          <div className="notice-warn" role="status">
            <p className="font-semibold">Reembolso indisponível</p>
            <p>Esta solicitação não está em execução{request.rejectionReason ? `: ${request.rejectionReason}` : '.'} Fale com o gestor de Trade.</p>
          </div>
        )
      )}

      {currentReports.length > 0 && (
        <div className="card">
          <div className="card-head"><h3 className="section-title flex items-center gap-2"><CheckCircle size={16} /> Relatórios de Sell-Out da degustadora</h3></div>
          <ul className="divide-y divide-line">
            {currentReports.map((r, i) => (
              <li key={i} className="px-5 py-3 flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div>
                  <div className="font-semibold text-navy">{r.storeName}</div>
                  <div className="text-[12.5px] text-muted">{new Date(r.date).toLocaleDateString('pt-BR')} · Vendedor: {r.sellerName}</div>
                </div>
                <span className="badge-ok">Enviado</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isReadOnly && (
        <div className="notice-info flex items-start gap-2">
          <Clock size={16} className="mt-0.5 shrink-0" />
          <span>Preencha os dados PIX, anexe as fotos da ação e as notas fiscais (imagem ou PDF). Dá para selecionar vários arquivos de uma vez.</span>
        </div>
      )}

      <div className="card p-5">
        <h3 className="section-title flex items-center gap-2 mb-3"><Wallet size={16} /> Dados bancários (para reembolso)</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="ex-pix" className="label">Chave PIX</label>
            <input id="ex-pix" className="input" value={pixData.key} onChange={e => setPixData({ ...pixData, key: e.target.value })} disabled={isReadOnly} />
          </div>
          <div>
            <label htmlFor="ex-holder" className="label">Nome do titular</label>
            <input id="ex-holder" className="input" value={pixData.holder} onChange={e => setPixData({ ...pixData, holder: e.target.value })} disabled={isReadOnly} />
          </div>
          <div>
            <label htmlFor="ex-cpf" className="label">CPF do titular</label>
            <input id="ex-cpf" className="input" value={pixData.cpf} onChange={handleCpfChange} maxLength={14} inputMode="numeric" disabled={isReadOnly} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadBox type="photo" title="Fotos da ação" hint="Selecione todas as fotos da ação." icon={<Camera size={16} />} urls={uploadedPhotos} label="Foto" />
        <UploadBox type="receipt" title="Comprovantes" hint="Notas fiscais de custos (imagem ou PDF)." icon={<UploadCloud size={16} />} urls={uploadedReceipts} label="Comprovante" />
      </div>

      {uploading && (
        <div className="card p-4" aria-live="polite">
          <div className="flex justify-between label"><span>Enviando arquivos...</span><span>{uploadProgress.toFixed(0)}%</span></div>
          <div className="w-full bg-paper border border-line rounded h-2 overflow-hidden">
            <div className="bg-navy h-full transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {isReadOnly ? (
        done && <div className="notice-ok text-center font-condensed font-bold uppercase tracking-[.3px]">Solicitação enviada</div>
      ) : (
        <button onClick={finishRequest} disabled={uploading} className="btn-primary btn-lg w-full">
          Finalizar e pedir pagamento
        </button>
      )}
    </div>
  );
};
