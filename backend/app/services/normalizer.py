from typing import List, Optional
from datetime import datetime

class EdgeFrameNormalizer:
    """
    Simulates / Implements the normalization of raw field BLE frames
    into Canonical Physical Cells using cell_channel_map.
    """
    @staticmethod
    def normalize_cells_by_channel_map(
        raw_channels: List[float],
        channel_map: List[int],
        plausibility_floor_v: float = 0.5
    ) -> List[float]:
        """
        Picks cells by position according to channel_map (1-based indices).
        Raises ValueError with 'SENSE_FAULT' if any mapped cell is below plausibility floor.
        """
        normalized_cells = []
        for phys_idx, ch_1based in enumerate(channel_map, start=1):
            ch_0based = ch_1based - 1
            if ch_0based >= len(raw_channels):
                raise ValueError(f"SENSE_FAULT: channel {ch_1based} out of range in raw channels (len={len(raw_channels)})")
            
            v = raw_channels[ch_0based]
            if v < plausibility_floor_v:
                raise ValueError(f"SENSE_FAULT: physical cell {phys_idx} (channel {ch_1based}) read {v}V < {plausibility_floor_v}V")
            
            normalized_cells.append(v)
            
        return normalized_cells

    @staticmethod
    def calculate_cell_metrics(voltages_v: List[float]):
        min_v = min(voltages_v)
        max_v = max(voltages_v)
        avg_v = sum(voltages_v) / len(voltages_v)
        imbalance_mv = (max_v - min_v) * 1000.0
        # 1-based index of weakest cell
        weakest_cell_index = voltages_v.index(min_v) + 1
        return {
            "min_v": round(min_v, 3),
            "max_v": round(max_v, 3),
            "avg_v": round(avg_v, 3),
            "imbalance_mv": round(imbalance_mv, 1),
            "weakest_cell_index": weakest_cell_index
        }

