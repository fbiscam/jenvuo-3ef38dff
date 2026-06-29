## Plan: Mobile alignment cleanup for homepage

1. **Header mobile alignment**
   - Convert the mobile header into a stable grid layout so logo and Launch button stay aligned.
   - Reduce mobile padding/button sizing where needed so the top row feels centered and balanced.

2. **Hero section mobile polish**
   - Center hero text and CTA buttons on phones.
   - Make CTA buttons stack or fit cleanly without uneven left/right spacing.
   - Keep desktop 150% zoom unchanged and mobile at normal scale.

3. **Terminal workstation mobile layout**
   - Tighten mobile padding in the terminal card.
   - Center the orb area and reduce orb/card height on small screens.
   - Make feed rows, tags, and dashboard stats wrap cleanly with no “aagay peechay” spacing.

4. **All section spacing consistency**
   - Change repeated `px-6 py-20` sections to responsive mobile spacing like `px-5 sm:px-6 py-14 sm:py-20`.
   - Center or stack section headers that currently use desktop flex alignment on mobile.
   - Fix changelog, coverage, FAQ, comparison, integrations, and footer alignment for phone widths.

5. **Verification**
   - Re-check at mobile width around 390px for horizontal overflow and visual alignment.
   - Confirm desktop keeps the 150% homepage scale.