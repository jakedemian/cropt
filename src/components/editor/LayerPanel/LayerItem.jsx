import { Eye, EyeOff, Paintbrush, Move } from 'lucide-react'

export default function LayerItem({
  node,
  index,
  isSelected,
  transformEnabled,
  isDragging,
  showDropAbove,
  showDropBelow,
  onSelect,
  onActivateTransform,
  onToggleVisible,
  onDragHandlePointerDown,
}) {
  return (
    <>
      {/* Drop indicator — above this item */}
      {showDropAbove && (
        <div className="h-0.5 bg-[#0fff95] mx-2 rounded-full" />
      )}

      <div
        onClick={onSelect}
        className={`flex items-center gap-2 px-2 py-2.5 sm:py-1.5 rounded cursor-pointer select-none transition-colors ${
          isSelected ? 'bg-[rgba(15,255,149,0.15)]' : 'hover:bg-white/5'
        } ${isDragging ? 'opacity-40' : ''}`}
        title="Target this layer"
      >
        {/* Drag handle */}
        <div
          className="flex flex-col gap-0.5 px-1 py-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
          onPointerDown={onDragHandlePointerDown}
        >
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-0.5">
              {[0, 1].map((col) => (
                <div key={col} className="w-1 h-1 rounded-full bg-white/30" />
              ))}
            </div>
          ))}
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 sm:w-9 sm:h-9 rounded overflow-hidden shrink-0 bg-[#363b44] flex items-center justify-center">
          {node.type === 'image' && node.src && (
            <img
              src={node.src}
              alt=""
              className="w-full h-full object-contain"
              style={{ opacity: node.opacity }}
              draggable={false}
            />
          )}
          {node.type === 'text' && (
            <span
              className="text-base font-bold leading-none select-none"
              style={{
                color: node.fill || '#fff',
                WebkitTextStroke: node.stroke ? `0.5px ${node.stroke}` : undefined,
              }}
            >
              {node.text ? node.text.slice(0, 2).toUpperCase() : 'T'}
            </span>
          )}
          {node.type === 'raster' && (
            node.dataUrl
              ? <img src={node.dataUrl} alt="" className="w-full h-full object-contain" style={{ opacity: node.opacity }} draggable={false} />
              : <Paintbrush size={14} className="text-white/30" />
          )}
        </div>

        {/* Name */}
        <span className="flex-1 text-xs text-white truncate">
          {node.name || (node.type === 'text' ? 'Text' : `Layer ${index + 1}`)}
        </span>

        {/* Transform / move button — activates transformer for this layer */}
        <button
          onClick={(e) => { e.stopPropagation(); onActivateTransform() }}
          className={`shrink-0 p-2.5 sm:p-1.5 rounded transition-colors ${
            isSelected && transformEnabled
              ? 'text-[#0fff95] bg-[rgba(15,255,149,0.15)]'
              : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
          title="Move / transform this layer"
        >
          <Move size={16} />
        </button>

        {/* Visibility toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisible() }}
          className={`shrink-0 p-2.5 sm:p-1.5 rounded transition-colors ${
            node.visible ? 'text-white/60 hover:text-white' : 'text-white/20 hover:text-white/40'
          }`}
          title={node.visible ? 'Hide layer' : 'Show layer'}
        >
          {node.visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>

      {/* Drop indicator — below this item (only for last slot) */}
      {showDropBelow && (
        <div className="h-0.5 bg-[#0fff95] mx-2 rounded-full" />
      )}
    </>
  )
}
