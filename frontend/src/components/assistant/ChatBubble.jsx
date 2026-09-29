import { useState } from 'react';
import { HiOutlineClipboardDocument, HiOutlineCheck, HiOutlineSpeakerWave, HiOutlineArrowPath } from 'react-icons/hi2';
import Avatar from '../ui/Avatar';
import MarkdownRenderer from './MarkdownRenderer';
import ToolCallCard from './ToolCallCard';
import { cn } from '../../utils/cn';

export default function ChatBubble({ role, content, toolCalls, timestamp, onCopy, onSpeak, onRegenerate }) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeString = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={cn('flex gap-4 max-w-4xl w-full mx-auto group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar 
        size="md" 
        name={isUser ? 'User' : 'Assistant'} 
        className={isUser ? 'bg-[var(--color-brand-600)] text-white' : 'bg-indigo-600 text-white'}
      />
      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start', 'max-w-[85%]')}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
            {isUser ? 'You' : 'TravelBot'}
          </span>
          {timeString && (
            <span className="text-[11px] text-[var(--color-text-tertiary)]">{timeString}</span>
          )}
        </div>
        
        <div className={cn(
          'px-5 py-3.5 rounded-2xl shadow-sm',
          isUser ? 'bg-[var(--color-brand-600)] text-white rounded-tr-sm' : 'bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-tl-sm'
        )}>
          {content && (
            isUser ? (
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{content}</div>
            ) : (
              <MarkdownRenderer content={content} />
            )
          )}
          {toolCalls && toolCalls.length > 0 && (
            <div className="mt-3 space-y-2">
              {toolCalls.map((tc, idx) => (
                <ToolCallCard key={idx} toolName={tc.function?.name || tc.name} args={tc.function?.arguments || tc.arguments} result={tc.result} />
              ))}
            </div>
          )}
        </div>

        {/* Action Bar */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
            {onCopy && (
              <button onClick={handleCopy} className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors" title="Copy text">
                {copied ? <HiOutlineCheck className="w-4 h-4 text-emerald-500" /> : <HiOutlineClipboardDocument className="w-4 h-4" />}
              </button>
            )}
            {onSpeak && (
              <button onClick={onSpeak} className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors" title="Listen">
                <HiOutlineSpeakerWave className="w-4 h-4" />
              </button>
            )}
            {onRegenerate && (
              <button onClick={onRegenerate} className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors" title="Regenerate response">
                <HiOutlineArrowPath className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
