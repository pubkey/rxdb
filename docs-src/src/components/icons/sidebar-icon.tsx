import React from 'react';
import { IconStorage } from './storage';
import { IconReplication } from './replication';
import { IconGear } from './gear';
import { IconQuickstart } from './quickstart';

const SIDEBAR_ICON_MAP: Record<string, React.ComponentType> = {
    storage: IconStorage,
    replication: IconReplication,
    gear: IconGear,
    quickstart: IconQuickstart,
};

export function SidebarIcon({ iconName }: { iconName: string; }) {
    const IconComponent = SIDEBAR_ICON_MAP[iconName];
    if (!IconComponent) {
        return null;
    }
    return <span className="sidebar-item-icon" style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
        verticalAlign: 'middle',
        width: 18,
        height: 18,
        flexShrink: 0,
    }}>
        <span style={{
            display: 'inline-flex',
            transform: 'scale(0.72)',
            transformOrigin: 'center center',
        }}>
            <IconComponent />
        </span>
    </span>;
}
