import { Clock } from 'lucide-react'
import LayerPanel from '../LayerPanel/LayerPanel'
import HistoryPanel from './HistoryPanel'

export default function DesktopSidebar({
  width,
  nodes,
  selectedNodeId,
  transformEnabled,
  onSelectNode,
  onActivateTransform,
  onToggleVisible,
  onReorder,
  onNewLayer,
  onOpacityStart,
  onOpacityChange,
  onDelete,
  historyEntries,
  onRestoreDocument,
}) {
  return (
    <div
      className="hidden sm:flex flex-col bg-[#24272f] overflow-hidden shrink-0"
      style={{ width }}
    >
      {/* Layers section — takes up to half the sidebar, scrolls internally */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden border-b border-white/10">
        <LayerPanel
          embedded
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          transformEnabled={transformEnabled}
          onSelectNode={onSelectNode}
          onActivateTransform={onActivateTransform}
          onToggleVisible={onToggleVisible}
          onReorder={onReorder}
          onNewLayer={onNewLayer}
          onOpacityStart={onOpacityStart}
          onOpacityChange={onOpacityChange}
          onDelete={onDelete}
        />
      </div>

      {/* History section — takes remaining space */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 shrink-0">
          <Clock size={13} className="text-white/40" />
          <span className="text-sm font-semibold text-white">History</span>
          <span className="text-xs text-white/30 ml-auto">{historyEntries.length}/5</span>
        </div>
        <HistoryPanel
          entries={historyEntries}
          onRestore={onRestoreDocument}
        />
      </div>
    </div>
  )
}
