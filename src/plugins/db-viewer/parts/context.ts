import type { DbViewerStore } from '../store.ts';
import type { DbViewerNavigation } from '../../../types/index.d.ts';

/**
 * What every panel needs from the shell it is mounted in.
 */
export type PanelContext = {
    store: DbViewerStore;
    /**
     * Re-renders the whole database viewer from the current state.
     */
    render: () => void;
    navigate: (navigation: DbViewerNavigation) => void;
    /**
     * Shows a modal or sub panel above the content, `null` closes it.
     */
    setOverlay: (node: HTMLElement | null) => void;
    /**
     * Reports a failed action to the user.
     */
    notify: (message: string) => void;
};

export function downloadJson(fileName: string, data: any): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}
