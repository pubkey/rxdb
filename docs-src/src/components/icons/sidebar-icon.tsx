import React from 'react';
import { IconStorage } from './storage';
import { IconReplication } from './replication';
import { IconGear } from './gear';
import { IconQuickstart } from './quickstart';
import { IconPremium } from './premium';

const SIDEBAR_ICON_MAP: Record<string, React.ComponentType> = {
    storage: IconStorage,
    replication: IconReplication,
    gear: IconGear,
    quickstart: IconQuickstart,
    premium: IconPremium,
};

export function SidebarIcon({ iconName, position = 'before' }: { iconName: string; position?: 'before' | 'after'; }) {
    const IconComponent = SIDEBAR_ICON_MAP[iconName];
    if (!IconComponent) {
        return null;
    }
    return <span className="sidebar-item-icon" style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: position === 'before' ? 6 : 0,
        marginLeft: position === 'after' ? 6 : 0,
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
