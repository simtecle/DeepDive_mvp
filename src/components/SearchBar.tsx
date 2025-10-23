type Props = {
  search: string;
  language: string;
  level: string;
  onSearchChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSubmit: () => void;
};

export function SearchBar({
  search,
  language,
  level,
  onSearchChange,
  onLanguageChange,
  onLevelChange,
  onSubmit,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 flex-1 min-w-[250px]"
        placeholder="Search topic (e.g. Java, AI, Philosophy)"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <select
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
      >
        <option value="">All languages</option>
        <option value="en">English</option>
        <option value="de">German</option>
      </select>
      <select
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
        value={level}
        onChange={(e) => onLevelChange(e.target.value)}
      >
        <option value="">All levels</option>
        <option value="Beginner">Beginner</option>
        <option value="Intermediate">Intermediate</option>
        <option value="Advanced">Advanced</option>
      </select>
      <button
        className="bg-neutral-200 text-neutral-900 rounded-lg px-3 py-2"
        onClick={onSubmit}
      >
        Search
      </button>
    </div>
  );
}