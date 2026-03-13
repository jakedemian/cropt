import LayerPanel from '../LayerPanel/LayerPanel'
import HistoryPanel from './HistoryPanel'

export default function DesktopSidebar({
  nodes,
  selectedNodeId,
  onSelectNode,
  onToggleVisible,
  onReorder,
  historyEntries,
  onRestoreDocument,
}) {
  return (
    <div className="hidden sm:flex flex-col w-56 border-l border-white/10 bg-[#24272f] overflow-hidden shrink-0">
      {/* Layers section — takes up to half the sidebar, scrolls internally */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden border-b border-white/10">
        <LayerPanel
          embedded
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onToggleVisible={onToggleVisible}
          onReorder={onReorder}
        />
      </div>

      {/* History section — takes remaining space */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <HistoryPanel
          entries={historyEntries}
          onRestore={onRestoreDocument}
        />
      </div>
    </div>
  )
}
