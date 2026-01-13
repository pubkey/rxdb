import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface SideTabItem {
    key: string;
    label: ReactNode;
    children: ReactNode;
    disabled?: boolean;
}

export interface SideTabsProps {
    items?: SideTabItem[]; // <-- now optional
    activeKey?: string;
    defaultActiveKey?: string;
    onChange?: (activeKey: string) => void;
    className?: string;
    style?: CSSProperties;
    dark?: boolean;
    small?: boolean;
    children?: React.ReactNode; // <-- allow markdown children
}

export const Tabs: React.FC<SideTabsProps> = ({
    items,
    activeKey,
    defaultActiveKey,
    onChange,
    className,
    style,
    dark,
    small,
    children
}) => {
    if (typeof dark === 'undefined') {
        dark = true;
    }

    // -------------------------------------------------------------
    // MARKDOWN PARSING (Only runs if items are NOT provided)
    // -------------------------------------------------------------

    let parsedItems: SideTabItem[] | undefined;

    if (!items && children) {
        const tabItems: Array<{
            key: string;
            label: ReactNode;
            content: React.ReactNode[];
        }> = [];

        let currentTab: {
            key: string;
            label: ReactNode;
            content: React.ReactNode[];
        } | null = null;

        const allChildren = React.Children.toArray(children);

        allChildren.forEach(child => {
            const el = child as React.ReactElement;
            const hasId = (el as any)?.props?.id;

            // Headings (## Something) have an id → new tab
            if (hasId) {
                if (currentTab) {
                    tabItems.push(currentTab);
                }
                currentTab = {
                    key: hasId,
                    label: (el as any).props.children,
                    content: [],
                };
            } else if (currentTab) {
                currentTab.content.push(child);
            }
        });

        if (currentTab) tabItems.push(currentTab);

        parsedItems = tabItems.map(t => ({
            key: t.key,
            label: t.label,
            children: <div>{t.content}</div>,
        }));
    }

    // Prefer explicit items prop; otherwise use auto-parsed markdown items:
    const finalItems: SideTabItem[] = items ?? parsedItems ?? [];

    // -------------------------------------------------------------
    // Your existing component logic (unchanged)
    // -------------------------------------------------------------

    const listRef = useRef<HTMLDivElement | null>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isSmall, setIsSmall] = useState<boolean>(false);
    const smallMode = small || isSmall;

    useEffect(() => {
        const smallAt = 800;
        const el = rootRef.current;
        if (!el) return;


        console.log('aaaa ' + el.getBoundingClientRect);

        setIsSmall(el.clientWidth <= smallAt);

        const observer = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width;
            setIsSmall(width <= smallAt);
        });

        observer.observe(el);

        return () => observer.disconnect();
    }, []);

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
        e.preventDefault();
        const x = e.pageX - listRef.current.offsetLeft;
        const walk = x - startX.current;
        listRef.current.scrollLeft = scrollLeft.current - walk;
    };

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
        defaultActiveKey || finalItems[0]?.key,
    );

    const mergedActiveKey = activeKey ?? innerActiveKey;

    const handleSelect = (key: string, disabled?: boolean) => {
        if (disabled || key === mergedActiveKey) return;
        if (activeKey === undefined) setInnerActiveKey(key);
        onChange?.(key);
    };

    const activeItem = useMemo(
        () => finalItems.find((item) => item.key === mergedActiveKey) ?? finalItems[0],
        [finalItems, mergedActiveKey],
    );

    return (
        <div
            ref={rootRef}
            className={[
                'side-tabs',
                className ?? '',
                smallMode && 'small'
            ].filter(Boolean).join(' ')}
            style={style}
        >
            <div
                className="side-tabs__list"
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
                {finalItems.map((item) => {
                    const isActive = item.key === mergedActiveKey;
                    const isDisabled = item.disabled;
                    const tabId = `tabs-new-tab-${item.key}`;
                    return (
                        <div
                            key={item.key}
                            id={tabId}
                            role="tab"
                            aria-selected={isActive}
                            aria-disabled={isDisabled}
                            tabIndex={isDisabled ? -1 : 0}
                            className={[
                                'side-tabs__tab',
                                dark && 'dark',
                                isActive && 'side-tabs__tab--active',
                                isDisabled && 'side-tabs__tab--disabled',
                            ].filter(Boolean).join(' ')}
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
                    );
                })}
            </div>

            <div
                className={[
                    'side-tabs__content',
                    dark && 'dark'
                ].filter(Boolean).join(' ')}
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
