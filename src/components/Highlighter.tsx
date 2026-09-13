'use client';

import { useState, useEffect, useRef } from 'react';
import { Highlighter as HighlightIcon, Eraser } from 'lucide-react';

export default function Highlighter() {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  
  // Store all highlighted ranges if using CSS Custom Highlight API
  const highlightsRef = useRef<Range[]>([]);

  useEffect(() => {
    // Register the CSS custom highlight if supported
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      // @ts-ignore
      const highlight = new Highlight();
      // @ts-ignore
      CSS.highlights.set('exam-highlight', highlight);
    }
    
    // Add global style for the highlight if using the CSS Custom Highlight API
    const style = document.createElement('style');
    style.innerHTML = `
      ::highlight(exam-highlight) {
        background-color: #fef08a; /* yellow-200 */
        color: black;
      }
      .fallback-highlight {
        background-color: #fef08a;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      // Don't hide if clicking on the toolbar itself
      if (e.target instanceof Element && e.target.closest('#highlighter-toolbar')) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
          setShowToolbar(false);
          setCurrentRange(null);
          return;
        }

        // Check if selection is within the exam content (exclude sidebar, etc.)
        const focusNode = selection.focusNode;
        if (focusNode instanceof Element) {
          if (focusNode.closest('button') || focusNode.closest('input') || focusNode.closest('textarea')) {
            setShowToolbar(false);
            return;
          }
        } else if (focusNode?.parentElement) {
          if (focusNode.parentElement.closest('button') || focusNode.parentElement.closest('input') || focusNode.parentElement.closest('textarea')) {
            setShowToolbar(false);
            return;
          }
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setCurrentRange(range);
        setToolbarPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        setShowToolbar(true);
      }, 10);
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowToolbar(false);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const applyHighlight = () => {
    if (!currentRange) return;

    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      // Modern CSS Custom Highlight API
      const newRange = currentRange.cloneRange();
      highlightsRef.current.push(newRange);
      
      // @ts-ignore
      const highlight = new Highlight(...highlightsRef.current);
      // @ts-ignore
      CSS.highlights.set('exam-highlight', highlight);
    } else {
      // Fallback for older browsers (Safari < 17.4)
      try {
        const container = currentRange.commonAncestorContainer;
        const parent = container.nodeType === 3 ? container.parentNode : container;
        if (parent instanceof HTMLElement) {
          const oldEditable = parent.contentEditable;
          parent.contentEditable = 'true';
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(currentRange);
            document.execCommand('backColor', false, '#fef08a');
          }
          parent.contentEditable = oldEditable;
        }
      } catch (e) {
        console.error("Highlight fallback failed:", e);
      }
    }

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setShowToolbar(false);
    setCurrentRange(null);
  };

  const clearHighlights = () => {
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      highlightsRef.current = [];
      // @ts-ignore
      CSS.highlights.delete('exam-highlight');
      // @ts-ignore
      const highlight = new Highlight();
      // @ts-ignore
      CSS.highlights.set('exam-highlight', highlight);
    } else {
      // Fallback clear (a bit tricky to undo execCommand universally without reloading, 
      // but for fallback we can just remove background color from spans)
      document.querySelectorAll('span[style*="background-color: rgb(254, 240, 138)"], span[style*="background-color: #fef08a"]').forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.backgroundColor = 'transparent';
        }
      });
    }
    setShowToolbar(false);
  };

  if (!showToolbar) return null;

  return (
    <div 
      id="highlighter-toolbar"
      className="fixed z-50 flex items-center gap-1 bg-slate-900 text-white px-2 py-1.5 rounded-lg shadow-xl animate-in zoom-in-95 duration-100"
      style={{
        left: `${toolbarPos.x}px`,
        top: `${toolbarPos.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px'
      }}
    >
      {/* Little triangle pointing down */}
      <div className="absolute left-1/2 bottom-0 w-3 h-3 bg-slate-900 rotate-45 transform -translate-x-1/2 translate-y-1/2" />
      
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          applyHighlight();
        }}
        className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-md transition-colors text-sm font-medium"
      >
        <HighlightIcon className="w-4 h-4 text-yellow-300" />
        Highlight
      </button>
      <div className="w-px h-4 bg-slate-700 relative z-10" />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          clearHighlights();
        }}
        className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 rounded-md transition-colors text-sm font-medium text-slate-300 hover:text-white"
        title="Clear all highlights"
      >
        <Eraser className="w-4 h-4" />
        Clear
      </button>
    </div>
  );
}
