export default function SuggestionChips({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2 max-w-4xl w-full mx-auto justify-center">
      {suggestions.map((text, idx) => (
        <button 
          key={idx}
          onClick={() => onSelect(text)}
          className="px-4 py-2 rounded-full text-[13px] font-medium border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-brand-300)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] shadow-sm"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
