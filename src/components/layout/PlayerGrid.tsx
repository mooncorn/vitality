import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getGridConfig, getGridAreaName, getAutoRotation } from '@/utils/grid';
import { useIsMobile } from '@/hooks/useIsMobile';
import { PlayerCard } from '@/components/player/PlayerCard';

export const PlayerGrid = () => {
  const players = useGameStore(state => state.players);
  const isMobile = useIsMobile();
  const gridConfig = useMemo(() => getGridConfig(players.length), [players.length]);

  const gridStyle = useMemo(() => {
    const style: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
      gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
      height: '100%',
      width: '100%',
      gap: 6,
      padding: 6,
    };

    if (gridConfig.areas) {
      style.gridTemplateAreas = gridConfig.areas;
    }

    return style;
  }, [gridConfig]);

  return (
    <div style={gridStyle}>
      {players.map((player, index) => (
        <div
          key={player.id}
          style={gridConfig.areas ? { gridArea: getGridAreaName(index) } : undefined}
        >
          <PlayerCard
            player={player}
            rotation={isMobile ? getAutoRotation(index, players.length) : 0}
          />
        </div>
      ))}
    </div>
  );
};
