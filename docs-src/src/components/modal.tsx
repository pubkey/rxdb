import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './icons/close';
import { triggerTrackingEvent } from './trigger-event';

export type ModalProps = {
    open: boolean;
    onCancel?: (event: React.SyntheticEvent) => void;
    title?: string;
    /**
     * Width of the dialog, 'auto' makes it as wide as its content.
     * [default=520]
     */
    width?: number | string;
    style?: React.CSSProperties;
    /** Extra class applied to the dialog for styling hooks */
    className?: string;
    children?: React.ReactNode;
};

/**
 * Modal based on the native <dialog> element.
 * showModal() puts the dialog into the top layer, so it renders above
 * all other content, traps the focus and closes on Escape.
 * It is rendered into document.body so that it does not inherit styles
 * from the component that opens it, for example the markdown styles of a docs page.
 * The content is rendered lazily on the first open and kept mounted afterwards
 * so that iframes keep their state when the modal is reopened.
 */
export function Modal(
    {
        open,
        onCancel,
        // use invisible space as default to ensure h3 is still in full height
        title = '\u200e',
        width = 520,
        style,
        className,
        children
    }: ModalProps
) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const [hasOpened, setHasOpened] = useState(open);

    useEffect(() => {
        if (open) {
            setHasOpened(true);
        }
    }, [open]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }
        if (open && !dialog.open) {
            dialog.showModal();
            // focus the dialog itself instead of its first button, Tab then moves into it
            dialog.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open, hasOpened]);

    if (!hasOpened || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <dialog
            ref={dialogRef}
            className={['my-modal', className].filter(Boolean).join(' ')}
            style={{ width: width === 'auto' ? 'fit-content' : width, ...style }}
            aria-labelledby={titleId}
            tabIndex={-1}
            onCancel={(event) => {
                // Escape key: let the parent update its state, it closes the dialog
                event.preventDefault();
                onCancel?.(event);
            }}
            onClose={(event) => {
                // the browser closed the dialog on its own, sync the parent state
                if (open) {
                    onCancel?.(event);
                }
            }}
        >
            <div className="my-modal__content">
                <button
                    type="button"
                    className="my-modal__close"
                    aria-label="Close"
                    onClick={(event) => onCancel?.(event)}
                >
                    <IconClose clickable />
                </button>
                <h3 id={titleId}>{title}</h3>
                {children}
            </div>
        </dialog>,
        document.body
    );
}


export function IframeFormModal(props: {
    iframeUrl: string;
    onClose: Function;
    open: boolean;
    /**
     * When provided, tracking events are fired on iframe load and error
     * so we can measure how often the embedded form successfully loads.
     * e.g. 'buy_form' fires 'buy_form_loaded' on success and 'buy_form_error' on failure.
     */
    eventId?: string;
    /**
     * When provided, this event is fired once the visitor keeps keyboard
     * focus inside the form iframe for 10 seconds. The form is a
     * cross-origin iframe so we cannot observe typing; sustained focus is
     * the closest measurable signal for "started filling the form" and
     * separates it from an accidental single click.
     */
    focusEventType?: string;
}) {
    const handleClose = () => {
        props.onClose();
    };
    const eventId = props.eventId;
    const focusEventType = props.focusEventType;
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!props.open || !focusEventType) {
            return;
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const cancel = () => {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
        };
        const onWindowBlur = () => {
            // focus moved into the iframe (not to another tab/app)
            if (document.activeElement === iframeRef.current && !document.hidden) {
                cancel();
                timer = setTimeout(() => {
                    triggerTrackingEvent(focusEventType, 1, 1);
                }, 10 * 1000);
            }
        };
        const onVisibilityChange = () => {
            if (document.hidden) {
                cancel();
            }
        };
        window.addEventListener('blur', onWindowBlur);
        window.addEventListener('focus', cancel);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            cancel();
            window.removeEventListener('blur', onWindowBlur);
            window.removeEventListener('focus', cancel);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [props.open, focusEventType]);

    return <Modal
        className="modal-consulting-page"
        open={props.open}
        width={'auto'}
        onCancel={handleClose}
    >
        <iframe
            ref={iframeRef}
            style={{
                width: '100%',
                height: '70vh',
            }}
            src={props.iframeUrl}
            onLoad={eventId ? () => triggerTrackingEvent(eventId + '_loaded', 0, 50) : undefined}
            onError={eventId ? () => triggerTrackingEvent(eventId + '_error', 0, 50) : undefined}
        >
            Your browser doesn't support iframes,{' '}
            <a
                href={props.iframeUrl}
                target="_blank"
                rel="nofollow noreferrer"
            >
                Click here
            </a>
        </iframe>
    </Modal>;
}
