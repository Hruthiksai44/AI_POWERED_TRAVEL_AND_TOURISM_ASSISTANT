import Markdown from 'react-markdown';
import { cn } from '../../utils/cn';

export default function MarkdownRenderer({ content, className }) {
  return (
    <div className={cn('space-y-3 text-[var(--color-text-secondary)] leading-relaxed text-[15px]', className)}>
      <Markdown
      components={{
        p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
        a: ({ node, ...props }) => <a className="text-[var(--color-brand-600)] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-semibold text-[var(--color-text-primary)]" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
        li: ({ node, ...props }) => <li className="pl-1 text-[var(--color-text-secondary)]" {...props} />,
        code: ({ node, className, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          return !match ? (
            <code className="px-1.5 py-0.5 rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-brand-600)] font-mono text-[13px]" {...props} />
          ) : (
            <pre className="p-3 my-3 rounded-xl bg-[var(--color-bg-secondary)] overflow-x-auto text-[13px] font-mono border border-[var(--color-border-primary)]">
              <code className={className} {...props} />
            </pre>
          );
        },
        h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-[var(--color-text-primary)]" {...props} />,
        h4: ({ node, ...props }) => <h4 className="text-base font-semibold mt-3 mb-2 text-[var(--color-text-primary)]" {...props} />,
      }}
    >
      {content}
      </Markdown>
    </div>
  );
}
