import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineArrowUpTray, HiOutlineTrash, HiOutlineArrowPath, HiOutlineDocumentText } from 'react-icons/hi2';
import { documentsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

const statusColors = { 
  pending: 'warning', 
  processing: 'info', 
  completed: 'success', 
  failed: 'error' 
};

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const fetchDocs = () => { 
    documentsAPI.getAll().then(r => setDocuments(r.data)).catch(console.error).finally(() => setLoading(false)); 
  };
  useEffect(fetchDocs, []);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext)) { 
        toast.error(`Unsupported format: ${file.name}`); 
        continue; 
      }
      try {
        await documentsAPI.upload(file);
        toast.success(`Uploaded: ${file.name}`);
      } catch { 
        toast.error(`Failed to upload: ${file.name}`); 
      }
    }
    setUploading(false); 
    fetchDocs();
    
    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleProcess = async (id) => {
    try { 
      await documentsAPI.process(id); 
      toast.success('Processing started'); 
      fetchDocs(); 
    } catch { 
      toast.error('Failed to start processing'); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document from the Knowledge Base?')) return;
    try { 
      await documentsAPI.delete(id); 
      toast.success('Document deleted'); 
      fetchDocs(); 
    } catch { 
      toast.error('Error deleting document'); 
    }
  };

  const handleDrop = (e) => { 
    e.preventDefault(); 
    setDragOver(false); 
    handleUpload(e.dataTransfer.files); 
  };

  if (loading) return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <Skeleton height="36px" width="250px" className="mb-4" />
      <Skeleton height="200px" rounded="2xl" className="mb-6" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} height="80px" rounded="xl" />)}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Knowledge Base</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage documents used for AI Retrieval-Augmented Generation (RAG)</p>
      </motion.div>

      {/* Upload Area */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div 
          className={`relative p-12 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer overflow-hidden ${
            dragOver 
              ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/20' 
              : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-[var(--color-bg-primary)]'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }} 
          onDragLeave={() => setDragOver(false)} 
          onDrop={handleDrop}
        >
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt" onChange={e => handleUpload(e.target.files)} className="hidden" />
          
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-[var(--color-bg-primary)] text-[var(--color-text-tertiary)] shadow-sm'}`}>
            {uploading ? (
              <HiOutlineArrowPath className="w-8 h-8 animate-spin text-indigo-500" />
            ) : (
              <HiOutlineArrowUpTray className="w-8 h-8" />
            )}
          </div>
          
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
            {uploading ? 'Uploading documents...' : 'Click or drag files to upload'}
          </h3>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Supports PDF, DOCX, and TXT (max 10MB per file)
          </p>

          {/* Animated background rings for drag state */}
          {dragOver && (
            <>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square rounded-full border border-indigo-200 dark:border-indigo-800/30 animate-[ping_2s_ease-in-out_infinite] opacity-50 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square rounded-full border border-indigo-300 dark:border-indigo-700/30 animate-[ping_2s_ease-in-out_infinite_0.5s] opacity-30 pointer-events-none" />
            </>
          )}
        </div>
      </motion.div>

      {/* Document List */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Indexed Documents</h2>
        
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc, i) => (
              <motion.div 
                key={doc.id} 
                initial={{ x: -20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                transition={{ delay: i * 0.05 }}
              >
                <Card padding="compact" className="flex flex-col sm:flex-row sm:items-center gap-4 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <HiOutlineDocumentText className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--color-text-primary)] truncate" title={doc.original_filename || doc.filename}>
                      {doc.original_filename || doc.filename}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium text-[var(--color-text-tertiary)]">
                      <span className="uppercase tracking-wider">{doc.file_type || 'TXT'}</span>
                      {doc.file_size && <span>{(doc.file_size / 1024).toFixed(1)} KB</span>}
                      {doc.chunk_count > 0 && <span className="text-[var(--color-text-secondary)]">{doc.chunk_count} vector chunks</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-4 sm:pt-0 border-t border-[var(--color-border-primary)] sm:border-0 mt-2 sm:mt-0">
                    <Badge variant={statusColors[doc.status] || 'info'} className="uppercase shrink-0">
                      {doc.status || 'Pending'}
                    </Badge>
                    
                    <div className="flex gap-2">
                      {doc.status !== 'completed' && (
                        <button 
                          onClick={() => handleProcess(doc.id)} 
                          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors bg-[var(--color-bg-secondary)] sm:bg-transparent" 
                          title="Process Document"
                        >
                          <HiOutlineArrowPath className={`w-4 h-4 ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(doc.id)} 
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors bg-[var(--color-bg-secondary)] sm:bg-transparent sm:opacity-0 sm:group-hover:opacity-100" 
                        title="Delete Document"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={<HiOutlineDocumentText className="w-10 h-10" />}
            title="Knowledge Base is empty"
            description="Upload documents above to provide the AI Assistant with business knowledge."
          />
        )}
      </motion.div>
    </div>
  );
}
