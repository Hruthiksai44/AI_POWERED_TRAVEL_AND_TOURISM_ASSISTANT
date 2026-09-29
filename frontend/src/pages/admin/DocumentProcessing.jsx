import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineDocumentText } from 'react-icons/hi2';
import { documentsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Table from '../../components/ui/Table';

export default function DocumentProcessing() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    documentsAPI.getAll().then(r => setDocuments(r.data)).catch(console.error).finally(() => setLoading(false)); 
  }, []);

  if (loading) return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <Skeleton height="36px" width="250px" className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Skeleton height="100px" rounded="2xl" />
        <Skeleton height="100px" rounded="2xl" />
        <Skeleton height="100px" rounded="2xl" />
      </div>
      <Skeleton height="400px" rounded="2xl" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Document Processing</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Monitor background processing of RAG documents</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Documents', value: documents.length, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Successfully Processed', value: documents.filter(d => d.status === 'completed').length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Pending / Failed', value: documents.filter(d => d.status !== 'completed').length, color: 'text-amber-600 dark:text-amber-400' },
        ].map(s => (
          <Card key={s.label} padding="compact">
            <p className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Table 
          columns={[
            {
              key: 'filename',
              label: 'Filename',
              render: (_, doc) => (
                <span className="text-sm font-semibold text-[var(--color-text-primary)] max-w-[250px] truncate block" title={doc.original_filename || doc.filename}>
                  {doc.original_filename || doc.filename}
                </span>
              )
            },
            {
              key: 'type',
              label: 'Type',
              render: (_, doc) => (
                <Badge variant="info" className="uppercase font-mono text-[10px]">{doc.file_type || 'Unknown'}</Badge>
              )
            },
            {
              key: 'size',
              label: 'Size',
              render: (_, doc) => (
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '-'}
                </span>
              )
            },
            {
              key: 'chunks',
              label: 'Chunks',
              render: (_, doc) => (
                <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                  {doc.chunk_count || 0}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              render: (_, doc) => (
                <Badge variant={doc.status === 'completed' ? 'success' : doc.status === 'failed' ? 'error' : 'warning'} className="uppercase">
                  {doc.status || 'Pending'}
                </Badge>
              )
            },
            {
              key: 'processed_at',
              label: 'Processed At',
              render: (_, doc) => (
                <span className="text-sm font-medium text-[var(--color-text-tertiary)]">
                  {doc.processed_at ? new Date(doc.processed_at).toLocaleString() : '-'}
                </span>
              )
            }
          ]}
          data={documents}
          loading={loading}
          emptyState={
            <EmptyState 
              icon={<HiOutlineDocumentText className="w-10 h-10" />}
              title="No documents processed"
              description="Upload documents from the Knowledge Base to see them here."
            />
          }
        />
      </motion.div>
    </div>
  );
}
