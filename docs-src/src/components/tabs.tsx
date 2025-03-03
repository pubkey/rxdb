import React from 'react';
import { Tabs as AntdTabs } from 'antd';

/**
 * @link https://chatgpt.com/c/67bf0330-4d30-8005-91fe-f5d666de859b
 */
export function Tabs(props: { children: React.ReactNode; }) {
    // We'll build an array of { label, key, content } objects for AntdTabs.
    const tabItems: Array<{
        label: React.ReactNode;
        key: string;
        content: React.ReactNode[];
    }> = [];

    let currentTab: {
        label: React.ReactNode;
        key: string;
        content: React.ReactNode[];
    } | null = null;

    const allChildren = React.Children.toArray(props.children);

    allChildren.forEach(child => {
        const childElement = child as React.ReactElement;
        const hasId = childElement?.props?.id;

        // If this child has an id (like an MDX heading), treat it as a new tab header
        if (hasId) {
            // If there's already an open tab, push it to tabItems
            if (currentTab) {
                tabItems.push(currentTab);
            }
            // Create a new tab
            currentTab = {
                // Use the heading text as the label; adjust logic if desired
                label: childElement.props.children,
                key: childElement.props.id,
                content: [],
            };
        } else if (currentTab) {
            // If it's not a heading, accumulate this element into the current tab's content
            currentTab.content.push(child);
        }
    });

    // Push the last tab if it exists
    if (currentTab) {
        tabItems.push(currentTab);
    }

    // Convert our array into Ant Design Tabs items
    const itemsForAntd = tabItems.map(tab => ({
        key: tab.key,
        label: tab.label,
        children: <div style={{ color: 'white' }}>
            {tab.content}
        </div>,
    }));

    return (
        <AntdTabs
            type="line"
            items={itemsForAntd}
            color='red'
        />
    );
}
