// dataStructViz.js - BST and priority queue visualization

const NODE_RADIUS = 18;
const LEVEL_HEIGHT = 55;
const MIN_NODE_SPACING = 10;

export class DataStructViz {
    constructor(bstCanvas, queueContainer) {
        this.bstCanvas = bstCanvas;
        this.bstCtx = bstCanvas.getContext('2d');
        this.queueContainer = queueContainer;
    }

    renderBST(tree) {
        const ctx = this.bstCtx;
        const canvas = this.bstCanvas;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!tree) {
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('T vacío', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Title
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Árbol T (Beach Line)', canvas.width / 2, 18);

        // Compute tree layout
        const layout = this._layoutTree(tree, canvas.width / 2, 40, canvas.width / 4);
        this._drawTreeNode(ctx, layout);
    }

    _layoutTree(node, x, y, spread) {
        const result = { node, x, y, children: [] };

        if (node.left) {
            result.children.push(
                this._layoutTree(node.left, x - spread, y + LEVEL_HEIGHT, spread / 2)
            );
        }
        if (node.right) {
            result.children.push(
                this._layoutTree(node.right, x + spread, y + LEVEL_HEIGHT, spread / 2)
            );
        }

        return result;
    }

    _drawTreeNode(ctx, layout) {
        // Draw edges to children first
        for (const child of layout.children) {
            ctx.strokeStyle = '#D1D5DB';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(layout.x, layout.y + NODE_RADIUS);
            ctx.lineTo(child.x, child.y - NODE_RADIUS);
            ctx.stroke();

            this._drawTreeNode(ctx, child);
        }

        const isLeaf = layout.node.type === 'leaf';
        const radius = NODE_RADIUS;

        // Node circle
        if (isLeaf) {
            ctx.fillStyle = '#DBEAFE'; // light blue
            ctx.strokeStyle = '#2563EB';
        } else {
            ctx.fillStyle = '#F3F4F6'; // light gray
            ctx.strokeStyle = '#6B7280';
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(layout.x, layout.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = isLeaf ? '#1E40AF' : '#374151';
        ctx.font = `${isLeaf ? 'bold ' : ''}10px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layout.node.label, layout.x, layout.y);
        ctx.textBaseline = 'alphabetic';
    }

    renderQueue(eventQueue, processedEvents) {
        const container = this.queueContainer;
        container.innerHTML = '';

        // Title
        const title = document.createElement('div');
        title.className = 'queue-title';
        title.textContent = 'Cola Q (Eventos)';
        container.appendChild(title);

        // Processed events (collapsed, show count)
        if (processedEvents && processedEvents.length > 0) {
            const processed = document.createElement('div');
            processed.className = 'queue-processed';
            processed.textContent = `✓ ${processedEvents.length} evento(s) procesado(s)`;
            container.appendChild(processed);
        }

        if (eventQueue.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'queue-empty';
            empty.textContent = 'Cola vacía';
            container.appendChild(empty);
            return;
        }

        // Next event highlight
        const nextLabel = document.createElement('div');
        nextLabel.className = 'queue-next-label';
        nextLabel.textContent = '→ Próximo evento:';
        container.appendChild(nextLabel);

        // Show pending events (max 8)
        const shown = eventQueue.slice(0, 8);
        for (let i = 0; i < shown.length; i++) {
            const ev = shown[i];
            const isCanceled = ev.isFalseAlarm;
            const item = document.createElement('div');
            item.className = `queue-item ${ev.type} ${i === 0 && !isCanceled ? 'next' : ''} ${isCanceled ? 'canceled' : ''}`;

            const badge = document.createElement('span');
            badge.className = `queue-badge ${ev.type} ${isCanceled ? 'canceled' : ''}`;
            badge.textContent = ev.type === 'site' ? '+' : '○';
            item.appendChild(badge);

            const label = document.createElement('span');
            label.className = 'queue-label';
            label.textContent = ev.label;
            item.appendChild(label);

            const yVal = document.createElement('span');
            yVal.className = 'queue-y';
            yVal.textContent = `y=${Math.round(ev.y)}`;
            item.appendChild(yVal);

            container.appendChild(item);
        }

        if (eventQueue.length > 8) {
            const more = document.createElement('div');
            more.className = 'queue-more';
            more.textContent = `...y ${eventQueue.length - 8} más`;
            container.appendChild(more);
        }
    }

    render(state) {
        this.renderBST(state.bstStructure);
        this.renderQueue(state.eventQueue, state.processedEvents);
    }
}
