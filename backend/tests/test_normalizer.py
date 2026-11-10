import pytest
from app.services.normalizer import EdgeFrameNormalizer

def test_cell_normalization_with_swp10_channel_map():
    # Field log simulation: 16 channels, 10S NMC pack
    # Channels 1..9 have voltages, 10..15 are 0.0V (shorted), channel 16 is top cell (4.005V)
    raw_channels = [
        3.997, 3.998, 3.993, 3.996, 4.003, 4.002, 3.996, 3.998, 4.000, 
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 
        4.005
    ]
    swp10_map = [1, 2, 3, 4, 5, 6, 7, 8, 9, 16]

    # Normalize by positional mapping
    cells = EdgeFrameNormalizer.normalize_cells_by_channel_map(raw_channels, swp10_map)
    assert len(cells) == 10
    assert cells[0] == 3.997
    assert cells[8] == 4.000
    assert cells[9] == 4.005 # Channel 16 correctly mapped to physical cell 10

    metrics = EdgeFrameNormalizer.calculate_cell_metrics(cells)
    assert metrics["min_v"] == 3.993
    assert metrics["max_v"] == 4.005
    assert metrics["imbalance_mv"] == 12.0
    assert metrics["weakest_cell_index"] == 3 # Cell 3 (3.993V) is weakest

def test_cell_normalization_detects_sense_fault():
    # If a mapped cell (e.g. cell 2 on channel 2) drops to 0.0V (broken sense wire / dead cell)
    raw_channels = [
        3.997, 0.0, 3.993, 3.996, 4.003, 4.002, 3.996, 3.998, 4.000, 
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 
        4.005
    ]
    swp10_map = [1, 2, 3, 4, 5, 6, 7, 8, 9, 16]

    with pytest.raises(ValueError, match="SENSE_FAULT"):
        EdgeFrameNormalizer.normalize_cells_by_channel_map(raw_channels, swp10_map)

