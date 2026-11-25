# Analysis rules

- Resolve equal-high/low pivot candidates to the last equal touch within the radius: allow equality on the left and require strict separation on the right after all confirmation candles close. Why: strict comparisons on both sides lost double tops/bottoms, while equality on both sides duplicates labels.