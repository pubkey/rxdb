// Modal.tsx
import React, { forwardRef } from 'react';
import type { ModalProps as AntdModalProps } from 'antd';
import { Modal as AntdModal } from 'antd';
import { IconClose } from './icons/close';
import { triggerTrackingEvent } from './trigger-event';

export interface ModalProps
    extends Omit<AntdModalProps, 'closeIcon' | 'rootClassName'> {
    /** Extra class applied to the modal root for styling hooks */
    className?: string;
    title?: string;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function RxModal(
    {
        centered = true,
        maskClosable = false,
        footer = null,
        styles,
        className,
        // use invisible space as default to ensure h3 is still in full height
        title = '‎',
        children,
        ...rest
    },
    ref
) {
    return (
        <AntdModal
            ref={ref as any}
            centered={centered}
            maskClosable={maskClosable}
            footer={footer}
            // keep AntD's default width; don't set `width`
            rootClassName={['my-modal', className].filter(Boolean).join(' ')}
            styles={{
                content: {
                    borderRadius: 0,
                    backgroundColor: 'var(--bg-color)',
                    color: 'white',
                    fontWeight: 700,
                    padding: 16,
                    paddingTop: 12,
                    width: '90vw',
                    maxWidth: '100%',
                    maxHeight: '90vh'
                },
                header: { margin: 0, padding: '16px 20px', borderBottom: '1px solid #f0f0f0' },
                body: { padding: 0 },
                footer: { padding: 16 },
                ...styles,
            }}
            closeIcon={
                <span
                    className="my-modal__close"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                    }}
                >
                    <IconClose clickable />
                </span>
            }
            {...rest}
        >
            <h3>{title}</h3>
            {children}
        </AntdModal>
    );
});


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
}) {
    const handleClose = () => {
        props.onClose();
    };
    const eventId = props.eventId;
    return <Modal
        className="modal-consulting-page"
        open={props.open}
        width={'auto'}
        onCancel={handleClose}
        footer={null}
    >
        <iframe
            style={{
                width: '100%',
                height: '70vh',
            }}
            src={props.iframeUrl}
            onLoad={eventId ? () => triggerTrackingEvent(eventId + '_loaded', 1, 50) : undefined}
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
