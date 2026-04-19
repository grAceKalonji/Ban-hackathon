interface Props {
  checked: boolean;
  onChange: (val: boolean) => void;
  labelOff: string;
  labelOn: string;
}

export default function Toggle({ checked, onChange, labelOff, labelOn }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
      aria-pressed={checked}
    >
      <span className={`text-sm transition-colors ${checked ? 'text-slate-400' : 'text-white font-medium'}`}>
        {labelOff}
      </span>
      <span
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
        style={{ backgroundColor: checked ? '#3b82f6' : '#334155' }}
      >
        <span
          className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </span>
      <span className={`text-sm transition-colors ${checked ? 'text-white font-medium' : 'text-slate-400'}`}>
        {labelOn}
      </span>
    </button>
  );
}
