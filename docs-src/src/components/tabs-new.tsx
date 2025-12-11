import React, { useState, useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface SideTabItem {
    key: string;
    label: ReactNode;
    children: ReactNode;
    disabled?: boolean;
}

export interface SideTabsProps {
    items: SideTabItem[];
    activeKey?: string;
    defaultActiveKey?: string;
    onChange?: (activeKey: string) => void;
    className?: string;
    style?: CSSProperties;
    dark?: boolean;
}

export const TabsNew: React.FC<SideTabsProps> = ({
    items,
    activeKey,
    defaultActiveKey,
    onChange,
    className,
    style,
    dark
}) => {

    const listRef = useRef<HTMLDivElement | null>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (!listRef.current) return;
        isDragging.current = true;
        listRef.current.classList.add('is-dragging');

        startX.current = e.pageX - listRef.current.offsetLeft;
        scrollLeft.current = listRef.current.scrollLeft;
    };

    const handleMouseLeaveOrUp = () => {
        if (!listRef.current) return;
        isDragging.current = false;
        listRef.current.classList.remove('is-dragging');
    };

    const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
        if (!isDragging.current || !listRef.current) return;
        e.preventDefault(); // prevent text selection

        const x = e.pageX - listRef.current.offsetLeft;
        const walk = x - startX.current;      // drag amount
        listRef.current.scrollLeft = scrollLeft.current - walk;
    };

    // touch support
    const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
        if (!listRef.current) return;
        isDragging.current = true;
        listRef.current.classList.add('is-dragging');

        startX.current = e.touches[0].pageX - listRef.current.offsetLeft;
        scrollLeft.current = listRef.current.scrollLeft;
    };

    const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
        if (!isDragging.current || !listRef.current) return;
        const x = e.touches[0].pageX - listRef.current.offsetLeft;
        const walk = x - startX.current;
        listRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const handleTouchEnd = () => {
        if (!listRef.current) return;
        isDragging.current = false;
        listRef.current.classList.remove('is-dragging');
    };


    const [innerActiveKey, setInnerActiveKey] = useState<string>(
        defaultActiveKey || items[0]?.key,
    );

    const mergedActiveKey = activeKey ?? innerActiveKey;

    const handleSelect = (key: string, disabled?: boolean) => {
        if (disabled || key === mergedActiveKey) return;

        if (activeKey === undefined) {
            setInnerActiveKey(key);
        }
        onChange?.(key);
    };

    const activeItem = useMemo(
        () => items.find((item) => item.key === mergedActiveKey) ?? items[0],
        [items, mergedActiveKey, items],
    );

    return (
        <div className={`side-tabs flex-direction-default-column ${className ?? ''}`} style={style}>
            <div
                className="side-tabs__list flex-direction-default-row"
                role="tablist"
                ref={listRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeaveOrUp}
                onMouseUp={handleMouseLeaveOrUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {items.map((item) => {
                    const isActive = item.key === mergedActiveKey;
                    const isDisabled = item.disabled;
                    const tabId = `tabs-new-tab-${item.key}`;
                    return (
                        <>
                            <div
                                key={item.key}
                                id={tabId}
                                role="tab"
                                aria-selected={isActive}
                                aria-disabled={isDisabled}
                                tabIndex={isDisabled ? -1 : 0}
                                className={[
                                    'side-tabs__tab',
                                    'gap-20-0',
                                    'display-flex-grid',
                                    dark && 'dark',
                                    isActive && 'side-tabs__tab--active',
                                    isDisabled && 'side-tabs__tab--disabled',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onClick={() => handleSelect(item.key, item.disabled)}
                                onKeyDown={(e) => {
                                    if (isDisabled) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelect(item.key);
                                    }
                                }}
                            >
                                <span className="side-tabs__indicator" />
                                <span className="side-tabs__label">{item.label}</span>
                            </div>
                        </>
                    );
                })}
            </div>
            <div
                className={[
                    'side-tabs__content',
                    dark && 'dark'
                ]
                    .filter(Boolean)
                    .join(' ')}
                role="tabpanel"
                aria-labelledby={
                    activeItem ? `tabs-new-tab-${activeItem.key}` : undefined
                }
            >
                {activeItem?.children}
            </div>
        </div>
    );
};
