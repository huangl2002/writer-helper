interface Props {
  onAddVolume: () => void;
  onAddChapter: () => void;
  onRename: () => void;
  onDelete: () => void;
  isWork?: boolean;
}

export function ChapterActions({
  onAddVolume,
  onAddChapter,
  onRename,
  onDelete,
  isWork,
}: Props) {
  return (
    <span className="inline-flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {isWork && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddVolume();
          }}
          title="新建卷"
          className="text-xs px-1 hover:text-accent"
        >
          +卷
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddChapter();
        }}
        title="新建章节"
        className="text-xs px-1 hover:text-accent"
      >
        +章
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        title="重命名"
        className="text-xs px-1 hover:text-accent"
      >
        ✎
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="删除"
        className="text-xs px-1 hover:text-red-500"
      >
        ✕
      </button>
    </span>
  );
}
