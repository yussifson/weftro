/**
 * Kanban Portal Utility
 *
 * @hello-pangea/dnd computes drag clone positions using `position: fixed`.
 * When a parent element has a CSS `transform` (e.g. framer-motion's AnimatePresence),
 * `position: fixed` is anchored to that transformed parent instead of the viewport,
 * causing the drag ghost to appear frozen / offset.
 *
 * Solution: render the dragging clone at document.body level via a React portal,
 * bypassing all intermediate transforms in the tree.
 *
 * Usage: wrap each <Draggable> render-prop child with <PortalAwareItem>:
 *
 *   <Draggable key={item.id} draggableId={item.id} index={index}>
 *     {(provided, snapshot) => (
 *       <PortalAwareItem provided={provided} snapshot={snapshot}>
 *         <div ... />  ← your card JSX
 *       </PortalAwareItem>
 *     )}
 *   </Draggable>
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

let portalRoot = null;

function getPortalRoot() {
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'kanban-drag-portal');
    portalRoot.style.position = 'absolute';
    portalRoot.style.top = '0';
    portalRoot.style.left = '0';
    portalRoot.style.zIndex = '9999';
    portalRoot.style.pointerEvents = 'none';
    document.body.appendChild(portalRoot);
  }
  return portalRoot;
}

export function PortalAwareItem({ provided, snapshot, children }) {
  const usePortal = snapshot.isDragging;

  const child = (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{ ...provided.draggableProps.style }}
    >
      {children}
    </div>
  );

  if (!usePortal) return child;

  return ReactDOM.createPortal(child, getPortalRoot());
}
