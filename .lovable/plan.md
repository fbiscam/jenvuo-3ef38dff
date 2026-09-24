# Latest Order Block and FVG Lines

## Changes
- Limit chart Order Blocks to the latest three active detections.
- Keep newly detected Order Blocks and FVGs visible immediately through the existing live chart refresh.
- Render only dotted lines: yellow for Order Blocks and green for FVGs, with no text labels.
- Verify the reported utility type error and run the focused chart checks.

## Technical details
- Update the SMC overlay data selection and line renderer only; detection rules remain unchanged.
- Preserve each zone's directional edge placement: upper zones use the upper edge and lower zones use the lower edge.
